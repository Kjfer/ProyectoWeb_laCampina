import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BulkStudentImport } from '@/components/students/BulkStudentImport';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  BookOpen,
  UserCheck,
  UserX,
  Upload,
  UserPlus,
  Loader2,
  CheckCircle2,
  X
} from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  paternal_surname: string;
  maternal_surname: string;
  student_code: string;
  email: string;
  phone: string | null;
  document_number?: string;
  gender?: string;
  birth_date?: string;
  country?: string;
  education_level?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  grade?: string;
  section?: string;
  academic_year?: string;
  is_active: boolean;
}

interface StudentFormData {
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  student_code: string;
  email: string;
  phone: string;
  document_number: string;
  gender: string;
  birth_date: string;
  country: string;
  education_level: string;
  courseId: string;
}

const AdminStudentManagementHub = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // States para gestión individual
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'code' | 'name' | 'course'>('code');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [creating, setCreating] = useState(false);
  
  // States para matriculación existentes
  const [selectedCourseEnroll, setSelectedCourseEnroll] = useState<Course | null>(null);
  const [selectedStudentsEnroll, setSelectedStudentsEnroll] = useState<Set<string>>(new Set());
  const [enrollFilteredStudents, setEnrollFilteredStudents] = useState<Student[]>([]);
  const [enrollSearchTerm, setEnrollSearchTerm] = useState('');
  const [showOnlyNotEnrolled, setShowOnlyNotEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  
  const [formData, setFormData] = useState<StudentFormData>({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    student_code: '',
    email: '',
    phone: '',
    document_number: '',
    gender: 'M',
    birth_date: '',
    country: 'Perú',
    education_level: '',
    courseId: 'none'
  });

  if (profile?.role !== 'admin') {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  useEffect(() => {
    filterStudentsList();
  }, [students, searchTerm, searchType, filterCourse, filterStatus]);

  useEffect(() => {
    filterEnrollStudentsList();
  }, [students, enrollSearchTerm, selectedCourseEnroll, showOnlyNotEnrolled]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('paternal_surname', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los estudiantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('academic_year', { ascending: false })
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const filterStudentsList = async () => {
    let filtered = [...students];

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      
      if (searchType === 'code') {
        filtered = filtered.filter(s => s.student_code?.toLowerCase().includes(term));
      } else if (searchType === 'name') {
        filtered = filtered.filter(s => {
          const fullName = `${s.paternal_surname} ${s.maternal_surname} ${s.first_name}`.toLowerCase();
          return fullName.includes(term) || s.document_number?.toLowerCase().includes(term);
        });
      } else if (searchType === 'course' && filterCourse !== 'all') {
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('student_id')
          .eq('course_id', filterCourse);
        
        const enrolledIds = new Set(enrollments?.map(e => e.student_id) || []);
        filtered = filtered.filter(s => enrolledIds.has(s.id));
        
        // También aplicar búsqueda por nombre si hay término
        if (term) {
          filtered = filtered.filter(s => {
            const fullName = `${s.paternal_surname} ${s.maternal_surname} ${s.first_name}`.toLowerCase();
            return fullName.includes(term);
          });
        }
      }
    } else if (searchType === 'course' && filterCourse !== 'all') {
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('course_id', filterCourse);
      
      const enrolledIds = new Set(enrollments?.map(e => e.student_id) || []);
      filtered = filtered.filter(s => enrolledIds.has(s.id));
    }

    // Filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => 
        filterStatus === 'active' ? s.is_active : !s.is_active
      );
    }

    setFilteredStudents(filtered);
  };

  const filterEnrollStudentsList = async () => {
    let filtered = [...students].filter(s => s.is_active);

    // Filtro por búsqueda
    if (enrollSearchTerm) {
      const term = enrollSearchTerm.toLowerCase();
      filtered = filtered.filter(student => {
        const fullName = `${student.paternal_surname} ${student.maternal_surname} ${student.first_name}`.toLowerCase();
        const code = student.student_code?.toLowerCase() || '';
        const doc = student.document_number?.toLowerCase() || '';
        return fullName.includes(term) || code.includes(term) || doc.includes(term);
      });
    }

    // Filtro por no matriculados
    if (selectedCourseEnroll && showOnlyNotEnrolled) {
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('course_id', selectedCourseEnroll.id);

      const enrolledIds = new Set(enrollments?.map(e => e.student_id) || []);
      filtered = filtered.filter(student => !enrolledIds.has(student.id));
    }

    setEnrollFilteredStudents(filtered);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Validar que tenga email y DNI
      if (!formData.email || !formData.document_number) {
        toast({
          title: "Error",
          description: "Email y DNI son requeridos",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      // Usar el email ingresado y el DNI como contraseña
      const email = formData.email;
      const password = formData.document_number;

      // Llamar a la función edge para crear el estudiante
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "No hay sesión activa",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      // Obtener el token de la sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log('Enviando solicitud con token:', session.access_token.substring(0, 20) + '...');

      const response = await fetch(`${supabaseUrl}/functions/v1/crud-estudiantes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          students: [{
            firstName: formData.first_name,
            paternalSurname: formData.paternal_surname,
            maternalSurname: formData.maternal_surname,
            documentNumber: formData.document_number,
            studentCode: formData.student_code,
            email: email,
            password: password,
            gender: formData.gender,
            birthDate: formData.birth_date,
            phone: formData.phone,
            country: formData.country,
            educationLevel: formData.education_level
          }],
          courseId: formData.courseId !== 'none' ? formData.courseId : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      toast({
        title: "Éxito",
        description: "Estudiante creado y matriculado exitosamente",
      });

      setIsCreateModalOpen(false);
      setFormData({
        first_name: '',
        paternal_surname: '',
        maternal_surname: '',
        student_code: '',
        email: '',
        phone: '',
        document_number: '',
        gender: 'M',
        birth_date: '',
        country: 'Perú',
        education_level: '',
        courseId: 'none'
      });
      fetchStudents();
    } catch (error: any) {
      console.error('Error creating student:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el estudiante",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudentsEnroll);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudentsEnroll(newSelection);
  };

  const selectAllEnroll = () => {
    setSelectedStudentsEnroll(new Set(enrollFilteredStudents.map(s => s.id)));
  };

  const clearSelectionEnroll = () => {
    setSelectedStudentsEnroll(new Set());
  };

  const handleEnrollStudents = async () => {
    if (!selectedCourseEnroll) {
      toast({
        title: "Error",
        description: "Debes seleccionar un curso",
        variant: "destructive",
      });
      return;
    }

    if (selectedStudentsEnroll.size === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un estudiante",
        variant: "destructive",
      });
      return;
    }

    setEnrolling(true);
    try {
      const { data: existingEnrollments } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('course_id', selectedCourseEnroll.id)
        .in('student_id', Array.from(selectedStudentsEnroll));

      const alreadyEnrolledIds = new Set(existingEnrollments?.map(e => e.student_id) || []);
      const toEnroll = Array.from(selectedStudentsEnroll).filter(id => !alreadyEnrolledIds.has(id));

      if (toEnroll.length === 0) {
        toast({
          title: "Información",
          description: "Todos los estudiantes seleccionados ya están matriculados",
        });
        setEnrolling(false);
        return;
      }

      const enrollmentData = toEnroll.map(studentId => ({
        student_id: studentId,
        course_id: selectedCourseEnroll.id,
        enrolled_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('course_enrollments')
        .insert(enrollmentData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${toEnroll.length} estudiante${toEnroll.length !== 1 ? 's' : ''} matriculado${toEnroll.length !== 1 ? 's' : ''}`,
      });

      clearSelectionEnroll();
      filterEnrollStudentsList();
    } catch (error) {
      console.error('Error enrolling students:', error);
      toast({
        title: "Error",
        description: "No se pudieron matricular los estudiantes",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión de Estudiantes</h1>
          <p className="text-muted-foreground">
            Administra estudiantes, matriculaciones e importación masiva
          </p>
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="students">
              <Users className="h-4 w-4 mr-2" />
              Estudiantes
            </TabsTrigger>
            <TabsTrigger value="enroll">
              <UserPlus className="h-4 w-4 mr-2" />
              Matricular Existentes
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              Importación Masiva
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Gestión de Estudiantes */}
          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Lista de Estudiantes
                  </span>
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Estudiante
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Agregar Nuevo Estudiante</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateStudent} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="student_code">Código de Estudiante *</Label>
                            <Input
                              id="student_code"
                              value={formData.student_code}
                              onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Correo Electrónico *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="estudiante@correo.com"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="document_number">DNI *</Label>
                          <Input
                            id="document_number"
                            value={formData.document_number}
                            onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            El DNI se usará como contraseña inicial del estudiante
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="first_name">Nombres *</Label>
                            <Input
                              id="first_name"
                              value={formData.first_name}
                              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="paternal_surname">Apellido Paterno *</Label>
                            <Input
                              id="paternal_surname"
                              value={formData.paternal_surname}
                              onChange={(e) => setFormData({ ...formData, paternal_surname: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="maternal_surname">Apellido Materno *</Label>
                            <Input
                              id="maternal_surname"
                              value={formData.maternal_surname}
                              onChange={(e) => setFormData({ ...formData, maternal_surname: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="gender">Género *</Label>
                            <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="M">Masculino</SelectItem>
                                <SelectItem value="F">Femenino</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="birth_date">Fecha de Nacimiento *</Label>
                            <Input
                              id="birth_date"
                              type="date"
                              value={formData.birth_date}
                              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="country">País</Label>
                            <Input
                              id="country"
                              value={formData.country}
                              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="education_level">Nivel Educativo</Label>
                            <Input
                              id="education_level"
                              value={formData.education_level}
                              onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                              placeholder="Ej: Secundaria"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="phone">Teléfono</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="courseId">Curso (Opcional)</Label>
                          <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar curso para matricular" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin curso</SelectItem>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course?.name || 'Sin nombre'} ({course?.code || 'Sin código'})
                                  {course?.grade && course?.section && ` - ${course.grade}${course.section}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            El estudiante será matriculado automáticamente en el curso seleccionado
                          </p>
                        </div>

                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p className="font-medium mb-1">Credenciales de acceso:</p>
                          <p>Email: {formData.email || '(ingresa un email)'}</p>
                          <p>Contraseña: {formData.document_number || '(se usará el DNI)'}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            El estudiante podrá iniciar sesión con estas credenciales
                          </p>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={creating}>
                            {creating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creando...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Estudiante
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtros y búsqueda */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label>Tipo de Búsqueda</Label>
                    <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tipo de búsqueda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="code">Por Código de Estudiante</SelectItem>
                        <SelectItem value="name">Por Nombre/DNI</SelectItem>
                        <SelectItem value="course">Por Curso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {searchType === 'course' ? (
                    <div className="md:col-span-2">
                      <Label>Curso</Label>
                      <Select value={filterCourse} onValueChange={setFilterCourse}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un curso" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los cursos</SelectItem>
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course?.name || 'Sin nombre'} ({course?.code || 'Sin código'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <Label>Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={searchType === 'code' ? 'Buscar por código...' : 'Buscar por nombre o DNI...'}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {filteredStudents.length} estudiante{filteredStudents.length !== 1 ? 's' : ''} encontrado{filteredStudents.length !== 1 ? 's' : ''}
                  </div>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Solo Activos</SelectItem>
                      <SelectItem value="inactive">Solo Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabla de estudiantes */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Apellidos y Nombres</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Género</TableHead>
                        <TableHead>País</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No se encontraron estudiantes
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.student_code}</TableCell>
                            <TableCell>
                              {student.paternal_surname} {student.maternal_surname}, {student.first_name}
                            </TableCell>
                            <TableCell>{student.document_number || '-'}</TableCell>
                            <TableCell>{student.gender || '-'}</TableCell>
                            <TableCell>{student.country || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={student.is_active ? 'default' : 'secondary'}>
                                {student.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Matricular Existentes */}
          <TabsContent value="enroll" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Seleccionar Curso Destino
                </CardTitle>
                <CardDescription>
                  Elige el curso en el que deseas matricular a los estudiantes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedCourseEnroll?.id || ''}
                  onValueChange={(value) => {
                    const course = courses.find(c => c.id === value);
                    setSelectedCourseEnroll(course || null);
                    clearSelectionEnroll();
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course?.name || 'Sin nombre'} ({course?.code || 'Sin código'})
                        {course?.grade && course?.section && ` - ${course.grade}${course.section}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedCourseEnroll && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Buscar y Filtrar Estudiantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label htmlFor="enroll-search">Buscar</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="enroll-search"
                            placeholder="Buscar por nombre, código o DNI..."
                            value={enrollSearchTerm}
                            onChange={(e) => setEnrollSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="not-enrolled"
                          checked={showOnlyNotEnrolled}
                          onCheckedChange={(checked) => setShowOnlyNotEnrolled(checked === true)}
                        />
                        <Label htmlFor="not-enrolled" className="cursor-pointer">
                          Solo no matriculados
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {enrollFilteredStudents.length} estudiante{enrollFilteredStudents.length !== 1 ? 's' : ''} encontrado{enrollFilteredStudents.length !== 1 ? 's' : ''}
                        {selectedStudentsEnroll.size > 0 && (
                          <span className="ml-2 font-medium text-primary">
                            ({selectedStudentsEnroll.size} seleccionado{selectedStudentsEnroll.size !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {selectedStudentsEnroll.size > 0 && (
                          <Button variant="outline" size="sm" onClick={clearSelectionEnroll}>
                            <X className="h-4 w-4 mr-1" />
                            Limpiar
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={selectAllEnroll} disabled={enrollFilteredStudents.length === 0}>
                          Seleccionar todos
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Lista de Estudiantes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {enrollFilteredStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No se encontraron estudiantes
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {enrollFilteredStudents.map((student) => (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedStudentsEnroll.has(student.id)
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleStudentSelection(student.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedStudentsEnroll.has(student.id)}
                                onCheckedChange={() => toggleStudentSelection(student.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div>
                                <p className="font-medium">
                                  {student.paternal_surname} {student.maternal_surname}, {student.first_name}
                                </p>
                                <div className="flex gap-3 text-sm text-muted-foreground">
                                  <span>Código: {student.student_code}</span>
                                  {student.document_number && <span>DNI: {student.document_number}</span>}
                                  {student.gender && <span>Sexo: {student.gender}</span>}
                                </div>
                              </div>
                            </div>
                            <Badge variant={student.is_active ? 'default' : 'secondary'}>
                              {student.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedStudentsEnroll.size > 0 && (
                  <Card className="bg-gradient-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            Matricular {selectedStudentsEnroll.size} estudiante{selectedStudentsEnroll.size !== 1 ? 's' : ''}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            En el curso: {selectedCourseEnroll?.name || 'Sin nombre'} ({selectedCourseEnroll?.code || 'Sin código'})
                          </p>
                        </div>
                        <Button onClick={handleEnrollStudents} disabled={enrolling} size="lg">
                          {enrolling ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Matriculando...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Matricular Ahora
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Tab 3: Importación Masiva */}
          <TabsContent value="import" className="space-y-4">
            <BulkStudentImport courses={courses} onSuccess={fetchStudents} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminStudentManagementHub;
