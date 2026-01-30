import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, BookOpen, Package } from 'lucide-react';

interface Material {
  id: string;
  nombre: string;
  tipo_material: 'book' | 'kit';
  usuario_id: string;
  estudiante_id: string;
  course_id: string;
  estado_pago: 'pendiente' | 'pagado' | 'cancelado';
  monto: number;
  moneda_material?: string;
  fecha_registro: string;
  fecha_pago: string | null;
  created_at: string;
  estudiante?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  course?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  material: string;
}

interface Matricula {
  id: string;
  cod_matricula: string;
  modulos_matriculados: any[];
  course?: {
    id: string;
    name: string;
    code: string;
  };
}

export default function AdminMaterialesManagement() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [filterCourse, setFilterCourse] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [searchType, setSearchType] = useState<'nombre' | 'codigo' | 'dni'>('nombre');
  const [studentMatriculas, setStudentMatriculas] = useState<Matricula[]>([]);
  const [formData, setFormData] = useState({
    tipo_material: 'book' as 'book' | 'kit',
    estudiante_id: '',
    course_id: '',
    monto: 0,
    moneda_material: 'PEN' as 'PEN' | 'USD' | 'EUR',
  });

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!studentSearch.trim()) {
      setFilteredStudents(students);
      return;
    }

    const searchLower = studentSearch.toLowerCase();
    const filtered = students.filter(student => {
      if (searchType === 'nombre') {
        return `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchLower);
      } else if (searchType === 'codigo') {
        return (student as any).student_code?.toLowerCase().includes(searchLower);
      } else {
        return (student as any).document_number?.toLowerCase().includes(searchLower);
      }
    });
    setFilteredStudents(filtered);
  }, [studentSearch, searchType, students]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Cargar materiales
      const { data: materialesData, error: materialesError } = await supabase
        .from('registro_compra_materiales' as any)
        .select(`
          *,
          estudiante:profiles!registro_compra_materiales_estudiante_id_fkey(id, first_name, last_name, email),
          course:courses(id, name, code)
        `)
        .order('created_at', { ascending: false });

      if (materialesError) throw materialesError;

      // Cargar estudiantes
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, student_code, document_number')
        .eq('role', 'student')
        .order('first_name');

      if (studentsError) throw studentsError;

      // Cargar cursos con material (sin material para evitar recursión)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (coursesError) throw coursesError;

      setMateriales(materialesData as any || []);
      setStudents(studentsData || []);
      setFilteredStudents(studentsData || []);
      setCourses(coursesData as any || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al cargar datos: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMatriculasEstudiante = async (estudianteId: string) => {
    try {
      const { data, error } = await supabase
        .from('matriculas' as any)
        .select(`
          id,
          cod_matricula,
          modulos_matriculados
        `)
        .eq('estudiante_id', estudianteId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obtener IDs únicos de cursos de las matrículas
      const courseIds = new Set<string>();
      data?.forEach((mat: any) => {
        mat.modulos_matriculados?.forEach((mod: any) => {
          if (mod.course_id) courseIds.add(mod.course_id);
        });
      });

      // Obtener información de los cursos
      const matriculasConCursos = await Promise.all(
        (data || []).map(async (mat: any) => {
          // Obtener el primer módulo para sacar el course_id
          const firstModulo = mat.modulos_matriculados?.[0];
          if (firstModulo?.modulo_id) {
            const { data: moduloData } = await supabase
              .from('modulos' as any)
              .select('course_id, course:courses(id, name, code)')
              .eq('id', firstModulo.modulo_id)
              .single();
            
            return {
              ...mat,
              course: moduloData?.course,
            };
          }
          return mat;
        })
      );

      setStudentMatriculas(matriculasConCursos);
    } catch (error: any) {
      console.error('Error al cargar matrículas:', error);
      setStudentMatriculas([]);
    }
  };

  const handleEstudianteChange = (estudianteId: string) => {
    setFormData({ ...formData, estudiante_id: estudianteId, course_id: '' });
    setStudentMatriculas([]);
    if (estudianteId) {
      fetchMatriculasEstudiante(estudianteId);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      tipo_material: 'book',
      estudiante_id: '',
      course_id: '',
      monto: 0,
      moneda_material: 'PEN',
    });
    setStudentSearch('');
    setStudentMatriculas([]);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.estudiante_id || !formData.course_id || !currentUser) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.monto || formData.monto <= 0) {
      toast({
        title: 'Error',
        description: 'Debe ingresar un monto válido (mayor a 0)',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Verificar si ya existe un registro del mismo tipo de material para este estudiante y edición
      const { data: existingMaterials, error: checkError } = await supabase
        .from('registro_compra_materiales' as any)
        .select('id, tipo_material, nombre')
        .eq('estudiante_id', formData.estudiante_id)
        .eq('course_id', formData.course_id)
        .eq('tipo_material', formData.tipo_material);

      if (checkError) throw checkError;

      if (existingMaterials && existingMaterials.length > 0) {
        const materialType = formData.tipo_material === 'book' ? 'Book' : 'Kit';
        toast({
          title: 'Material duplicado',
          description: `El estudiante ya tiene un registro de ${materialType} para esta edición. No se pueden registrar materiales duplicados por edición.`,
          variant: 'destructive',
        });
        return;
      }

      // Obtener información del curso
      const selectedCourse = courses.find(c => c.id === formData.course_id);
      const materialName = formData.tipo_material === 'book' 
        ? `Book - ${selectedCourse?.name || 'Material de curso'}`
        : `Kit - ${selectedCourse?.name || 'Material de curso'}`;

      const dataToSave = {
        nombre: materialName,
        tipo_material: formData.tipo_material,
        estudiante_id: formData.estudiante_id,
        course_id: formData.course_id,
        monto: formData.monto,
        moneda_material: formData.moneda_material,
        usuario_id: currentUser.id,
        estado_pago: 'pendiente',
        fecha_pago: null,
      };

      const { error } = await supabase
        .from('registro_compra_materiales' as any)
        .insert(dataToSave);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Material registrado correctamente con estado pendiente',
      });

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al registrar material: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateEstado = async (id: string, estado: 'pendiente' | 'pagado' | 'cancelado') => {
    try {
      const updateData: any = { estado_pago: estado };
      if (estado === 'pagado') {
        updateData.fecha_pago = new Date().toISOString();
      }

      const { error } = await supabase
        .from('registro_compra_materiales' as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Estado actualizado correctamente',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al actualizar estado: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  // Filtrar materiales por curso
  const filteredMateriales = materiales.filter(material => {
    if (filterCourse === 'all') return true;
    return material.course_id === filterCourse;
  });

  // Estadísticas
  const stats = {
    total: filteredMateriales.length,
    books: filteredMateriales.filter(m => m.tipo_material === 'book').length,
    kits: filteredMateriales.filter(m => m.tipo_material === 'kit').length,
    pagados: filteredMateriales.filter(m => m.estado_pago === 'pagado').length,
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  Gestión de Materiales
                </CardTitle>
                <CardDescription>
                  Registro de compras de books y kits por estudiante
                </CardDescription>
              </div>
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Material
              </Button>
            </div>
            
            {/* Estadísticas */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500">Total Materiales</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-600">Books</div>
                <div className="text-2xl font-bold text-blue-600">{stats.books}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-xs text-purple-600">Kits</div>
                <div className="text-2xl font-bold text-purple-600">{stats.kits}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-xs text-green-600">Pagados</div>
                <div className="text-2xl font-bold text-green-600">{stats.pagados}</div>
              </div>
            </div>

            {/* Filtro por curso */}
            <div className="flex items-center gap-4 mt-4">
              <Label htmlFor="filter-course" className="text-sm font-medium">
                Filtrar por Curso (Edición):
              </Label>
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger id="filter-course" className="w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterCourse !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFilterCourse('all')}
                >
                  Limpiar filtro
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMateriales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No se encontraron materiales
                        {filterCourse !== 'all' && ' para el curso seleccionado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMateriales.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        {material.estudiante
                          ? `${material.estudiante.first_name} ${material.estudiante.last_name}`
                          : '-'}
                      </TableCell>
                      <TableCell>{material.nombre}</TableCell>
                      <TableCell>
                        <Badge variant={material.tipo_material === 'book' ? 'default' : 'secondary'}>
                          {material.tipo_material === 'book' ? (
                            <><BookOpen className="h-3 w-3 mr-1" /> Book</>
                          ) : (
                            <><Package className="h-3 w-3 mr-1" /> Kit</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {material.course?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="mr-1">
                          {material.moneda_material || 'PEN'}
                        </Badge>
                        {material.monto ? material.monto.toFixed(2) : '0.00'}
                      </TableCell>
                      <TableCell>
                        {material.tipo_material === 'kit' ? (
                          <Badge variant="default">
                            Pagado
                          </Badge>
                        ) : (
                          <Select
                            value={material.estado_pago}
                            onValueChange={(value: any) => handleUpdateEstado(material.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="pagado">Pagado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(material.fecha_registro).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {material.fecha_pago && (
                          <span className="text-xs text-gray-500">
                            Pagado: {new Date(material.fecha_pago).toLocaleDateString()}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de registro */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Compra de Material</DialogTitle>
              <DialogDescription>
                Registre la compra posterior de un libro o kit para un estudiante matriculado
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Búsqueda de estudiante */}
              <div className="space-y-2">
                <Label>Buscar Estudiante *</Label>
                <div className="flex gap-2">
                  <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nombre">Nombre</SelectItem>
                      <SelectItem value="codigo">Código</SelectItem>
                      <SelectItem value="dni">DNI</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={`Buscar por ${searchType}...`}
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estudiante_id">Seleccionar Estudiante *</Label>
                <Select
                  value={formData.estudiante_id}
                  onValueChange={handleEstudianteChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No se encontraron estudiantes</div>
                    ) : (
                      filteredStudents.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name}
                          {student.student_code && ` (${student.student_code})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.estudiante_id && (
                <div className="space-y-2">
                  <Label htmlFor="course_id">Edición (según matrículas) *</Label>
                  <Select
                    value={formData.course_id}
                    onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una edición" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentMatriculas.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">El estudiante no tiene matrículas</div>
                      ) : (
                        studentMatriculas.map((matricula) => (
                          <SelectItem key={matricula.id} value={matricula.course?.id || matricula.id}>
                            {matricula.course?.name || 'Sin nombre'} - {matricula.cod_matricula}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tipo_material">Tipo de Material *</Label>
                <Select
                  value={formData.tipo_material}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo_material: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="book">Book</SelectItem>
                    <SelectItem value="kit">Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moneda_material">Moneda *</Label>
                  <Select
                    value={formData.moneda_material}
                    onValueChange={(value: any) => setFormData({ ...formData, moneda_material: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEN">PEN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto *</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Estado:</strong> El material se registrará con estado <strong>Pendiente</strong>. Puede actualizarlo posteriormente desde la tabla.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
