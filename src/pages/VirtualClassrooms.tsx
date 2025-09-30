import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, BookOpen, Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ClassroomCoursesList } from '@/components/virtual-classrooms/ClassroomCoursesList';

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

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function VirtualClassrooms() {
  const { user, profile } = useAuth();
  const [classrooms, setClassrooms] = useState<VirtualClassroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Cache timeout: 5 minutos
  const CACHE_TIMEOUT = 5 * 60 * 1000;
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    education_level: '' as 'primaria' | 'secundaria' | '',
    academic_year: new Date().getFullYear().toString(),
    teacher_id: ''
  });

  const grades = {
    primaria: ['1ro', '2do', '3ro', '4to', '5to', '6to'],
    secundaria: ['1ro', '2do', '3ro', '4to', '5to']
  };

  useEffect(() => {
    // Paralelizar la carga de datos
    Promise.all([
      fetchClassrooms(),
      fetchTeachers()
    ]).catch(error => {
      console.error('Error en carga inicial:', error);
    });
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'teacher')
        .eq('is_active', true);

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Error al cargar la lista de profesores');
    }
  };

  const fetchClassrooms = async (forceRefresh = false) => {
    const now = Date.now();
    
    // Verificar si necesitamos refrescar (cache expirado o forzado)
    if (!forceRefresh && classrooms.length > 0 && (now - lastFetch) < CACHE_TIMEOUT) {
      console.log('🔄 Usando datos en cache (válidos por', Math.round((CACHE_TIMEOUT - (now - lastFetch)) / 1000), 'segundos más)');
      return;
    }

    const startTime = performance.now();
    
    try {
      setLoading(true);
      console.log('🔄 Iniciando carga optimizada de aulas virtuales...');
      
      // Use Edge Function exclusively
      console.log('📡 Llamando a Edge Function optimizada...');
      
      // Get the current session to include in the request
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No estás autenticado. Por favor, inicia sesión.');
      }

      // Call the optimized Edge Function
      const { data, error } = await supabase.functions.invoke('get-virtual-classrooms', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('❌ Error calling Edge Function:', error);
        throw new Error(`Error en Edge Function: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Error en la respuesta del servidor');
      }

      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);
      
      console.log(`⚡ Aulas virtuales cargadas en ${loadTime}ms:`, data.data?.length || 0, 'aulas');
      console.log('👤 Rol del usuario:', data.user_role);
      console.log('📊 Rendimiento mejorado con consultas optimizadas');
      
      setClassrooms(data.data || []);
      setLastFetch(now);
      
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
        method: 'POST',
        body: {
          name: formData.name,
          grade: formData.grade,
          education_level: formData.education_level as 'primaria' | 'secundaria',
          academic_year: formData.academic_year,
          teacher_id: formData.teacher_id || profile.id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
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
        academic_year: new Date().getFullYear().toString(),
        teacher_id: ''
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
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => fetchClassrooms(true)}
              disabled={loading}
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
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

                  {profile?.role === 'admin' && (
                    <div>
                      <Label htmlFor="teacher">Profesor Asignado</Label>
                      <Select 
                        value={formData.teacher_id} 
                        onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar profesor" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.first_name} {teacher.last_name} - {teacher.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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

                  {profile?.role === 'student' ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = `/virtual-classrooms/${classroom.id}/courses`}
                    >
                      Ver Cursos
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = `/virtual-classrooms/${classroom.id}`}
                    >
                      Ver Detalles
                    </Button>
                  )}
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
  )
};
