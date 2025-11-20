import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: {
    id: string;
    title: string;
    description: string;
    start_time: string;
    duration_minutes: number;
    is_published: boolean;
  };
  onEditSuccess: () => void;
}

export const EditExamDialog = ({ 
  open, 
  onOpenChange, 
  exam,
  onEditSuccess 
}: EditExamDialogProps) => {
  const [title, setTitle] = useState(exam.title);
  const [description, setDescription] = useState(exam.description || '');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(exam.duration_minutes.toString());
  const [isPublished, setIsPublished] = useState(exam.is_published);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (exam.start_time) {
      const date = new Date(exam.start_time);
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);
      setStartDate(dateStr);
      setStartTime(timeStr);
    }
    setTitle(exam.title);
    setDescription(exam.description || '');
    setDurationMinutes(exam.duration_minutes.toString());
    setIsPublished(exam.is_published);
  }, [exam]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    if (!startDate || !startTime) {
      toast.error('La fecha y hora de inicio son requeridas');
      return;
    }

    const duration = parseInt(durationMinutes);
    if (isNaN(duration) || duration < 5) {
      toast.error('La duración debe ser al menos 5 minutos');
      return;
    }

    setIsSubmitting(true);

    try {
      const startTimeStr = `${startDate}T${startTime}:00`;
      
      const { error } = await supabase
        .from('exams')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          start_time: startTimeStr,
          duration_minutes: duration,
          is_published: isPublished,
        })
        .eq('id', exam.id);

      if (error) throw error;

      toast.success('Examen actualizado correctamente');
      onEditSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating exam:', error);
      toast.error(error.message || 'No se pudo actualizar el examen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Examen</DialogTitle>
          <DialogDescription>
            Modifica los detalles del examen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del examen"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del examen"
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de inicio *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de inicio *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duración (minutos) *</Label>
            <Input
              id="duration"
              type="number"
              min="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="is_published">Publicar (visible para estudiantes)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-primary shadow-glow"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
