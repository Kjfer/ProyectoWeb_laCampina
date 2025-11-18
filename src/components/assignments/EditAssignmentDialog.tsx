import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: {
    id: string;
    title: string;
    description: string;
    due_date: string;
    max_score: number;
  };
  onEditSuccess: () => void;
}

export const EditAssignmentDialog = ({ 
  open, 
  onOpenChange, 
  assignment,
  onEditSuccess 
}: EditAssignmentDialogProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [maxScore, setMaxScore] = useState(assignment.max_score.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (assignment.due_date) {
      const date = new Date(assignment.due_date);
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);
      setDueDate(dateStr);
      setDueTime(timeStr);
    }
  }, [assignment.due_date]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate || !dueTime) {
      toast({
        title: "Error",
        description: "La fecha y hora de entrega son requeridas",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const dueDateTimeStr = `${dueDate}T${dueTime}:00`;
      
      const { error } = await supabase
        .from('assignments')
        .update({
          title: title.trim(),
          description: description.trim(),
          due_date: dueDateTimeStr,
          max_score: parseFloat(maxScore),
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignment.id);

      if (error) throw error;

      toast({
        title: "Tarea actualizada",
        description: "La tarea ha sido actualizada correctamente",
      });

      onEditSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la tarea",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Tarea</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la tarea
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Título *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la tarea"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Descripción
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la tarea"
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fecha de entrega *
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Hora de entrega *
              </label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Puntos máximos *
            </label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
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
