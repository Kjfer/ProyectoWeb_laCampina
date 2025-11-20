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
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VirtualClassroom {
  id: string;
  name: string;
  grade: string;
  education_level: 'primaria' | 'secundaria';
  section: string;
  is_active: boolean;
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
  const [forceDelete, setForceDelete] = useState(false);

  const handleDelete = async () => {
    if (!classroom) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No estás autenticado');
      }

      const response = await supabase.functions.invoke('delete-virtual-classroom', {
        body: { 
          id: classroom.id,
          force: forceDelete
        }
      });

      if (response.error) throw response.error;
      
      const result = response.data;
      
      if (!result?.success) {
        throw new Error(result?.error || 'Error al eliminar el aula virtual');
      }

      toast.success(result.message || 'Aula virtual procesada exitosamente');
      onSuccess();
      onOpenChange(false);
      setForceDelete(false);
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast.error(`Error al eliminar el aula: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (!classroom) return null;

  const hasStudents = (classroom.students_count || 0) > 0;
  const isInactive = !classroom.is_active;

  // Si el aula está inactiva y tiene estudiantes, permitir eliminar con confirmación forzada
  const canForceDelete = isInactive && hasStudents;

  return (
    <AlertDialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) setForceDelete(false);
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {!forceDelete && hasStudents && !isInactive 
              ? '¿Desactivar Aula Virtual?' 
              : '¿Eliminar Aula Virtual?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {!forceDelete ? (
              <>
                {hasStudents && !isInactive ? (
                  <>
                    <p>
                      El aula <span className="font-semibold">{classroom.name}</span> tiene{' '}
                      <span className="font-semibold">{classroom.students_count} estudiantes</span> inscritos.
                    </p>
                    <p>
                      Por seguridad, el aula será <span className="font-semibold">desactivada</span> en lugar
                      de eliminada para preservar el historial académico.
                    </p>
                    {canForceDelete && (
                      <p className="text-muted-foreground text-sm mt-2">
                        Después de desactivarla, podrás eliminarla permanentemente si lo deseas.
                      </p>
                    )}
                  </>
                ) : isInactive && hasStudents ? (
                  <>
                    <p>
                      El aula <span className="font-semibold">{classroom.name}</span> está{' '}
                      <span className="font-semibold">desactivada</span> y tiene{' '}
                      <span className="font-semibold">{classroom.students_count} estudiantes</span> inscritos.
                    </p>
                    <p>
                      ¿Deseas eliminarla permanentemente? Esta acción eliminará todos los datos asociados
                      incluyendo cursos, entregas y calificaciones.
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
              </>
            ) : (
              <>
                <p className="text-destructive font-semibold">
                  ⚠️ ADVERTENCIA: Eliminación permanente
                </p>
                <p>
                  Estás a punto de eliminar permanentemente el aula{' '}
                  <span className="font-semibold">{classroom.name}</span> con{' '}
                  <span className="font-semibold">{classroom.students_count} estudiantes</span>.
                </p>
                <p className="text-destructive">
                  Se eliminarán TODOS los datos: cursos, entregas de tareas, calificaciones
                  y todo el historial académico. Esta acción NO se puede deshacer.
                </p>
                <p className="font-semibold mt-2">
                  ¿Estás completamente seguro?
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={deleting} onClick={() => setForceDelete(false)}>
            Cancelar
          </AlertDialogCancel>
          
          {canForceDelete && !forceDelete && (
            <Button
              onClick={() => setForceDelete(true)}
              disabled={deleting}
              variant="destructive"
              className="sm:order-1"
            >
              Eliminar Permanentemente
            </Button>
          )}
          
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting 
              ? 'Procesando...' 
              : forceDelete
                ? 'SÍ, ELIMINAR TODO'
                : hasStudents && !isInactive
                  ? 'Desactivar Aula' 
                  : 'Eliminar Aula'
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
