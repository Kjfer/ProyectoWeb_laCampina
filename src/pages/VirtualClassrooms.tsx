import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, BookOpen, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  courses_count?: number;
  students_count?: number;
}

export default function VirtualClassrooms() {
  const { user, profile } = useAuth();
  const [classrooms, setClassrooms] = useState<VirtualClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    education_level: '' as 'primaria' | 'secundaria' | '',
    academic_year: new Date().getFullYear().toString()
  });

  const grades = {
    primaria: ['1ro', '2do', '3ro', '4to', '5to', '6to'],
    secundaria: ['1ro', '2do', '3ro', '4to', '5to']
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('virtual_classrooms')
        .select(`
          *,
          teacher:profiles!teacher_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // If user is a teacher, only show their classrooms
      if (profile?.role === 'teacher') {
        query = query.eq('teacher_id', profile.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get courses and students count for each classroom
      const classroomsWithCounts = await Promise.all(
        (data || []).map(async (classroom) => {
          const [coursesResult, studentsResult] = await Promise.all([
            supabase
              .from('courses')
              .select('id', { count: 'exact' })
              .eq('classroom_id', classroom.id),
            supabase
              .from('course_enrollments')
              .select('student_id', { count: 'exact' })
              .in('course_id', 
                (await supabase
                  .from('courses')
                  .select('id')
                  .eq('classroom_id', classroom.id)
                ).data?.map(c => c.id) || []
              )
          ]);

          return {
            ...classroom,
            teacher: Array.isArray(classroom.teacher) ? classroom.teacher[0] : classroom.teacher,
            courses_count: coursesResult.count || 0,
            students_count: studentsResult.count || 0
          };
        })
      );

      setClassrooms(classroomsWithCounts);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      toast.error('Error al cargar las aulas virtuales');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !formData.education_level) {
      toast.error('No se pudo identificar el usuario o falta el nivel educativo');
      return;
    }

    try {
      const { error } = await supabase
        .from('virtual_classrooms')
        .insert({
          name: formData.name,
          grade: formData.grade,
          education_level: formData.education_level as 'primaria' | 'secundaria',
          academic_year: formData.academic_year,
          teacher_id: profile.id
        });

      if (error) throw error;

      toast.success('Aula virtual creada exitosamente');
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        grade: '',
        education_level: '',
        academic_year: new Date().getFullYear().toString()
      });
      fetchClassrooms();
    } catch (error) {
      console.error('Error creating classroom:', error);
      toast.error('Error al crear el aula virtual');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Aulas Virtuales</h1>
            <p className="text-muted-foreground">
              Gestiona las aulas virtuales y sus cursos asociados
            </p>
          </div>
          
          {(profile?.role === 'admin' || profile?.role === 'teacher') && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Aula Virtual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Aula Virtual</DialogTitle>
                  <DialogDescription>
                    Complete los datos para crear una nueva aula virtual
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateClassroom} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre del Aula</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Aula 1ro A"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="education_level">Nivel Educativo</Label>
                    <Select 
                      value={formData.education_level} 
                      onValueChange={(value: 'primaria' | 'secundaria') => 
                        setFormData({ ...formData, education_level: value, grade: '' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primaria">Primaria</SelectItem>
                        <SelectItem value="secundaria">Secundaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.education_level && (
                    <div>
                      <Label htmlFor="grade">Grado</Label>
                      <Select 
                        value={formData.grade} 
                        onValueChange={(value) => setFormData({ ...formData, grade: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar grado" />
                        </SelectTrigger>
                        <SelectContent>
                          {grades[formData.education_level].map((grade) => (
                            <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="academic_year">Año Académico</Label>
                    <Input
                      id="academic_year"
                      value={formData.academic_year}
                      onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                      placeholder="2024"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Crear Aula</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            classrooms.map((classroom) => (
              <Card key={classroom.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{classroom.name}</CardTitle>
                    <Badge variant={classroom.is_active ? "default" : "secondary"}>
                      {classroom.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {classroom.grade} - {classroom.education_level.charAt(0).toUpperCase() + classroom.education_level.slice(1)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Año {classroom.academic_year}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4" />
                      {classroom.courses_count} cursos
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      {classroom.students_count} estudiantes
                    </div>
                  </div>

                  {classroom.teacher && (
                    <div className="text-sm text-muted-foreground">
                      Profesor: {classroom.teacher.first_name} {classroom.teacher.last_name}
                    </div>
                  )}

                  <Button variant="outline" className="w-full">
                    Ver Detalles
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {!loading && classrooms.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay aulas virtuales</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comienza creando tu primera aula virtual para organizar tus cursos
              </p>
              {(profile?.role === 'admin' || profile?.role === 'teacher') && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Aula
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}