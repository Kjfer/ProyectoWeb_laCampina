import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  FileText, 
  Video, 
  Link as LinkIcon,
  MessageCircle,
  Plus,
  CheckCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';
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
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  position: number;
  is_published: boolean;
  resources: CourseResource[];
}

interface CourseResource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  resource_url: string;
  position: number;
  is_published: boolean;
}

interface ForumTopic {
  id: string;
  title: string;
  description: string;
  is_pinned: boolean;
  created_by: {
    first_name: string;
    last_name: string;
  };
  created_at: string;
  post_count: number;
}

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [forumTopics, setForumTopics] = useState<ForumTopic[]>([]);
  const [studentProgress, setStudentProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, profile]);

  const fetchCourseData = async () => {
    if (!courseId || !profile) return;

    try {
      // Fetch course info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          teacher:profiles!courses_teacher_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('position');

      if (modulesError) throw modulesError;

      // Fetch resources for each module
      const modulesWithResources = await Promise.all(
        (modulesData || []).map(async (module) => {
          const { data: resourcesData } = await supabase
            .from('course_resources')
            .select('*')
            .eq('module_id', module.id)
            .eq('is_published', true)
            .order('position');
          
          return {
            ...module,
            resources: resourcesData || []
          };
        })
      );

      setModules(modulesWithResources);

      // Fetch forum topics
      const { data: forumData, error: forumError } = await supabase
        .from('course_forum_topics')
        .select('*')
        .eq('course_id', courseId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (forumError) throw forumError;

      // Get creator and post count for each topic
      const topicsWithDetails = await Promise.all(
        (forumData || []).map(async (topic) => {
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', topic.created_by)
            .single();

          const { count: postCount } = await supabase
            .from('course_forum_posts')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id);

          return {
            ...topic,
            created_by: creatorData || { first_name: 'Usuario', last_name: 'Desconocido' },
            post_count: postCount || 0
          };
        })
      );

      setForumTopics(topicsWithDetails);

      // Fetch student progress if student
      if (profile.role === 'student') {
        const { data: progressData } = await supabase
          .from('student_progress')
          .select('*')
          .eq('course_id', courseId)
          .eq('student_id', profile.id);

        // Calculate progress percentage
        const totalResources = modulesWithResources?.reduce((acc, module) => acc + (module.resources?.length || 0), 0) || 0;
        const completedResources = progressData?.filter(p => p.progress_type === 'resource_viewed').length || 0;
        const progressPercentage = totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0;
        setStudentProgress(progressPercentage);
      }

    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el curso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markResourceAsViewed = async (moduleId: string, resourceId: string) => {
    if (profile?.role !== 'student') return;

    try {
      await supabase
        .from('student_progress')
        .upsert({
          student_id: profile.id,
          course_id: courseId!,
          module_id: moduleId,
          resource_id: resourceId,
          progress_type: 'resource_viewed',
          completion_percentage: 100
        });

      // Refresh progress
      fetchCourseData();
    } catch (error) {
      console.error('Error marking resource as viewed:', error);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'link': return <LinkIcon className="w-4 h-4" />;
      case 'file': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Curso no encontrado</h1>
          <Link to="/courses">
            <Button variant="outline">Volver a cursos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/courses">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{course.name}</h1>
          <p className="text-muted-foreground mt-1">
            {course.code} • Prof. {course.teacher.first_name} {course.teacher.last_name}
          </p>
        </div>
      </div>

      {/* Course Info Card */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Descripción</h3>
              <p className="text-sm text-muted-foreground">
                {course.description || 'Sin descripción disponible'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Período</h3>
              <p className="text-sm text-muted-foreground">
                {course.academic_year} - {course.semester}
              </p>
            </div>
            {profile?.role === 'student' && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Mi Progreso</h3>
                <div className="space-y-2">
                  <Progress value={studentProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">{studentProgress}% completado</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Course Content Tabs */}
      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="assignments">Tareas</TabsTrigger>
          <TabsTrigger value="forum">Foro</TabsTrigger>
          <TabsTrigger value="grades">Calificaciones</TabsTrigger>
        </TabsList>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          {modules.length === 0 ? (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No hay módulos disponibles
                </h3>
                <p className="text-muted-foreground">
                  El profesor aún no ha publicado módulos para este curso.
                </p>
              </CardContent>
            </Card>
          ) : (
            modules.map((module) => (
              <Card key={module.id} className="bg-gradient-card shadow-card border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    {module.title}
                  </CardTitle>
                  {module.description && (
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {module.resources && module.resources.length > 0 ? (
                    <div className="space-y-3">
                      {module.resources
                        .filter(resource => resource.is_published)
                        .sort((a, b) => a.position - b.position)
                        .map((resource) => (
                          <div
                            key={resource.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
                            onClick={() => markResourceAsViewed(module.id, resource.id)}
                          >
                            {getResourceIcon(resource.resource_type)}
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">{resource.title}</h4>
                              {resource.description && (
                                <p className="text-sm text-muted-foreground">{resource.description}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {resource.resource_type}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay recursos en este módulo</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Tareas del Curso
              </h3>
              <p className="text-muted-foreground mb-4">
                Aquí aparecerán las tareas asignadas para este curso.
              </p>
              <Link to="/assignments">
                <Button variant="outline">Ver todas las tareas</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forum Tab */}
        <TabsContent value="forum" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Foro del Curso</h3>
            <Button size="sm" className="bg-gradient-primary shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Tema
            </Button>
          </div>

          {forumTopics.length === 0 ? (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No hay temas en el foro
                </h3>
                <p className="text-muted-foreground">
                  Sé el primero en iniciar una discusión en este curso.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {forumTopics.map((topic) => (
                <Card key={topic.id} className="bg-gradient-card shadow-card border-0 hover:shadow-glow transition-all duration-300 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <MessageCircle className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{topic.title}</h4>
                          {topic.is_pinned && (
                            <Badge variant="secondary" className="text-xs">Fijado</Badge>
                          )}
                        </div>
                        {topic.description && (
                          <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Por {topic.created_by.first_name} {topic.created_by.last_name}</span>
                          <span>{topic.post_count} respuestas</span>
                          <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Calificaciones
              </h3>
              <p className="text-muted-foreground">
                Aquí podrás ver tus calificaciones y el progreso académico.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseDetail;