import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock, User, AlertCircle, FileText, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

export function StudentCourses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchCourses();
    }
  }, [profile]);

  const fetchCourses = async () => {
    try {
      setLoading(true);

      // Get enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select(`
          course_id,
          courses (
            id,
            name,
            code,
            schedule,
            profiles!courses_teacher_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('student_id', profile!.id);

      if (enrollError) throw enrollError;

      // Get pending assignments and upcoming exams for each course
      const coursesWithData = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          const course = enrollment.courses;
          if (!course) return null;

          // First, get submitted assignment IDs for this student
          const { data: submissions } = await supabase
            .from('assignment_submissions')
            .select('assignment_id')
            .eq('student_id', profile!.id);

          const submittedIds = submissions?.map(s => s.assignment_id) || [];

          // Count pending assignments (due in future, not submitted)
          let assignmentsQuery = supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .eq('is_published', true)
            .gt('due_date', new Date().toISOString());

          // Only add the not.in filter if there are submitted assignments
          if (submittedIds.length > 0) {
            assignmentsQuery = assignmentsQuery.not('id', 'in', `(${submittedIds.join(',')})`);
          }

          const { count: assignmentsCount } = await assignmentsQuery;

          // Count upcoming exams (start time in future)
          const { count: examsCount } = await supabase
            .from('exams')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .eq('is_published', true)
            .gt('start_time', new Date().toISOString());

          return {
            id: course.id,
            name: course.name,
            code: course.code,
            schedule: course.schedule,
            teacher: course.profiles,
            pending_assignments: assignmentsCount || 0,
            upcoming_exams: examsCount || 0,
          };
        })
      );

      setCourses(coursesWithData.filter(Boolean) as Course[]);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSchedule = (course: Course) => {
    if (!course.schedule || course.schedule.length === 0) {
      return "Horario no definido";
    }

    const daysMap: { [key: string]: string } = {
      'Lunes': 'L',
      'Martes': 'M',
      'Miércoles': 'X',
      'Jueves': 'J',
      'Viernes': 'V',
      'Sábado': 'S',
      'Domingo': 'D'
    };

    const scheduleSummary = course.schedule
      .map(s => `${daysMap[s.day] || s.day.charAt(0)} ${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`)
      .join(', ');

    return scheduleSummary;
  };

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

              {(course.pending_assignments > 0 || course.upcoming_exams > 0) && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
                  {course.pending_assignments > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3 text-accent" />
                      <span className="font-medium text-accent">{course.pending_assignments}</span> tareas pendientes
                    </div>
                  )}
                  {course.upcoming_exams > 0 && (
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
      </CardContent>
    </Card>
  );
}
