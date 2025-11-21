import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { fetchAllTeachers } from '@/utils/teacherUtils';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Clock,
  User,
  Calendar,
  Filter
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string;
  code: string;
  teacher_id: string;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  enrollments?: { count: number }[];
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CourseFormData {
  name: string;
  description: string;
  code: string;
  teacher_id: string;
  academic_year: string;
}

const AdminCourseManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // States
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [formData, setFormData] = useState<CourseFormData>({
    name: '',
    description: '',
    code: '',
    teacher_id: '',
    academic_year: '2024'
  });

  // Redirect if not admin
  if (profile?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-8 text-center">
            <div className="text-destructive text-lg font-semibold mb-2">
              Acceso Denegado
            </div>
            <p className="text-muted-foreground">
              Solo los administradores pueden acceder a esta sección.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          teacher:profiles!courses_teacher_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          enrollments:course_enrollments (count)
        `)
        .order('created_at', { ascending: false });

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

  const fetchTeachers = async () => {
    try {
      const data = await fetchAllTeachers();
      console.log('Profesores cargados:', data);
      setTeachers(data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los profesores",
        variant: "destructive",
      });
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.name || !formData.code || !formData.teacher_id) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Datos del formulario:', formData);
    
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([formData])
        .select();

      if (error) {
        console.error('Error creating course:', error);
        toast({
          title: "Error",
          description: `No se pudo crear el curso: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('Curso creado exitosamente:', data);
        toast({
          title: "Éxito",
          description: "Curso creado exitosamente",
        });
        setIsCreateModalOpen(false);
        resetForm();
        fetchCourses();
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      });
    }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCourse) return;

    try {
      const { error } = await supabase
        .from('courses')
        .update(formData)
        .eq('id', editingCourse.id);

      if (error) {
        console.error('Error updating course:', error);
        toast({
          title: "Error",
          description: "No se pudo actualizar el curso",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Curso actualizado exitosamente",
        });
        setIsEditModalOpen(false);
        setEditingCourse(null);
        resetForm();
        fetchCourses();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este curso? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Error deleting course:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el curso",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Curso eliminado exitosamente",
        });
        fetchCourses();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleToggleCourseStatus = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_active: !course.is_active })
        .eq('id', course.id);

      if (error) {
        console.error('Error toggling course status:', error);
        toast({
          title: "Error",
          description: "No se pudo cambiar el estado del curso",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: `Curso ${!course.is_active ? 'activado' : 'desactivado'} exitosamente`,
        });
        fetchCourses();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description || '',
      code: course.code,
      teacher_id: course.teacher_id,
      academic_year: course.academic_year
    });
    setIsEditModalOpen(true);
  };

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      code: '',
      teacher_id: '',
      academic_year: '2024'
    });
  }, []);

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.teacher?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.teacher?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = filterYear === 'all' || course.academic_year === filterYear;
    
    return matchesSearch && matchesYear;
  });

  // Memoized form handlers to prevent re-renders
  const handleInputChange = useCallback((field: keyof CourseFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleSelectChange = useCallback((field: keyof CourseFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const CourseForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void, isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Curso *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={handleInputChange('name')}
            required
            placeholder="Ej: Matemáticas Básicas"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Código del Curso *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={handleInputChange('code')}
            required
            placeholder="Ej: MAT101"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={handleInputChange('description')}
          placeholder="Descripción del curso..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="teacher">Profesor *</Label>
        <Select value={formData.teacher_id} onValueChange={handleSelectChange('teacher_id')} required>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar profesor" />
          </SelectTrigger>
          <SelectContent>
            {teachers.length === 0 ? (
              <SelectItem value="no-teachers" disabled>
                No hay profesores disponibles
              </SelectItem>
            ) : (
              teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.first_name} {teacher.last_name} ({teacher.email})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {teachers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No se encontraron profesores activos. Asegúrate de que haya profesores registrados en el sistema.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="academic_year">Año Académico</Label>
          <Select value={formData.academic_year} onValueChange={handleSelectChange('academic_year')}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            if (isEdit) {
              setIsEditModalOpen(false);
              setEditingCourse(null);
            } else {
              setIsCreateModalOpen(false);
            }
            resetForm();
          }}
        >
          Cancelar
        </Button>
        <Button type="submit">
          {isEdit ? 'Actualizar Curso' : 'Crear Curso'}
        </Button>
      </div>
    </form>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Cursos</h1>
          <p className="text-muted-foreground">Administra todos los cursos del sistema</p>
        </div>
        
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Curso
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar cursos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-year">Año Académico</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-semester">Semestre</Label>
              <Select value={filterSemester} onValueChange={setFilterSemester}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los semestres</SelectItem>
                  <SelectItem value="primer-semestre">Primer Semestre</SelectItem>
                  <SelectItem value="segundo-semestre">Segundo Semestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterYear('all');
                  setFilterSemester('all');
                }}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cursos</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cursos Activos</p>
                <p className="text-2xl font-bold">{courses.filter(c => c.is_active).length}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profesores Asignados</p>
                <p className="text-2xl font-bold">{new Set(courses.map(c => c.teacher_id)).size}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inscripciones</p>
                <p className="text-2xl font-bold">
                  {courses.reduce((acc, course) => acc + (course.enrollments?.[0]?.count || 0), 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses Table */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardHeader>
          <CardTitle>Lista de Cursos ({filteredCourses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Curso</TableHead>
                  <TableHead>Profesor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Estudiantes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{course.name}</div>
                        <div className="text-sm text-muted-foreground">{course.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {course.teacher?.first_name} {course.teacher?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">{course.teacher?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{course.academic_year}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{course.enrollments?.[0]?.count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.is_active ? "default" : "secondary"}>
                        {course.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(course)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleCourseStatus(course)}
                        >
                          {course.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredCourses.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No se encontraron cursos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Curso</DialogTitle>
          </DialogHeader>
          <CourseForm onSubmit={handleCreateCourse} />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
          </DialogHeader>
          <CourseForm onSubmit={handleEditCourse} isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCourseManagement;