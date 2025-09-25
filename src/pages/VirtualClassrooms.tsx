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
      console.log('🔄 Iniciando carga de aulas virtuales...');
      
      // Try Edge Function first
      try {
        console.log('📡 Intentando con Edge Function...');
        
        // Get the current session to include in the request
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No estás autenticado');
        }

        // Call the Edge Function
        const { data, error } = await supabase.functions.invoke('get-virtual-classrooms', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('❌ Error calling Edge Function:', error);
          throw new Error('Edge Function falló, usando método directo');
        }

        if (!data.success) {
          throw new Error(data.error || 'Error en la respuesta del servidor');
        }

        console.log('✅ Aulas virtuales cargadas con Edge Function:', data.data?.length || 0, 'aulas');
        console.log('👤 Rol del usuario:', data.user_role);
        setClassrooms(data.data || []);
        return; // Success with Edge Function
        
      } catch (edgeFunctionError) {
        console.warn('⚠️ Edge Function falló, usando consulta directa:', edgeFunctionError.message);
        
        // Fallback to direct database query
        console.log('🔄 Usando consulta directa como fallback...');
        
        let query = supabase
          .from('virtual_classrooms')
          .select(`
            id,
            name,
            grade,
            education_level,
            academic_year,
            teacher_id,
            is_active,
            created_at
          `)
          .order('created_at', { ascending: false });

        // If user is a teacher, only show their classrooms
        if (profile?.role === 'teacher') {
          console.log('👨‍🏫 Usuario es profesor, filtrando aulas...');
          query = query.eq('teacher_id', profile.id);
        }

        const { data: classroomsData, error: classroomsError } = await query;
        
        if (classroomsError) {
          console.error('❌ Error en consulta directa:', classroomsError);
          throw classroomsError;
        }

        console.log('� Aulas virtuales obtenidas (directo):', classroomsData?.length || 0);
        
        // Get teacher info and counts for each classroom
        const classroomsWithCounts = await Promise.all(
          (classroomsData || []).map(async (classroom) => {
            try {
              // Get teacher info separately
              let teacher = null;
              if (classroom.teacher_id) {
                const { data: teacherData, error: teacherError } = await supabase
                  .from('profiles')
                  .select('id, first_name, last_name, email')
                  .eq('id', classroom.teacher_id)
                  .single();

                if (!teacherError && teacherData) {
                  teacher = teacherData;
                }
              }

              // Get courses count
              const { count: coursesCount, error: coursesError } = await supabase
                .from('courses')
                .select('id', { count: 'exact', head: true })
                .eq('classroom_id', classroom.id);

              if (coursesError) {
                console.error(`❌ Error obteniendo cursos para aula ${classroom.id}:`, coursesError);
              }

              // Get students count through enrollments
              const { data: courses, error: coursesDataError } = await supabase
                .from('courses')
                .select('id')
                .eq('classroom_id', classroom.id);

              if (coursesDataError) {
                console.error(`❌ Error obteniendo datos de cursos para aula ${classroom.id}:`, coursesDataError);
              }

              let studentsCount = 0;
              if (courses && courses.length > 0) {
                const courseIds = courses.map(c => c.id);
                const { count, error: enrollmentsError } = await supabase
                  .from('course_enrollments')
                  .select('student_id', { count: 'exact', head: true })
                  .in('course_id', courseIds);

                if (enrollmentsError) {
                  console.error(`❌ Error obteniendo inscripciones para aula ${classroom.id}:`, enrollmentsError);
                } else {
                  studentsCount = count || 0;
                }
              }

              return {
                ...classroom,
                teacher,
                courses_count: coursesCount || 0,
                students_count: studentsCount
              };

            } catch (error) {
              console.error(`❌ Error procesando aula ${classroom.id}:`, error);
              return {
                ...classroom,
                teacher: null,
                courses_count: 0,
                students_count: 0
              };
            }
          })
        );

        console.log('✅ Aulas virtuales cargadas con consulta directa');
        setClassrooms(classroomsWithCounts);
      }
      
    } catch (error) {
      console.error('❌ Error general cargando aulas virtuales:', error);
      toast.error(`Error al cargar las aulas virtuales: ${error.message}`);
      setClassrooms([]); // Set empty array on error
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
      console.log('🔄 Creando nueva aula virtual con Edge Function...', formData);

      // Get the current session to include in the request
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('No estás autenticado');
        return;
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('create-virtual-classroom', {
        body: {
          name: formData.name,
          grade: formData.grade,
          education_level: formData.education_level as 'primaria' | 'secundaria',
          academic_year: formData.academic_year,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('❌ Error calling Edge Function:', error);
        throw new Error(error.message || 'Error al llamar a la función');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error en la respuesta del servidor');
      }

      console.log('✅ Aula virtual creada exitosamente:', data.data);

      toast.success(data.message || 'Aula virtual creada exitosamente');
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        grade: '',
        education_level: '',
        academic_year: new Date().getFullYear().toString()
      });
      
      // Add the new classroom to the existing list to avoid refetching
      setClassrooms(prev => [data.data, ...prev]);
      
    } catch (error) {
      console.error('❌ Error creando aula virtual:', error);
      toast.error(`Error al crear el aula virtual: ${error.message}`);
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