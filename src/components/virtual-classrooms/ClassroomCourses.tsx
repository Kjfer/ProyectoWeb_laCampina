import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  description: string;
  code: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  teacher?: {
    first_name: string;
    last_name: string;
  };
  enrollments?: { count: number }[];
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ClassroomCoursesProps {
  classroomId: string;
  canManage: boolean;
  onUpdate: () => void;
}

export function ClassroomCourses({ classroomId, canManage, onUpdate }: ClassroomCoursesProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    academic_year: new Date().getFullYear().toString(),
    semester: '',
    teacher_id: '',
    start_date: '',
    end_date: ''
  });

  const semesters = [
    { value: 'primer-semestre', label: 'Primer Semestre' },
    { value: 'segundo-semestre', label: 'Segundo Semestre' },
    { value: 'anual', label: 'Anual' }
  ];

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, [classroomId]);

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
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          teacher:profiles!courses_teacher_id_fkey(first_name, last_name),
          enrollments:course_enrollments(count)
        `)
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Error al cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          name: formData.name,
          description: formData.description,
          code: formData.code,
          academic_year: formData.academic_year,
          semester: formData.semester,
          teacher_id: formData.teacher_id,
          classroom_id: classroomId,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null
        })
        .select()
        .single();

      if (error) throw error;

      // Generate weekly sections automatically if dates are provided
      if (formData.start_date && formData.end_date) {
        try {
          const { data: weeksData, error: weeksError } = await supabase.functions.invoke('generate-course-weeks', {
            body: {
              courseId: data.id,
              startDate: formData.start_date,
              endDate: formData.end_date
            }
          });

          if (weeksError) {
            console.error('Error generating weeks:', weeksError);
            toast.error('El curso se creó pero no se pudieron generar las semanas automáticamente');
          } else {
            toast.success(`Curso creado con ${weeksData.weeksGenerated} semanas generadas automáticamente`);
          }
        } catch (weeksError) {
          console.error('Error calling generate-course-weeks:', weeksError);
          toast.error('El curso se creó pero no se pudieron generar las semanas automáticamente');
        }
      } else {
        toast.success('Curso creado exitosamente');
      }

      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        code: '',
        academic_year: new Date().getFullYear().toString(),
        semester: '',
        teacher_id: '',
        start_date: '',
        end_date: ''
      });
      fetchCourses();
      onUpdate();
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Error al crear el curso');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cursos</h2>
          <p className="text-muted-foreground">
            Gestiona los cursos de esta aula virtual
          </p>
        </div>
        
        {canManage && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Curso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Curso</DialogTitle>
                <DialogDescription>
                  Complete los datos para crear un nuevo curso
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Curso</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Matemáticas"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="code">Código del Curso</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ej: MAT101"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del curso"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="semester">Semestre</Label>
                  <Select 
                    value={formData.semester} 
                    onValueChange={(value) => setFormData({ ...formData, semester: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar semestre" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((semester) => (
                        <SelectItem key={semester.value} value={semester.value}>
                          {semester.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                          {teacher.first_name} {teacher.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Fecha de Inicio</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">Fecha de Fin</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                {formData.start_date && formData.end_date && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                    <strong>💡 Generación automática:</strong> Se crearán automáticamente las semanas del curso basadas en las fechas seleccionadas.
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
                  <Button type="submit">Crear Curso</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
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
        ) : courses.length > 0 ? (
          courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = `/courses/${course.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                  <Badge variant={course.is_active ? "default" : "secondary"}>
                    {course.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <CardDescription>
                  {course.code} | {course.semester}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {course.description}
                </p>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Año {course.academic_year}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    {course.enrollments?.[0]?.count || 0} estudiantes
                  </div>
                </div>

                {course.teacher && (
                  <div className="text-sm text-muted-foreground">
                    Profesor: {course.teacher.first_name} {course.teacher.last_name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay cursos</h3>
                <p className="text-muted-foreground text-center mb-4">
                  No se han creado cursos para esta aula virtual aún
                </p>
                {canManage && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primer Curso
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}