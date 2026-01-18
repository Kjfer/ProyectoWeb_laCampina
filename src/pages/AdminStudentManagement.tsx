import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  BookOpen,
  UserCheck,
  UserX,
  Filter,
  Mail,
  Phone,
  Calendar,
  Lock,
  Unlock,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  enrollments?: { count: number }[];
}

interface Course {
  id: string;
  name: string;
  code: string;
}

interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  course: Course;
  payment_status?: 'pending' | 'verified' | 'blocked';
  payment_verified_at?: string | null;
  payment_notes?: string | null;
}

interface StudentFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

const AdminStudentManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // States
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState('');
  const [formData, setFormData] = useState<StudentFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
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
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          enrollments:course_enrollments (count)
        `)
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los estudiantes",
          variant: "destructive",
        });
      } else {
        setStudents(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching courses:', error);
      } else {
        setCourses(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchStudentEnrollments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          course:courses (
            id,
            name,
            code
          )
        `)
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false });

      if (error) {
        console.error('Error fetching enrollments:', error);
      } else {
        setStudentEnrollments(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleToggleCourseAccess = async (enrollmentId: string, currentStatus: string, courseName: string) => {
    const newStatus = currentStatus === 'verified' ? 'blocked' : 'verified';
    const notes = prompt(
      `Está a punto de ${newStatus === 'verified' ? 'habilitar' : 'bloquear'} el acceso al curso "${courseName}".\n\nIngrese una nota (opcional):`,
      ''
    );

    if (notes === null) return; // User cancelled

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const SUPABASE_URL = "https://bnbtmubibnupttnnhijr.supabase.co";
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/toggle-course-access`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            enrollment_id: enrollmentId,
            payment_status: newStatus,
            notes: notes || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error actualizando acceso al curso');
      }

      const result = await response.json();
      
      toast({
        title: "Éxito",
        description: result.message,
      });

      // Refresh enrollments
      if (selectedStudent) {
        fetchStudentEnrollments(selectedStudent.id);
      }
    } catch (error) {
      console.error('Error toggling course access:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'No se pudo actualizar el acceso',
        variant: "destructive",
      });
    }
  };
          )
        `)
        .eq('student_id', studentId)
        .order('enrollment_date', { ascending: false });

      if (error) {
        console.error('Error fetching enrollments:', error);
      } else {
        setStudentEnrollments(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: 'TempPassword123!', // Temporary password
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: 'student'
          }
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        toast({
          title: "Error",
          description: "No se pudo crear el usuario",
          variant: "destructive",
        });
        return;
      }

      // Update profile with additional data
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            phone: formData.phone || null,
            role: 'student'
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      toast({
        title: "Éxito",
        description: "Estudiante creado exitosamente. Se ha enviado un email para confirmar la cuenta.",
      });
      setIsCreateModalOpen(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al crear el estudiante",
        variant: "destructive",
      });
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingStudent) return;

    try {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone || null,
          })
          .eq('id', editingStudent.id);      if (error) {
        console.error('Error updating student:', error);
        toast({
          title: "Error",
          description: "No se pudo actualizar el estudiante",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Estudiante actualizado exitosamente",
        });
        setIsEditModalOpen(false);
        setEditingStudent(null);
        resetForm();
        fetchStudents();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleToggleStudentStatus = async (student: Student) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !student.is_active })
        .eq('id', student.id);

      if (error) {
        console.error('Error toggling student status:', error);
        toast({
          title: "Error",
          description: "No se pudo cambiar el estado del estudiante",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: `Estudiante ${!student.is_active ? 'activado' : 'desactivado'} exitosamente`,
        });
        fetchStudents();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || !selectedCourseForEnrollment) return;

    try {
      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('student_id', selectedStudent.id)
        .eq('course_id', selectedCourseForEnrollment)
        .single();

      if (existingEnrollment) {
        toast({
          title: "Error",
          description: "El estudiante ya está inscrito en este curso",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('course_enrollments')
        .insert([{
          student_id: selectedStudent.id,
          course_id: selectedCourseForEnrollment,
          enrolled_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error enrolling student:', error);
        toast({
          title: "Error",
          description: "No se pudo inscribir al estudiante",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Estudiante inscrito exitosamente",
        });
        setIsEnrollModalOpen(false);
        setSelectedCourseForEnrollment('');
        fetchStudentEnrollments(selectedStudent.id);
        fetchStudents();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleUnenrollStudent = async (enrollmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres retirar al estudiante de este curso?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) {
        console.error('Error unenrolling student:', error);
        toast({
          title: "Error",
          description: "No se pudo retirar al estudiante del curso",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Estudiante retirado del curso exitosamente",
        });
        if (selectedStudent) {
          fetchStudentEnrollments(selectedStudent.id);
        }
        fetchStudents();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      phone: student.phone || ''
    });
    setIsEditModalOpen(true);
  };

  const openEnrollModal = (student: Student) => {
    setSelectedStudent(student);
    fetchStudentEnrollments(student.id);
    setIsEnrollModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    });
  };

  // Filter students based on search and filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && student.is_active) ||
                         (filterStatus === 'inactive' && !student.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const StudentForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void, isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Nombres</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
            placeholder="Nombres del estudiante"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Apellidos</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
            placeholder="Apellidos del estudiante"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={isEdit} // Cannot change email once created
          placeholder="correo@ejemplo.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Número de teléfono"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            if (isEdit) {
              setIsEditModalOpen(false);
              setEditingStudent(null);
            } else {
              setIsCreateModalOpen(false);
            }
            resetForm();
          }}
        >
          Cancelar
        </Button>
        <Button type="submit">
          {isEdit ? 'Actualizar Estudiante' : 'Crear Estudiante'}
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
          <h1 className="text-3xl font-bold text-foreground">Gestión de Estudiantes</h1>
          <p className="text-muted-foreground">Administra todos los estudiantes del sistema</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Estudiante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Estudiante</DialogTitle>
            </DialogHeader>
            <StudentForm onSubmit={handleCreateStudent} />
          </DialogContent>
        </Dialog>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar estudiantes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-status">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
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
                <p className="text-sm font-medium text-muted-foreground">Total Estudiantes</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estudiantes Activos</p>
                <p className="text-2xl font-bold">{students.filter(s => s.is_active).length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estudiantes Inactivos</p>
                <p className="text-2xl font-bold">{students.filter(s => !s.is_active).length}</p>
              </div>
              <UserX className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inscripciones</p>
                <p className="text-2xl font-bold">
                  {students.reduce((acc, student) => acc + (student.enrollments?.[0]?.count || 0), 0)}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardHeader>
          <CardTitle>Lista de Estudiantes ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Inscripciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.first_name} {student.last_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {student.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {student.phone && (
                          <div className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {student.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{student.enrollments?.[0]?.count || 0} cursos</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.is_active ? "default" : "secondary"}>
                        {student.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(student.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(student)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEnrollModal(student)}
                        >
                          <BookOpen className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStudentStatus(student)}
                        >
                          {student.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredStudents.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No se encontraron estudiantes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Student Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Estudiante</DialogTitle>
          </DialogHeader>
          <StudentForm onSubmit={handleEditStudent} isEdit={true} />
        </DialogContent>
      </Dialog>

      {/* Enrollment Management Modal */}
      <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Gestión de Inscripciones - {selectedStudent?.first_name} {selectedStudent?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Enroll in new course */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Inscribir en nuevo curso</h3>
              <form onSubmit={handleEnrollStudent} className="flex gap-2">
                <Select value={selectedCourseForEnrollment} onValueChange={setSelectedCourseForEnrollment}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses
                      .filter(course => !studentEnrollments.some(enrollment => enrollment.course_id === course.id))
                      .map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name} ({course.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={!selectedCourseForEnrollment}>
                  Inscribir
                </Button>
              </form>
            </div>

            {/* Current enrollments */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Inscripciones actuales ({studentEnrollments.length})</h3>
              {studentEnrollments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Curso</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Fecha Inscripción</TableHead>
                      <TableHead>Estado de Pago</TableHead>
                      <TableHead>Acceso</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentEnrollments.map((enrollment) => {
                      const paymentStatus = enrollment.payment_status || 'pending';
                      const isAccessGranted = paymentStatus === 'verified';
                      
                      return (
                        <TableRow key={enrollment.id} className={paymentStatus === 'blocked' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                          <TableCell className="font-medium">{enrollment.course.name}</TableCell>
                          <TableCell>{enrollment.course.code}</TableCell>
                          <TableCell>{new Date(enrollment.enrolled_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge 
                                variant={
                                  paymentStatus === 'verified' ? 'default' : 
                                  paymentStatus === 'blocked' ? 'destructive' : 
                                  'secondary'
                                }
                                className="w-fit"
                              >
                                {paymentStatus === 'verified' && <DollarSign className="w-3 h-3 mr-1" />}
                                {paymentStatus === 'blocked' && <AlertCircle className="w-3 h-3 mr-1" />}
                                {paymentStatus === 'verified' ? 'Pago Verificado' : 
                                 paymentStatus === 'blocked' ? 'Bloqueado' : 
                                 'Pago Pendiente'}
                              </Badge>
                              {enrollment.payment_notes && (
                                <span className="text-xs text-muted-foreground">
                                  {enrollment.payment_notes}
                                </span>
                              )}
                              {enrollment.payment_verified_at && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(enrollment.payment_verified_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={isAccessGranted ? 'default' : 'secondary'}
                              className="w-fit"
                            >
                              {isAccessGranted ? (
                                <><Unlock className="w-3 h-3 mr-1" /> Habilitado</>
                              ) : (
                                <><Lock className="w-3 h-3 mr-1" /> Bloqueado</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={isAccessGranted ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => handleToggleCourseAccess(
                                  enrollment.id, 
                                  paymentStatus,
                                  enrollment.course.name
                                )}
                                title={isAccessGranted ? 'Bloquear acceso' : 'Habilitar acceso'}
                              >
                                {isAccessGranted ? (
                                  <><Lock className="w-4 h-4 mr-1" /> Bloquear</>
                                ) : (
                                  <><Unlock className="w-4 h-4 mr-1" /> Habilitar</>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleUnenrollStudent(enrollment.id)}
                                title="Dar de baja del curso"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay inscripciones actualmente</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudentManagement;