import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ClipboardList, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Exam {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  duration_minutes: number;
  max_score: number;
  is_published: boolean;
}

interface ExamsListProps {
  courseId: string;
  canEdit: boolean;
}

export function ExamsList({ courseId, canEdit }: ExamsListProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, [courseId]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('course_id', courseId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Filter to show only published exams for students
      const filteredExams = canEdit 
        ? (data || [])
        : (data || []).filter(exam => exam.is_published);

      setExams(filteredExams);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Error al cargar los exámenes');
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const examDate = new Date(exam.start_time);
    const examEndTime = new Date(examDate.getTime() + exam.duration_minutes * 60000);

    if (isAfter(now, examEndTime)) {
      return {
        status: 'completed',
        label: 'Finalizado',
        variant: 'secondary' as const,
        color: 'text-muted-foreground'
      };
    }

    if (isBefore(now, examDate) && isAfter(now, addDays(examDate, -1))) {
      return {
        status: 'upcoming',
        label: 'Próximo',
        variant: 'destructive' as const,
        color: 'text-destructive'
      };
    }

    if (isBefore(now, examDate)) {
      return {
        status: 'scheduled',
        label: 'Programado',
        variant: 'outline' as const,
        color: 'text-muted-foreground'
      };
    }

    return {
      status: 'in-progress',
      label: 'En Progreso',
      variant: 'default' as const,
      color: 'text-primary'
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-8 text-center">
          <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No hay exámenes programados
          </h3>
          <p className="text-muted-foreground">
            {canEdit 
              ? 'Haz clic en "Crear Examen" para agregar un nuevo examen.'
              : 'El profesor aún no ha programado exámenes para este curso.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {exams.map((exam) => {
        const status = getExamStatus(exam);
        
        return (
          <Card key={exam.id} className="bg-gradient-card shadow-card border-0 hover:shadow-glow transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {exam.title}
                    </h3>
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                    {!exam.is_published && canEdit && (
                      <Badge variant="secondary" className="text-xs">
                        Borrador
                      </Badge>
                    )}
                  </div>
                  {exam.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {exam.description}
                    </p>
                  )}
                </div>
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(exam.start_time), "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {format(new Date(exam.start_time), "HH:mm")} ({exam.duration_minutes} min)
                  </span>
                </div>
                <div className="text-sm font-medium text-foreground">
                  Puntuación: {exam.max_score} pts
                </div>
              </div>

              {status.status === 'upcoming' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mt-4">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">
                    ¡Este examen será pronto!
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
