import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BookOpen, Calendar, Users, GraduationCap, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  semester: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  teacher: {
    first_name: string;
    last_name: string;
  };
  is_enrolled: boolean;
  total_sections: number;
  completed_sections: number;
}

interface ClassroomCoursesListProps {
  classroomId: string;
  classroomName: string;
}

export function ClassroomCoursesList({ classroomId, classroomName }: ClassroomCoursesListProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (classroomId) {
      fetchCourses();
    }
  }, [classroomId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          *,
          profiles!courses_teacher_id_fkey(first_name, last_name)
        `)
        .eq('classroom_id', classroomId)
        .eq('is_active', true)
        .order('code');

      if (error) throw error;

      // Check enrollment status for each course
      const coursesWithEnrollment = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('course_id', course.id)
            .eq('student_id', profile?.id)
            .maybeSingle();

          // Get progress data
          const { data: sectionsData } = await supabase
            .from('course_weekly_sections')
            .select('id')
            .eq('course_id', course.id);

          const { data: progressData } = await supabase
            .from('student_progress')
            .select('id')
            .eq('course_id', course.id)
            .eq('student_id', profile?.id)
            .eq('progress_type', 'section_completed');

          return {
            ...course,
            teacher: course.profiles || { first_name: 'Profesor', last_name: 'Asignado' },
            is_enrolled: !!enrollment,
            total_sections: sectionsData?.length || 0,
            completed_sections: progressData?.length || 0
          };
        })
      );

      setCourses(coursesWithEnrollment);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Error al cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!profile?.id) return;

    setEnrolling(courseId);
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          course_id: courseId,
          student_id: profile.id
        });

      if (error) throw error;

      toast.success('Te has inscrito al curso exitosamente');
      fetchCourses(); // Refresh the list
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast.error('Error al inscribirse al curso');
    } finally {
      setEnrolling(null);
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Cursos Disponibles
        </h2>
        <p className="text-muted-foreground">
          {classroomName} - {courses.length} curso{courses.length !== 1 ? 's' : ''} disponible{courses.length !== 1 ? 's' : ''}
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay cursos disponibles en esta aula virtual.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {courses.map((course) => {
            const progressPercentage = getProgressPercentage(course.completed_sections, course.total_sections);
            
            return (
              <Card key={course.id} className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {course.code}
                        </Badge>
                        <Badge 
                          variant={course.is_enrolled ? "default" : "outline"}
                          className="text-xs"
                        >
                          {course.is_enrolled ? 'Inscrito' : 'Disponible'}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mb-1">{course.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          Prof. {course.teacher?.first_name || 'Sin asignar'} {course.teacher?.last_name || ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {course.semester} {course.academic_year}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(course.start_date)} - {formatDate(course.end_date)}
                    </span>
                    {course.total_sections > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {course.total_sections} semana{course.total_sections !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {course.is_enrolled && course.total_sections > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progreso del curso</span>
                        <span className="font-medium">{progressPercentage}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {course.completed_sections} de {course.total_sections} semanas completadas
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {course.is_enrolled ? (
                      <Button 
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="flex-1"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Acceder al Curso
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleEnroll(course.id)}
                        disabled={enrolling === course.id}
                        className="flex-1"
                      >
                        {enrolling === course.id ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Inscribiendo...
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4 mr-2" />
                            Inscribirse
                          </>
                        )}
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
  );
}