import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Upload, FileCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  portfolioId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PortfolioSubmissionDialog = ({ portfolioId, isOpen, onClose, onSuccess }: Props) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const handleUpload = async () => {
    if (!file || !profile) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
      const filePath = `submissions/${portfolioId}/${fileName}`;

      // 1. Subir al storage (Asegúrate que el bucket sea público en Supabase)
      const { error: uploadError } = await supabase.storage
        .from('student-submissions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Registrar o Actualizar con upsert
      const { error: dbError } = await supabase
        .from('edition_portfolio_submissions')
        .upsert({
          portfolio_id: portfolioId,
          student_id: profile.id,
          file_path: filePath,
          file_name: file.name,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        }, { 
          onConflict: 'portfolio_id,student_id' 
        });

      if (dbError) throw dbError;

      toast.success('¡Portafolio entregado con éxito!');
      
      // 3. LLAMADA AL PADRE: Quita el 'await' si te da advertencia, 
      // pero asegúrate de que el padre recargue la data.
      onSuccess(); 
      onClose(); 

    } catch (error: any) {
      console.error("Error completo:", error);
      toast.error('Error al entregar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir Portafolio Final</DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <Label className="text-center block mb-4">Selecciona tu archivo PDF final</Label>
          <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-orange-400'}`}>
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              id="student-file"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="student-file" className="cursor-pointer flex flex-col items-center gap-2">
              {file ? (
                <>
                  <FileCheck className="h-10 w-10 text-green-600" />
                  <span className="font-medium text-green-700">{file.name}</span>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400" />
                  <span className="text-gray-500">Haz clic para buscar tu PDF</span>
                </>
              )}
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={!file || loading} className="bg-orange-500 hover:bg-orange-600">
            {loading && <Loader2 className="animate-spin mr-2" />} Entregar Trabajo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};