import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ClassroomCoursesList } from '@/components/virtual-classrooms/ClassroomCoursesList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VirtualClassroom {
  id: string;
  name: string;
  grade: string;
  education_level: string;
  academic_year: string;
  teacher?: {
    first_name: string;
    last_name: string;
  };
}

export default function VirtualClassroomCourses() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
          profiles!virtual_classrooms_teacher_id_fkey(first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setClassroom({
        ...data,
        teacher: data.profiles || undefined
      });
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
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!classroom) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardContent className="text-center p-8">
              <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aula virtual no encontrada</h3>
              <p className="text-muted-foreground mb-4">
                El aula virtual que buscas no existe o no tienes acceso a ella.
              </p>
              <Button onClick={() => navigate('/virtual-classrooms')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Aulas Virtuales
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header con información del aula */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/virtual-classrooms')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Aulas Virtuales
          </Button>
        </div>

        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <School className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{classroom.name}</h1>
                <p className="text-lg text-muted-foreground">
                  {classroom.grade} - {classroom.education_level.charAt(0).toUpperCase() + classroom.education_level.slice(1)}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span>Año Académico: {classroom.academic_year}</span>
              {classroom.teacher && (
                <span>
                  Profesor: {classroom.teacher.first_name} {classroom.teacher.last_name}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de cursos */}
        {id && (
          <ClassroomCoursesList 
            classroomId={id} 
            classroomName={classroom.name}
          />
        )}
      </div>
    </DashboardLayout>
  );
}