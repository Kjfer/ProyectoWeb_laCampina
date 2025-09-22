import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Clock, Plus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  course: {
    name: string;
    code: string;
  };
  submissions?: {
    id: string;
    score: number;
    submitted_at: string;
  }[];
}

const Assignments = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, [profile]);

  const fetchAssignments = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('assignments')
        .select(`
          *,
          course:courses (
            name,
            code
          ),
          submissions:assignment_submissions (
            id,
            score,
            submitted_at
          )
        `)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching assignments:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las tareas",
          variant: "destructive",
        });
      } else {
        setAssignments(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const hasSubmission = assignment.submissions && assignment.submissions.length > 0;

    if (hasSubmission) {
      const submission = assignment.submissions[0];
      return {
        status: 'submitted',
        label: submission.score ? `Calificada: ${submission.score}/${assignment.max_score}` : 'Entregada',
        variant: submission.score ? 'default' as const : 'secondary' as const,
        color: submission.score ? 'text-primary' : 'text-secondary'
      };
    }

    if (isAfter(now, dueDate)) {
      return {
        status: 'overdue',
        label: 'Vencida',
        variant: 'destructive' as const,
        color: 'text-destructive'
      };
    }

    if (isBefore(now, addDays(dueDate, -1))) {
      return {
        status: 'pending',
        label: 'Pendiente',
        variant: 'outline' as const,
        color: 'text-muted-foreground'
      };
    }

    return {
      status: 'due-soon',
      label: 'Próxima a vencer',
      variant: 'destructive' as const,
      color: 'text-destructive'
    };
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Tareas</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Tareas</h1>
          {profile?.role === 'teacher' && (
            <Button className="bg-gradient-primary shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Crear Tarea
            </Button>
          )}
        </div>

        {assignments.length === 0 ? (
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No hay tareas disponibles
              </h3>
              <p className="text-muted-foreground">
                {profile?.role === 'student' 
                  ? 'No tienes tareas pendientes en este momento.'
                  : 'Aún no has creado ninguna tarea para tus cursos.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const status = getAssignmentStatus(assignment);
              
              return (
                <Card key={assignment.id} className="bg-gradient-card shadow-card border-0 hover:shadow-glow transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg font-semibold text-foreground">
                            {assignment.title}
                          </CardTitle>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {assignment.course.code}
                          </Badge>
                          <span>{assignment.course.name}</span>
                        </div>
                      </div>
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {assignment.description || 'Sin descripción disponible'}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(assignment.due_date), "d 'de' MMMM, yyyy", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(new Date(assignment.due_date), "HH:mm")}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm font-medium text-foreground">
                        {assignment.max_score} pts
                      </div>
                    </div>

                    {status.status === 'due-soon' && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-destructive font-medium">
                          ¡Esta tarea vence pronto!
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "Próximamente",
                            description: "La vista detallada de la tarea estará disponible pronto.",
                          });
                        }}
                      >
                        Ver Detalles
                      </Button>
                      
                      {profile?.role === 'student' && status.status !== 'submitted' && (
                        <Button 
                          className="bg-gradient-primary shadow-glow"
                          onClick={() => {
                            toast({
                              title: "Próximamente",
                              description: "La entrega de tareas estará disponible pronto.",
                            });
                          }}
                        >
                          Entregar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Assignments;