import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock, User, AlertCircle, FileText, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Course {
  id: string;
  name: string;
  code: string;
  schedule?: Array<{
    day: string;
    start_time: string;
    end_time: string;
  }>;
  teacher?: {
    first_name: string;
    last_name: string;
  };
  pending_assignments?: number;
  upcoming_exams?: number;
}

const ITEMS_PER_PAGE = 6;

export function StudentCourses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);

  useEffect(() => {
    if (profile?.id) {
      fetchCourses();
    }
  }, [profile, currentPage]);

  const fetchCourses = async () => {
    try {
      setLoading(true);

      // Get total count first - usando matriculas con student_code
      const { count: totalCount, error: countError } = await supabase
        .from('matriculas')
        .select('*', { count: 'exact', head: true })
        .eq('student_code', profile!.student_code);

      setTotalCourses(totalCount || 0);

      if (!totalCount || totalCount === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Get paginated enrolled modules via matriculas
      const { data: enrollments, error: enrollError } = await supabase
        .from('matriculas')
        .select('modulo_id, fecha_matricula')
        .eq('student_code', profile!.student_code)
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)
        .order('fecha_matricula', { ascending: false });

      if (enrollError) throw enrollError;

      if (!enrollments || enrollments.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Get modulo IDs
      const moduloIds = enrollments.map(e => e.modulo_id);

      // Fetch module details
      const { data: modulosData, error: modulosError } = await supabase
        .from('modulos')
        .select(`
          id,
          nombre,
          codigo,
          horario_semanal,
          teacher_principal_id,
          course:courses (
            id,
            name
          )
        `)
        .in('id', moduloIds);

      if (modulosError) throw modulosError;

      // Fetch teachers separately
      const teacherIds = modulosData?.map(m => m.teacher_principal_id).filter(Boolean) || [];
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', teacherIds);

      const teachersMap = new Map(teachers?.map(t => [t.id, t]) || []);

      // Single query for submitted assignments
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id')
        .eq('student_id', profile!.id);

      const submittedIds = new Set(submissions?.map(s => s.assignment_id) || []);

      // Single query for all pending assignments across all modules
      const { data: allAssignments } = await supabase
        .from('assignments')
        .select('id, modulo_id')
        .in('modulo_id', moduloIds)
        .eq('is_published', true)
        .gt('due_date', new Date().toISOString());

      // Single query for all upcoming exams across all modules
      const { data: allExams } = await supabase
        .from('exams')
        .select('id, modulo_id')
        .in('modulo_id', moduloIds)
        .eq('is_published', true)
        .gt('start_time', new Date().toISOString());

      // Group by modulo_id
      const assignmentsByModulo = new Map<string, number>();
      const examsByModulo = new Map<string, number>();

      allAssignments?.forEach(assignment => {
        if (!submittedIds.has(assignment.id)) {
          const current = assignmentsByModulo.get(assignment.modulo_id) || 0;
          assignmentsByModulo.set(assignment.modulo_id, current + 1);
        }
      });

      allExams?.forEach(exam => {
        const current = examsByModulo.get(exam.modulo_id) || 0;
        examsByModulo.set(exam.modulo_id, current + 1);
      });

      // Map to courses from modulos
      const coursesWithData = modulosData?.map((modulo: any) => {
        return {
          id: modulo.id,
          name: modulo.nombre,
          code: modulo.codigo,
          schedule: modulo.horario_semanal ? Object.keys(modulo.horario_semanal).map(day => ({
            day,
            start_time: modulo.horario_semanal[day]?.inicio || '',
            end_time: modulo.horario_semanal[day]?.fin || ''
          })) : [],
          teacher: teachersMap.get(modulo.teacher_principal_id),
          pending_assignments: assignmentsByModulo.get(modulo.id) || 0,
          upcoming_exams: examsByModulo.get(modulo.id) || 0,
        };
      }) || [];

      setCourses(coursesWithData as Course[]);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCourses / ITEMS_PER_PAGE);

  // --- AQUÍ ESTÁ LA CORRECCIÓN CLAVE ---
  // Esta función ahora es segura y no crashea si el horario está vacío o mal formado
  const formatSchedule = (course: Course) => {
    // 1. Validaciones básicas de seguridad
    if (!course.schedule || !Array.isArray(course.schedule) || course.schedule.length === 0) {
      return "Horario no definido";
    }

    try {
      const daysMap: { [key: string]: string } = {
        'Lunes': 'Lun', 'Monday': 'Lun',
        'Martes': 'Mar', 'Tuesday': 'Mar',
        'Miércoles': 'Mié', 'Wednesday': 'Mié',
        'Jueves': 'Jue', 'Thursday': 'Jue',
        'Viernes': 'Vie', 'Friday': 'Vie',
        'Sábado': 'Sáb', 'Saturday': 'Sáb',
        'Domingo': 'Dom', 'Sunday': 'Dom'
      };

      const scheduleSummary = course.schedule
        .map((s: any) => {
           // Si el elemento es nulo, lo saltamos
           if (!s) return null;

           // Obtenemos el día de forma segura
           const dayRaw = s.day || '';
           
           // Si es string válido, intentamos mapearlo o cortar las primeras 3 letras
           // Si no es string (ej. undefined), ponemos '?'
           const dayLabel = daysMap[dayRaw] || (typeof dayRaw === 'string' ? dayRaw.substring(0, 3) : '?');
           
           // Obtenemos las horas de forma segura
           const start = s.start_time ? s.start_time.slice(0, 5) : '--:--';
           const end = s.end_time ? s.end_time.slice(0, 5) : '--:--';

           return `${dayLabel} ${start}-${end}`;
        })
        .filter(Boolean) // Eliminamos los nulos que hayan podido salir
        .join(', ');

      return scheduleSummary || "Horario sin detalle";

    } catch (error) {
      console.error("Error al formatear horario:", error);
      return "Error en horario";
    }
  };
  // -------------------------------------

  if (loading) {
    return (
      <Card className="bg-gradient-card shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Mis Cursos Activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="bg-gradient-card shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Mis Cursos Activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No estás inscrito en ningún curso</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Mis Cursos Activos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-4 rounded-lg bg-background/60 border border-border/50 hover:shadow-card transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">{course.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {course.code}
                    </Badge>
                  </div>
                  
                  {course.teacher && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <User className="w-3 h-3" />
                      Prof. {course.teacher.first_name} {course.teacher.last_name}
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatSchedule(course)}
                  </div>
                </div>

                <Link to={`/courses/${course.id}`}>
                  <Button size="sm" variant="outline">
                    Ver Curso
                  </Button>
                </Link>
              </div>

              {(course.pending_assignments! > 0 || course.upcoming_exams! > 0) && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
                  {course.pending_assignments! > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3 text-accent" />
                      <span className="font-medium text-accent">{course.pending_assignments}</span> tareas pendientes
                    </div>
                  )}
                  {course.upcoming_exams! > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ClipboardList className="w-3 h-3 text-accent" />
                      <span className="font-medium text-accent">{course.upcoming_exams}</span> exámenes próximos
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages} ({totalCourses} cursos total)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
