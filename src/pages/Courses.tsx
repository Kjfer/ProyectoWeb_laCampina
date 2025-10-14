import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Clock, Plus, ArrowRight, GraduationCap, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  name: string;
  description: string;
  code: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  created_at: string;
  teacher: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  classroom?: {
    id: string;
    name: string;
    grade: string;
    education_level: string;
  };
  enrollments?: { count: number }[];
  enrolled_at?: string; // For students
  enrollment_status?: string; // For students
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
      setLoading(true);
      
      // Use Edge Function to get courses based on user role
      const { data, error } = await supabase.functions.invoke('get-student-courses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('Error calling get-student-courses function:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los cursos",
          variant: "destructive",
        });
        return;
      }

      if (!data?.success) {
        console.error('Error in function response:', data?.error);
        toast({
          title: "Error",
          description: data?.error || "Error al obtener los cursos",
          variant: "destructive",
        });
        return;
      }

      console.log(`✅ Cursos cargados para ${data.user_role}:`, data.count);
      setCourses(data.data || []);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error interno al cargar los cursos",
        variant: "destructive",
      });
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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Mis Cursos</h1>
          {profile?.role === 'teacher' && (
          <Button 
            className="bg-gradient-primary shadow-glow"
            onClick={() => navigate('/admin/courses')}
          >
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
                  {/* Aula Virtual info for students */}
                  {profile?.role === 'student' && course.classroom && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GraduationCap className="w-4 h-4" />
                      <span>{course.classroom.name} - {course.classroom.grade}</span>
                    </div>
                  )}
                  
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

                  {/* Enrollment date for students */}
                  {profile?.role === 'student' && course.enrolled_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Inscrito: {new Date(course.enrolled_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Student count for teachers and admins */}
                  {profile?.role !== 'student' && course.enrollments && course.enrollments[0] && (
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
    </DashboardLayout>
  );
};

export default Courses;