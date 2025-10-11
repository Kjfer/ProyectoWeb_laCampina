import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, GraduationCap, Clock, Calendar, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { WeeklyContentManager } from '@/components/course/WeeklyContentManager';
import { AttendanceManager } from '@/components/course/AttendanceManager';
import { AttendanceRecords } from '@/components/course/AttendanceRecords';
import { StudentAttendance } from '@/components/profile/StudentAttendance';
import { CourseScheduleManager } from '@/components/course/CourseScheduleManager';

interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  created_at: string;
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  classroom?: {
    name: string;
    grade: string;
    education_level: string;
  };
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  enrolled_at: string;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user can edit this course
  const canEdit = profile && course && (
    profile.role === 'admin' || 
    (profile.role === 'teacher' && course.teacher && profile.id === course.teacher.id)
  );

  useEffect(() => {
    if (id) {
      fetchCourse();
      fetchStudents();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          teacher:profiles!courses_teacher_id_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          classroom:virtual_classrooms!courses_classroom_id_fkey(
            name,
            grade,
            education_level
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Error al cargar el curso');
      navigate('/courses');
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          enrolled_at,
          student:profiles!course_enrollments_student_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('course_id', id);

      if (error) throw error;
      
      const enrolledStudents = data?.map(enrollment => ({
        ...enrollment.student,
        enrolled_at: enrollment.enrolled_at
      })) || [];
      
      setStudents(enrolledStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error al cargar los estudiantes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Curso No Encontrado</h1>
          <Button onClick={() => navigate('/courses')} className="mt-4">
            Volver a Cursos
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>

        {/* Course Info */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{course.name}</CardTitle>
                <CardDescription className="mt-2">
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {course.code}
                  </span>
                </CardDescription>
                {course.description && (
                  <p className="mt-3 text-muted-foreground">
                    {course.description}
                  </p>
                )}
              </div>
              <Badge variant={course.is_active ? "default" : "secondary"}>
                {course.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Profesor</p>
                  <p className="font-medium">
                    {course.teacher?.first_name} {course.teacher?.last_name}
                  </p>
                </div>
              </div>
              
              {course.classroom && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Aula Virtual</p>
                    <p className="font-medium">{course.classroom.name}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Año Académico</p>
                  <p className="font-medium">{course.academic_year}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Semestre</p>
                  <p className="font-medium">{course.semester}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Content, Attendance, Students and Schedule */}
        <Tabs defaultValue="content" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Asistencia
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Estudiantes
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horario
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <WeeklyContentManager 
              courseId={course.id} 
              canEdit={canEdit || false}
            />
          </TabsContent>

          <TabsContent value="attendance">
            {/* Mostrar el registro completo y el manager sólo a admin o al docente propietario. */}
            {profile?.role === 'admin' || (profile?.role === 'teacher' && course.teacher && profile.id === course.teacher.id) ? (
              <div className="space-y-6">
                <AttendanceManager courseId={course.id} />
                <AttendanceRecords courseId={course.id} />
              </div>
            ) : profile?.role === 'student' ? (
              // Los estudiantes ven su propio historial
              <StudentAttendance />
            ) : (
              <div className="p-6">
                <p className="text-muted-foreground">No tienes permisos para ver el historial de asistencia de este curso.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Estudiantes Inscritos ({students.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {students.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {students.map((student) => (
                      <div key={student.id} className="p-4 border rounded-lg">
                        <h3 className="font-medium">
                          {student.first_name} {student.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Inscrito: {new Date(student.enrolled_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No hay estudiantes inscritos</h3>
                    <p className="text-muted-foreground">
                      Este curso aún no tiene estudiantes inscritos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <CourseScheduleManager courseId={course.id} canEdit={canEdit || false} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}