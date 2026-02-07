import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, FileText, CheckCircle, Clock, User, Save } from 'lucide-react';
import { toast } from 'sonner';
import PdfAnnotator from '@/components/assignments/PdfAnnotator';
import { useRef } from 'react';

export default function PortfolioReview() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const annotatorRef = useRef<any>(null);

  const [portfolio, setPortfolio] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  
  // Estados para calificar
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [portfolioId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Cargar datos del portafolio
      const { data: portData, error: portError } = await supabase
        .from('edition_portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single();

      if (portError) throw portError;
      setPortfolio(portData);

      // 2. Cargar entregas con datos de alumnos
      const { data: subsData, error: subsError } = await supabase
        .from('edition_portfolio_submissions')
        .select(`
          *,
          student:profiles (id, first_name, last_name, email)
        `)
        .eq('portfolio_id', portfolioId)
        .order('submitted_at', { ascending: false });

      if (subsError) throw subsError;
      setSubmissions(subsData || []);
    } catch (error: any) {
      toast.error("Error al cargar entregas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubmission = (sub: any) => {
    setSelectedSubmission(sub);
    setScore(sub.grade || "");
    setFeedback(sub.feedback || "");
  };
  const handleSaveGrade = async () => {
    if (!selectedSubmission || !score) {
      toast.error("Selecciona una calificación");
      return;
    }

    try {
      setIsSaving(true);
      
      // 1. Guardar anotaciones del PDF (si las hay)
      if (annotatorRef.current) {
        await annotatorRef.current.savePdfOnly();
      }

      // 2. Actualizar en Base de Datos
      const { error } = await supabase
        .from('edition_portfolio_submissions')
        .update({
          grade: score,
          feedback: feedback,
          status: 'graded', // IMPORTANTE: Esto cambia el estado
          submitted_at: new Date().toISOString()
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast.success("Calificación guardada correctamente");

      // 3. ACTUALIZACIÓN VISUAL INMEDIATA (El truco para que cambie a verde)
      setSubmissions(prev => prev.map(sub => 
        sub.id === selectedSubmission.id 
          ? { ...sub, grade: score, feedback: feedback, status: 'graded' } 
          : sub
      ));

      // También actualizamos el seleccionado para que se vea reflejado ahí mismo
      setSelectedSubmission(prev => ({ ...prev, grade: score, feedback: feedback, status: 'graded' }));

    } catch (error: any) {
      console.error(error);
      toast.error("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Volver
            </Button>
            <div>
              <h1 className="text-xl font-bold">{portfolio?.title}</h1>
              <p className="text-xs text-muted-foreground">Revisión de entregas finales</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Badge variant="outline" className="flex gap-1"><CheckCircle className="h-3 w-3 text-green-500"/> {submissions.filter(s => s.status === 'graded').length} Calificadas</Badge>
            <Badge variant="outline" className="flex gap-1"><Clock className="h-3 w-3 text-yellow-500"/> {submissions.filter(s => s.status === 'submitted').length} Pendientes</Badge>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Lista de Alumnos */}
          <div className="w-80 border-r bg-slate-50 overflow-y-auto p-4 space-y-2">
            <h3 className="font-semibold text-sm mb-4 text-gray-500 uppercase tracking-wider">Estudiantes</h3>
            {submissions.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSelectSubmission(sub)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                  selectedSubmission?.id === sub.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                  : 'bg-white border-gray-200 hover:border-blue-300'
                }`}
              >
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className={selectedSubmission?.id === sub.id ? 'text-blue-600' : ''}>
                    {sub.student.first_name[0]}{sub.student.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left overflow-hidden">
                  <p className="text-sm font-bold truncate">{sub.student.first_name} {sub.student.last_name}</p>
                  <p className={`text-[10px] ${selectedSubmission?.id === sub.id ? 'text-blue-100' : 'text-gray-400'}`}>
                    {sub.status === 'graded' ? '✅ Calificado' : '⏳ Pendiente'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Main Area: PDF Annotator & Grading */}
          <div className="flex-1 flex overflow-hidden">
            {selectedSubmission ? (
              <>
                <div className="flex-1 bg-gray-200 overflow-hidden flex flex-col">
                  {/* El PDF se carga aquí */}
                  {selectedSubmission.file_path ? (
                    <PdfAnnotator 
                      ref={annotatorRef}
                      pdfUrl={selectedSubmission.file_path} // Cambia a file_url si guardas la URL completa
                      fileName={selectedSubmission.file_name || "portafolio.pdf"}
                      submissionId={selectedSubmission.id}
                      storageBucket="student-submissions"
                      storagePath={selectedSubmission.file_path}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Este alumno no ha subido el archivo PDF.
                    </div>
                  )}
                </div>

                {/* Panel de Calificación */}
                <div className="w-80 border-l bg-white p-6 overflow-y-auto flex flex-col gap-6">
                  <div>
                    <Label className="text-lg font-bold">Calificación</Label>
                    <Select value={score} onValueChange={setScore}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Nota" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AD">AD - Excelente</SelectItem>
                        <SelectItem value="A">A - Muy Bueno</SelectItem>
                        <SelectItem value="B">B - Regular</SelectItem>
                        <SelectItem value="C">C - Desaprobado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Label className="font-semibold">Feedback (Comentarios)</Label>
                    <Textarea 
                      className="mt-2 h-40" 
                      placeholder="Escribe comentarios para el alumno..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>

                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold shadow-glow"
                    onClick={handleSaveGrade}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                    Guardar y Enviar
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
                <User className="h-16 w-16 mb-4 opacity-20" />
                <p>Selecciona un estudiante para empezar la revisión</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}