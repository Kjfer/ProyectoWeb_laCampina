// src/components/assignments/PdfAnnotator.tsx
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// PDF.js (legacy para Vite)
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

// PDF-lib (para guardar PDF final sin descargar/subir manual)
import { PDFDocument } from "pdf-lib";

type Props = {
  pdfUrl: string; // signed url / public url
  fileName: string;
  mimeType?: string | null;
  submissionId: string;

  storageBucket?: string; // default: "student-submissions"
  storagePath?: string | null; // ruta dentro del bucket del PDF original (recomendado)

  onSaved?: () => void;
  onClose?: () => void;
};

function safeKeyName(input: string) {
  // 1) quita tildes/diacríticos (SIMULACIÓN -> SIMULACION)
  // 2) reemplaza espacios por _
  // 3) deja solo [a-zA-Z0-9._-]
  const noDiacritics = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return noDiacritics
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function fetchAsPdfBytes(pdfUrl: string) {
  const res = await fetch(pdfUrl, { mode: "cors" });
  if (!res.ok) throw new Error(`fetch pdfUrl failed: ${res.status}`);

  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // Si te está devolviendo HTML (por URL expirada o error), PDF.js revienta con InvalidPDFException
  if (ct.includes("text/html")) {
    const preview = (await res.text()).slice(0, 120);
    throw new Error(
      `La URL no devolvió PDF (parece HTML). Ejemplo: ${preview}`
    );
  }

  // a veces viene octet-stream y es PDF igual, no lo bloqueamos duro
  const buf = await res.arrayBuffer();
  return buf;
}

export default function PdfAnnotator({
  pdfUrl,
  fileName,
  submissionId,
  storageBucket = "student-submissions",
  storagePath = null,
  onSaved,
  onClose,
}: Props) {
  // canvas base: página renderizada (no se dibuja encima)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // canvas overlay: anotaciones (sí se dibuja)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDocJs, setPdfDocJs] = useState<any>(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageNum, setPageNum] = useState(1);

  // herramientas
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#ff0000");
  const [size, setSize] = useState(3);

  // dibujo
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // ✅ overlays por página (dataURL PNG transparente)
  const [pageOverlays, setPageOverlays] = useState<Record<number, string>>({});

  // escala fija (para que overlay y base calcen)
  const SCALE = 1.35;

  // worker
  useEffect(() => {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;
  }, []);

  // ===== CARGA DEL PDF =====
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        // 1) intenta por URL
        try {
          const buf = await fetchAsPdfBytes(pdfUrl);
          if (cancelled) return;
          setPdfBytes(buf);
          return;
        } catch (e) {
          // 2) fallback: storage.download (más estable si tienes storagePath)
          if (!storagePath) throw e;

          const { data, error } = await supabase.storage
            .from(storageBucket)
            .download(storagePath);

          if (error) throw error;

          const buf = await data.arrayBuffer();
          if (cancelled) return;
          setPdfBytes(buf);
        }
      } catch (err) {
        console.error("PDF load error:", err);
        toast.error("No se pudo cargar el PDF para anotar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, storageBucket, storagePath]);

  // ===== INIT PDF.JS =====
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!pdfBytes) return;
      try {
        const task = (pdfjsLib as any).getDocument({ data: pdfBytes });
        const doc = await task.promise;
        if (cancelled) return;
        setPdfDocJs(doc);
        setPageCount(doc.numPages);
        setPageNum(1);
      } catch (err) {
        console.error("PDF init error:", err);
        toast.error("No se pudo inicializar el visor del PDF");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  // ===== RENDER PÁGINA =====
  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!pdfDocJs || !baseCanvasRef.current || !overlayCanvasRef.current)
        return;

      try {
        const page = await pdfDocJs.getPage(pageNum);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: SCALE });

        const base = baseCanvasRef.current;
        base.width = Math.floor(viewport.width);
        base.height = Math.floor(viewport.height);

        const overlay = overlayCanvasRef.current;
        overlay.width = base.width;
        overlay.height = base.height;

        // render base
        const bctx = base.getContext("2d")!;
        await page.render({ canvasContext: bctx, viewport }).promise;

        // restore overlay (si existe)
        const octx = overlay.getContext("2d")!;
        octx.clearRect(0, 0, overlay.width, overlay.height);

        const saved = pageOverlays[pageNum];
        if (saved) {
          const img = new Image();
          img.onload = () => {
            octx.drawImage(img, 0, 0);
          };
          img.src = saved;
        }
      } catch (err) {
        console.error("Render page error:", err);
        toast.error("No se pudo renderizar la página");
      }
    }

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDocJs, pageNum, pageOverlays]);

  // ===== helpers dibujo =====
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const saveOverlayOfCurrentPage = () => {
    if (!overlayCanvasRef.current) return;
    const dataUrl = overlayCanvasRef.current.toDataURL("image/png"); // transparente
    setPageOverlays((prev) => ({ ...prev, [pageNum]: dataUrl }));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    last.current = getPos(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !overlayCanvasRef.current) return;

    const ctx = overlayCanvasRef.current.getContext("2d")!;
    const p = getPos(e);
    const prev = last.current;
    if (!prev) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    last.current = p;
  };

  const onPointerUp = () => {
    drawing.current = false;
    last.current = null;
    // ✅ cada vez que termina un trazo, guardamos overlay de esa página
    saveOverlayOfCurrentPage();
  };

  const clearOverlay = () => {
    if (!overlayCanvasRef.current) return;
    const ctx = overlayCanvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    setPageOverlays((prev) => {
      const copy = { ...prev };
      delete copy[pageNum];
      return copy;
    });
  };

  const goPrev = () => {
    // guardo antes de mover
    saveOverlayOfCurrentPage();
    setPageNum((p) => Math.max(1, p - 1));
  };

  const goNext = () => {
    saveOverlayOfCurrentPage();
    setPageNum((p) => Math.min(pageCount, p + 1));
  };

  // ===== GUARDAR PDF COMPLETO (todas las páginas) =====
  const savePdfComplete = async () => {
    try {
      toast.loading("Generando PDF con anotaciones...", { id: "savepdf" });

      // 1) Descargar PDF original
      let originalArrayBuffer: ArrayBuffer;

      if (storagePath) {
        const { data, error } = await supabase.storage
          .from(storageBucket)
          .download(storagePath);

        if (error) throw error;
        originalArrayBuffer = await data.arrayBuffer();
      } else {
        const res = await fetch(pdfUrl, { mode: "cors" });
        if (!res.ok) throw new Error(`fetch original pdf failed: ${res.status}`);
        originalArrayBuffer = await res.arrayBuffer();
      }

      // 2) Abrir PDF con pdf-lib
      const out = await PDFDocument.load(originalArrayBuffer);

      // 3) Incrustar overlays por página
      const pages = out.getPages();

      for (const [pStr, overlayDataUrl] of Object.entries(pageOverlays)) {
        const pNum = Number(pStr);
        if (!pNum || pNum < 1 || pNum > pages.length) continue;
        if (!overlayDataUrl) continue;

        const pngBytes = await fetch(overlayDataUrl).then((r) => r.arrayBuffer());
        const png = await out.embedPng(pngBytes);

        const page = pages[pNum - 1];
        const { width, height } = page.getSize();

        page.drawImage(png, {
          x: 0,
          y: 0,
          width,
          height,
          opacity: 1,
        });
      }

      // 4) Guardar bytes del PDF final
      const outBytes = await out.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });

      // 5) Generar nombre seguro y ruta
      const safeOriginal = safeKeyName(fileName || "archivo.pdf");
      const teacherFileName = `annotated_${Date.now()}_${safeOriginal}`;
      const teacherPath = `feedback/${teacherFileName}`;

      console.log("🔍 DEBUG INFO:");
      console.log("  - Bucket:", storageBucket);
      console.log("  - Path:", teacherPath);
      console.log("  - File size:", blob.size, "bytes");

      // 🆕 NUEVA PRUEBA: Intentar listar archivos primero
      console.log("📋 Probando listar archivos del bucket...");
      const { data: listData, error: listError } = await supabase.storage
        .from(storageBucket)
        .list('', { limit: 1 });
      
      console.log("  - List result:", listData);
      console.log("  - List error:", listError);

      // 🆕 NUEVA PRUEBA: Verificar sesión y token
      const { data: session } = await supabase.auth.getSession();
      console.log("  - Session exists:", !!session.session);
      console.log("  - Access token (primeros 50 chars):", session.session?.access_token?.substring(0, 50));

      // 🧪 PRUEBA: Subir archivo pequeño primero
      console.log("🧪 Prueba: subiendo archivo de prueba pequeño...");
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testPath = `feedback/test_${Date.now()}.txt`;

      const { data: testData, error: testError } = await supabase.storage
        .from(storageBucket)
        .upload(testPath, testBlob, {
          contentType: 'text/plain',
          upsert: true,
        });

      console.log("  - Test upload data:", testData);
      console.log("  - Test upload error:", testError);

      if (testError) {
        console.error("❌ Incluso el archivo de prueba falló:", testError);
      } else {
        console.log("✅ Archivo de prueba subido exitosamente!");
      }
      
      // 6) Subir a Storage
      console.log("📤 Intentando subir...");
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(teacherPath, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      console.log("📥 Respuesta de upload:");
      console.log("  - Data:", uploadData);
      console.log("  - Error:", uploadError);

      if (uploadError) {
        console.error("❌ Upload error completo:", JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }

      // 7) Guardar en BD
      const { data: subRow, error: subErr } = await supabase
        .from("assignment_submissions")
        .select("feedback_files")
        .eq("id", submissionId)
        .single();

      if (subErr) throw subErr;

      const prev = Array.isArray((subRow as any)?.feedback_files)
        ? (subRow as any).feedback_files
        : [];

      const next = [
        ...prev,
        {
          bucket: storageBucket,
          path: teacherPath,
          fileName: teacherFileName,
          mimeType: "application/pdf",
          createdAt: new Date().toISOString(),
        },
      ];

      const { error: updErr } = await supabase
        .from("assignment_submissions")
        .update({ feedback_files: next })
        .eq("id", submissionId);

      if (updErr) throw updErr;

      toast.success("PDF corregido guardado ✅", { id: "savepdf" });
      
      if (onSaved) onSaved();
      
    } catch (err: any) {
      console.error("💥 Save PDF error:", err);
      toast.error(`No se pudo guardar: ${err?.message || err}`, { id: "savepdf" });
    }
  };
  
  

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Cargando PDF…</div>;
  }

  if (!pdfDocJs) {
    return <div className="py-10 text-center text-muted-foreground">No se pudo abrir el PDF.</div>;
  }

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border rounded mb-3 bg-background">
        <Button variant={tool === "pen" ? "default" : "outline"} onClick={() => setTool("pen")}>
          Lápiz
        </Button>
        <Button variant={tool === "eraser" ? "default" : "outline"} onClick={() => setTool("eraser")}>
          Borrador
        </Button>

        <div className="flex items-center gap-2 ml-2">
          <span className="text-sm">Grosor</span>
          <input
            type="range"
            min={1}
            max={16}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <span className="text-sm">{size}px</span>
        </div>

        <div className="flex items-center gap-2 ml-2">
          <span className="text-sm">Color</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" onClick={goPrev}>
            ← Página
          </Button>
          <span className="text-sm font-medium">
            {pageNum}/{pageCount}
          </span>
          <Button variant="outline" onClick={goNext}>
            Página →
          </Button>
        </div>

        <Button className="bg-gradient-primary" onClick={savePdfComplete}>
          Guardar (PDF completo)
        </Button>

        <Button variant="outline" onClick={clearOverlay}>
          Limpiar
        </Button>

        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        )}
      </div>

      {/* Viewer */}
      <div className="relative w-full overflow-auto border rounded bg-muted/10">
        <canvas ref={baseCanvasRef} className="block mx-auto" />
        <canvas
          ref={overlayCanvasRef}
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Flujo: el profe anota → “Guardar (PDF completo)” → se sube al Storage y queda asociado a la entrega para que el alumno lo vea luego.
      </p>
    </div>
  );
}
