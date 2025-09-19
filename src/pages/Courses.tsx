import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Clock, Plus, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  name: string;
  description: string;
  code: string;
  academic_year: string;
  semester: string;
  teacher: {
    first_name: string;
    last_name: string;
  };
  enrollments?: { count: number }[];
}

const Courses = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, [profile]);

  const fetchCourses = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('courses')
        .select(`
          *,
          teacher:profiles!courses_teacher_id_fkey (
            first_name,
            last_name
          ),
          enrollments:course_enrollments (count)
        `);

      // Filter based on user role
      if (profile.role === 'student') {
        query = query.eq('course_enrollments.student_id', profile.id);
      } else if (profile.role === 'teacher') {
        query = query.eq('teacher_id', profile.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los cursos",
          variant: "destructive",
        });
      } else {
        setCourses(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Mis Cursos</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Mis Cursos</h1>
        {profile?.role === 'teacher' && (
          <Button className="bg-gradient-primary shadow-glow">
            <Plus className="w-4 h-4 mr-2" />
            Crear Curso
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No hay cursos disponibles
            </h3>
            <p className="text-muted-foreground">
              {profile?.role === 'student' 
                ? 'Aún no estás inscrito en ningún curso. Contacta a tu coordinador académico.'
                : 'Aún no has creado ningún curso. ¡Crea tu primer curso!'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="bg-gradient-card shadow-card border-0 hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-foreground mb-1">
                      {course.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {course.code}
                    </Badge>
                  </div>
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {course.description || 'Sin descripción disponible'}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>
                      Prof. {course.teacher.first_name} {course.teacher.last_name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{course.academic_year} - {course.semester}</span>
                  </div>

                  {course.enrollments && course.enrollments[0] && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{course.enrollments[0].count} estudiantes</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-border/50">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => navigate(`/courses/${course.id}`)}
                  >
                    Ver Curso
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Courses;