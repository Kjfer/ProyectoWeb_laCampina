import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  MatriculaFormData,
  Modulo,
  ModuloMatriculado,
  CursoGrabado,
  Course,
  CourseEnrollmentInsert,
  RegistroCompraMaterialInsert,
  VentaCursoGrabadoInsert,
  PagoInsert,
  generateMatriculaCode,
  calculatePrecioFinal,
  MONEDAS,
  METODOS_PAGO,
  TIPOS_PAGO,
} from '@/integrations/supabase/peri-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Save, UserPlus, Plus, Minus, DollarSign } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_code?: string;
  document_number?: string;
}

interface ModuloConCurso extends Modulo {
  course?: Course;
}

export default function AdminMatriculaForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Profile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Profile[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchType, setSearchType] = useState<'codigo' | 'dni'>('codigo');
  const [courses, setCourses] = useState<Course[]>([]);
  const [modulos, setModulos] = useState<ModuloConCurso[]>([]);
  const [cursosGrabados, setCursosGrabados] = useState<CursoGrabado[]>([]);
  const [selectedModulos, setSelectedModulos] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState<MatriculaFormData>({
    estudiante_id: '',
    student_code: '',
    modulos_seleccionados: [],
    valor_matricula: 0,
    descuento: 0,
    moneda: 'PEN',
    incluir_clases_grabadas: false,
    id_clases_grabadas: undefined,
    valor_clase_grabada: 0,
    book_incluido: false,
    kit_incluido: false,
    observaciones: '',
    registrar_pago_inicial: false,
    tipo_pago: 'primera_cuota',
    monto_pago: 0,
    metodo_pago: 'efectivo',
    fecha_pago: new Date().toISOString().split('T')[0],
    comprobante: '',
  });

  const [precioFinal, setPrecioFinal] = useState(0);

  useEffect(() => {
    fetchInitialData();
    getCurrentUser();
  }, []);

  useEffect(() => {
    // Calcular precio final cuando cambien los valores
    const precio = calculatePrecioFinal(
      formData.valor_matricula,
      formData.incluir_clases_grabadas ? formData.valor_clase_grabada || 0 : 0,
      formData.descuento
    );
    setPrecioFinal(precio);
  }, [formData.valor_matricula, formData.valor_clase_grabada, formData.descuento, formData.incluir_clases_grabadas]);

  useEffect(() => {
    // Filtrar estudiantes según búsqueda
    if (!studentSearch.trim()) {
      setFilteredStudents(students);
      return;
    }

    const searchLower = studentSearch.toLowerCase();
    const filtered = students.filter(student => {
      if (searchType === 'codigo') {
        return student.student_code?.toLowerCase().includes(searchLower);
      } else {
        return student.document_number?.toLowerCase().includes(searchLower);
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

  const fetchInitialData = async () => {
    try {
      // Cargar estudiantes
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, student_code, document_number')
        .eq('role', 'student')
        .order('first_name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
      setFilteredStudents(studentsData || []);

      // Cargar ediciones activas
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (coursesError) throw coursesError;

      // Cargar módulos activos
      const { data: modulosData, error: modulosError } = await supabase
        .from('modulos' as any)
        .select(`
          *,
          course:courses(*)
        `)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (modulosError) throw modulosError;

      // Cargar cursos grabados
      const { data: grabadosData, error: grabadosError } = await supabase
        .from('cursos_grabados')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (grabadosError) throw grabadosError;

      setCourses(coursesData || []);
      setModulos(modulosData || []);
      setCursosGrabados(grabadosData || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al cargar datos: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleEstudianteChange = (estudianteId: string) => {
    const student = students.find(s => s.id === estudianteId);
    setFormData({
      ...formData,
      estudiante_id: estudianteId,
      student_code: student?.student_code || '',
    });
  };

  const handleModuloToggle = (moduloId: string) => {
    const newSelected = selectedModulos.includes(moduloId)
      ? selectedModulos.filter(id => id !== moduloId)
      : [...selectedModulos, moduloId];
    
    setSelectedModulos(newSelected);
    setFormData({ ...formData, modulos_seleccionados: newSelected });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.estudiante_id) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un estudiante',
        variant: 'destructive',
      });
      return;
    }

    if (selectedModulos.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar al menos un módulo',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'Usuario no identificado',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // 1. Obtener el último número de matrícula del año
      const currentYear = new Date().getFullYear();
      const { data: lastMatricula } = await supabase
        .from('matriculas' as any)
        .select('cod_matricula')
        .like('cod_matricula', `MAT-${currentYear}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let sequential = 1;
      if (lastMatricula) {
        const parts = lastMatricula.cod_matricula.split('-');
        sequential = parseInt(parts[2]) + 1;
      }

      const codMatricula = generateMatriculaCode(currentYear, sequential);

      // 2. Preparar datos de módulos matriculados
      const modulosMatriculados: ModuloMatriculado[] = selectedModulos.map(modId => {
        const modulo = modulos.find(m => m.id === modId)!;
        return {
          modulo_id: modulo.id,
          nombre: modulo.name,
          code: modulo.code,
          course_name: modulo.course?.name,
          start_date: modulo.start_date,
          end_date: modulo.end_date,
        };
      });

      // 3. Contar ediciones únicas
      const uniqueCourses = new Set(
        selectedModulos.map(modId => {
          const modulo = modulos.find(m => m.id === modId);
          return modulo?.course_id;
        })
      );

      // 4. Insertar matrícula
      const matriculaData = {
        cod_matricula: codMatricula,
        estudiante_id: formData.estudiante_id,
        student_code: formData.student_code,
        usuario_id: currentUser.id,
        modulos_matriculados: modulosMatriculados,
        num_cursos: uniqueCourses.size,
        moneda_monto: formData.moneda,
        valor_matricula: formData.valor_matricula,
        descuento: formData.descuento,
        id_clases_grabadas: formData.incluir_clases_grabadas ? formData.id_clases_grabadas : null,
        valor_clase_grabada: formData.incluir_clases_grabadas ? formData.valor_clase_grabada || 0 : 0,
        book_incluido: formData.book_incluido,
        kit_incluido: formData.kit_incluido,
        precio_final: precioFinal,
        observaciones: formData.observaciones,
      };

      const { data: newMatricula, error: matriculaError } = await supabase
        .from('matriculas' as any)
        .insert(matriculaData)
        .select()
        .single();

      if (matriculaError) throw matriculaError;

      // 5. Crear enrollments para cada módulo
      for (const moduloId of selectedModulos) {
        const enrollmentData: CourseEnrollmentInsert = {
          modulo_id: moduloId,
          student_id: formData.estudiante_id,
          matricula_id: newMatricula.id,
          tipo_estudiante: 'nuevo', // Esto se puede determinar con lógica adicional
          is_active: true,
        };

        const { error: enrollError } = await supabase
          .from('course_enrollments')
          .insert(enrollmentData);

        if (enrollError) throw enrollError;
      }

      // 6. Si incluye clases grabadas, registrar venta
      if (formData.incluir_clases_grabadas && formData.id_clases_grabadas) {
        const ventaData: VentaCursoGrabadoInsert = {
          estudiante_id: formData.estudiante_id,
          usuario_id: currentUser.id,
          id_clases_grabadas: formData.id_clases_grabadas,
          valor_venta: formData.valor_clase_grabada || 0,
          matricula_id: newMatricula.id,
        };

        const { error: ventaError } = await supabase
          .from('venta_cursos_grabados')
          .insert(ventaData);

        if (ventaError) throw ventaError;
      }

      // 7. Registrar compra de materiales
      // Para books: siempre se registra
      const courseId = modulos.find(m => m.id === selectedModulos[0])?.course_id;
      if (courseId) {
        const bookData: RegistroCompraMaterialInsert = {
          nombre: 'Material de curso',
          tipo_material: 'book',
          usuario_id: currentUser.id,
          estudiante_id: formData.estudiante_id,
          course_id: courseId,
          estado_pago: formData.book_incluido ? 'pagado' : 'pendiente',
          fecha_pago: formData.book_incluido ? new Date().toISOString() : undefined,
        };

        const { error: bookError } = await supabase
          .from('registro_compra_materiales')
          .insert(bookData);

        if (bookError) throw bookError;

        // Para kits: solo si está incluido
        if (formData.kit_incluido) {
          const kitData: RegistroCompraMaterialInsert = {
            nombre: 'Kit de curso',
            tipo_material: 'kit',
            usuario_id: currentUser.id,
            estudiante_id: formData.estudiante_id,
            course_id: courseId,
            estado_pago: 'pagado',
            fecha_pago: new Date().toISOString(),
          };

          const { error: kitError } = await supabase
            .from('registro_compra_materiales')
            .insert(kitData);

          if (kitError) throw kitError;
        }
      }

      // 8. Si se registra pago inicial
      if (formData.registrar_pago_inicial && formData.monto_pago && formData.monto_pago > 0) {
        const pagoData: PagoInsert = {
          codigo_producto: codMatricula,
          categoria_producto: 'matricula',
          comprobante: formData.comprobante,
          monto_pago: formData.monto_pago,
          fecha_pago: formData.fecha_pago || new Date().toISOString().split('T')[0],
          metodo_pago: formData.metodo_pago!,
          moneda_pago: formData.moneda,
          estado_pago: formData.tipo_pago!,
          usuario_id: currentUser.id,
          estudiante_id: formData.estudiante_id,
        };

        const { error: pagoError } = await supabase
          .from('peri_pagos')
          .insert(pagoData);

        if (pagoError) throw pagoError;
      }

      toast({
        title: 'Éxito',
        description: `Matrícula ${codMatricula} registrada correctamente`,
      });

      navigate('/admin/matriculas');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al registrar matrícula: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Agrupar módulos por edición
  const modulosPorCurso = courses.map(course => ({
    course,
    modulos: modulos.filter(m => m.course_id === course.id),
  })).filter(group => group.modulos.length > 0);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-6xl">
        <Card>
          <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Nueva Matrícula
          </CardTitle>
          <CardDescription>
            Registre la matrícula de un estudiante en módulos de ediciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. DATOS DEL ESTUDIANTE */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. Datos del Estudiante</h3>
              
              {/* Búsqueda de estudiante */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label>Buscar por:</Label>
                  <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="codigo">Código de Estudiante</SelectItem>
                      <SelectItem value="dni">DNI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>
                    {searchType === 'codigo' ? 'Código de Estudiante' : 'Número de DNI'}
                  </Label>
                  <Input
                    placeholder={searchType === 'codigo' ? 'Buscar por código...' : 'Buscar por DNI...'}
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  {studentSearch && (
                    <p className="text-sm text-gray-500">
                      {filteredStudents.length} estudiante(s) encontrado(s)
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estudiante_id">Estudiante *</Label>
                  <Select
                    value={formData.estudiante_id}
                    onValueChange={handleEstudianteChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un estudiante" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} - {student.student_code || 'Sin código'}
                        </SelectItem>
                      ))}
                      {filteredStudents.length === 0 && (
                        <SelectItem value="" disabled>
                          No se encontraron estudiantes
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student_code">Código Estudiante</Label>
                  <Input
                    id="student_code"
                    value={formData.student_code}
                    disabled
                    placeholder="Se completa automáticamente"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 2. SELECCIÓN DE MÓDULOS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Seleccionar Módulos *</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                {modulosPorCurso.map(({ course, modulos: courseModulos }) => (
                  <div key={course.id} className="space-y-2">
                    <div className="font-medium text-sm bg-gray-50 p-2 rounded">
                      {course.name} ({course.code})
                    </div>
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {courseModulos.map((modulo) => (
                        <div key={modulo.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={modulo.id}
                            checked={selectedModulos.includes(modulo.id)}
                            onCheckedChange={() => handleModuloToggle(modulo.id)}
                          />
                          <Label
                            htmlFor={modulo.id}
                            className="text-sm font-normal cursor-pointer"
                          >
                            M{modulo.num_modulo}: {modulo.name}
                            <span className="text-xs text-gray-500 ml-2">
                              ({new Date(modulo.start_date).toLocaleDateString()})
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                Módulos seleccionados: {selectedModulos.length}
              </div>
            </div>

            <Separator />

            {/* 3. VALORES Y COSTOS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Valores y Costos</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moneda">Moneda</Label>
                  <Select
                    value={formData.moneda}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, moneda: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONEDAS.map((moneda) => (
                        <SelectItem key={moneda} value={moneda}>
                          {moneda}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_matricula">Valor Matrícula *</Label>
                  <Input
                    id="valor_matricula"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_matricula}
                    onChange={(e) =>
                      setFormData({ ...formData, valor_matricula: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descuento">Descuento</Label>
                  <Input
                    id="descuento"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.descuento}
                    onChange={(e) =>
                      setFormData({ ...formData, descuento: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Clases Grabadas */}
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="incluir_clases_grabadas"
                    checked={formData.incluir_clases_grabadas}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, incluir_clases_grabadas: checked })
                    }
                  />
                  <Label htmlFor="incluir_clases_grabadas">
                    Incluir Clases Grabadas (promoción)
                  </Label>
                </div>

                {formData.incluir_clases_grabadas && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="id_clases_grabadas">Curso Grabado</Label>
                      <Select
                        value={formData.id_clases_grabadas}
                        onValueChange={(value) =>
                          setFormData({ ...formData, id_clases_grabadas: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent>
                          {cursosGrabados.map((curso) => (
                            <SelectItem key={curso.id} value={curso.id}>
                              {curso.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor_clase_grabada">Valor (opcional)</Label>
                      <Input
                        id="valor_clase_grabada"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valor_clase_grabada}
                        onChange={(e) =>
                          setFormData({ ...formData, valor_clase_grabada: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Materiales */}
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="book_incluido"
                    checked={formData.book_incluido}
                    onCheckedChange={(checked: boolean) =>
                      setFormData({ ...formData, book_incluido: checked })
                    }
                  />
                  <Label htmlFor="book_incluido">Incluye Libro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="kit_incluido"
                    checked={formData.kit_incluido}
                    onCheckedChange={(checked: boolean) =>
                      setFormData({ ...formData, kit_incluido: checked })
                    }
                  />
                  <Label htmlFor="kit_incluido">Incluye Kit</Label>
                </div>
              </div>

              {/* Precio Final */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Precio Final:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formData.moneda} {precioFinal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* 4. PAGO INICIAL (OPCIONAL) */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="registrar_pago_inicial"
                  checked={formData.registrar_pago_inicial}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, registrar_pago_inicial: checked })
                  }
                />
                <Label htmlFor="registrar_pago_inicial" className="text-lg font-semibold">
                  4. Registrar Pago Inicial
                </Label>
              </div>

              {formData.registrar_pago_inicial && (
                <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_pago">Tipo de Pago</Label>
                    <Select
                      value={formData.tipo_pago}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, tipo_pago: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_PAGO.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monto_pago">Monto del Pago</Label>
                    <Input
                      id="monto_pago"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monto_pago}
                      onChange={(e) =>
                        setFormData({ ...formData, monto_pago: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metodo_pago">Método de Pago</Label>
                    <Select
                      value={formData.metodo_pago}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, metodo_pago: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METODOS_PAGO.map((metodo) => (
                          <SelectItem key={metodo} value={metodo}>
                            {metodo.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha_pago">Fecha de Pago</Label>
                    <Input
                      id="fecha_pago"
                      type="date"
                      value={formData.fecha_pago}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha_pago: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="comprobante">Número de Comprobante</Label>
                    <Input
                      id="comprobante"
                      value={formData.comprobante}
                      onChange={(e) =>
                        setFormData({ ...formData, comprobante: e.target.value })
                      }
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* 5. OBSERVACIONES */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) =>
                  setFormData({ ...formData, observaciones: e.target.value })
                }
                rows={3}
                placeholder="Notas adicionales sobre la matrícula..."
              />
            </div>

            {/* BOTONES */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/matriculas')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Guardando...' : 'Registrar Matrícula'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
