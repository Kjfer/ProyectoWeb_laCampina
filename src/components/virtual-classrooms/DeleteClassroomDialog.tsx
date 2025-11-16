import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VirtualClassroom {
  id: string;
  name: string;
  grade: string;
  education_level: 'primaria' | 'secundaria';
  section: string;
  courses_count?: number;
  students_count?: number;
}

interface DeleteClassroomDialogProps {
  classroom: VirtualClassroom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteClassroomDialog({ 
  classroom, 
  open, 
  onOpenChange, 
  onSuccess 
}: DeleteClassroomDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!classroom) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No estás autenticado');
      }

      const response = await supabase.functions.invoke('delete-virtual-classroom', {
        body: { id: classroom.id }
      });

      if (response.error) throw response.error;
      
      const result = response.data;
      
      if (!result?.success) {
        throw new Error(result?.error || 'Error al eliminar el aula virtual');
      }

      toast.success(result.message || 'Aula virtual procesada exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast.error(`Error al eliminar el aula: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (!classroom) return null;

  const hasStudents = (classroom.students_count || 0) > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasStudents ? '¿Desactivar Aula Virtual?' : '¿Eliminar Aula Virtual?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {hasStudents ? (
              <>
                <p>
                  El aula <span className="font-semibold">{classroom.name}</span> tiene{' '}
                  <span className="font-semibold">{classroom.students_count} estudiantes</span> inscritos.
                </p>
                <p>
                  Por seguridad, el aula será <span className="font-semibold">desactivada</span> en lugar
                  de eliminada para preservar el historial académico.
                </p>
              </>
            ) : (
              <>
                <p>
                  ¿Estás seguro de que deseas eliminar el aula{' '}
                  <span className="font-semibold">{classroom.name}</span>?
                </p>
                <p className="text-destructive">
                  Esta acción no se puede deshacer y eliminará todos los cursos asociados.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting 
              ? 'Procesando...' 
              : hasStudents 
                ? 'Desactivar Aula' 
                : 'Eliminar Aula'
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
