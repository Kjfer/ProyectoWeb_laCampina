import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Users, BookOpen, GraduationCap, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ClassroomCourses } from '@/components/virtual-classrooms/ClassroomCourses';
import { ClassroomStudents } from '@/components/virtual-classrooms/ClassroomStudents';
import { StudentClassroomCourses } from '@/components/virtual-classrooms/StudentClassroomCourses';
import { VirtualClassroomAttendance } from '@/components/virtual-classrooms/VirtualClassroomAttendance';
import { AttendanceHistory } from '@/components/virtual-classrooms/AttendanceHistory';

interface VirtualClassroom {
  id: string;
  name: string;
  grade: string;
  education_level: 'primaria' | 'secundaria';
  academic_year: string;
  teacher_id: string;
  is_active: boolean;
  created_at: string;
  teacher?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function VirtualClassroomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [classroom, setClassroom] = useState<VirtualClassroom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchClassroom();
    }
  }, [id]);

  const fetchClassroom = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('virtual_classrooms')
        .select(`
          *,
          teacher:profiles!virtual_classrooms_teacher_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setClassroom(data);
    } catch (error) {
      console.error('Error fetching classroom:', error);
      toast.error('Error al cargar el aula virtual');
      navigate('/virtual-classrooms');
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

  if (!classroom) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Aula Virtual No Encontrada</h1>
          <Button onClick={() => navigate('/virtual-classrooms')} className="mt-4">
            Volver a Aulas Virtuales
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const canManage = profile?.role === 'admin' || classroom.teacher_id === profile?.id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/virtual-classrooms')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>

        {/* Classroom Info */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{classroom.name}</CardTitle>
                <CardDescription>
                  {classroom.grade} - {classroom.education_level.charAt(0).toUpperCase() + classroom.education_level.slice(1)} | 
                  Año Académico {classroom.academic_year}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Profesor</p>
                <p className="font-medium">
                  {classroom.teacher?.first_name} {classroom.teacher?.last_name}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs for Courses and Students */}
        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {profile?.role === 'student' ? 'Mis Cursos' : 'Cursos'}
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Estudiantes
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Asistencia
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            {profile?.role === 'student' ? (
              <StudentClassroomCourses classroomId={classroom.id} />
            ) : (
              <ClassroomCourses 
                classroomId={classroom.id} 
                canManage={canManage}
                onUpdate={fetchClassroom}
              />
            )}
          </TabsContent>

          <TabsContent value="students">
            <ClassroomStudents 
              classroomId={classroom.id} 
              canManage={canManage}
              onUpdate={fetchClassroom}
            />
          </TabsContent>

          <TabsContent value="attendance">
            <VirtualClassroomAttendance 
              classroomId={classroom.id}
              canManage={canManage}
            />
          </TabsContent>

          <TabsContent value="history">
            <AttendanceHistory classroomId={classroom.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}