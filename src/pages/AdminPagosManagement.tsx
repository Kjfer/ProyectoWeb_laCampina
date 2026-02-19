import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatSimpleDate, getTodayInPeru } from '@/lib/dateUtils.ts';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Pago,
  PagoWithRelations,
  PagoFormData,
  PagoInsert,
  CuotaMatricula,
  MONEDAS,
  METODOS_PAGO,
  TIPOS_PAGO,
  CATEGORIAS_PRODUCTO,
} from '@/integrations/supabase/peri-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from '@/hooks/use-toast';
import { Plus, DollarSign, Filter, Calendar, FileText } from 'lucide-react';

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
}

interface ProductoDisponible {
  codigo: string;
  descripcion: string;
  estudiante_id: string;
  estudiante_nombre: string;
  monto?: number;
  moneda?: string;
}

export default function AdminPagosManagement() {
  const [pagos, setPagos] = useState<PagoWithRelations[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoDisponible[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [searchProducto, setSearchProducto] = useState('');
  const [showProductoDropdown, setShowProductoDropdown] = useState(false);
  const [cuotasMatricula, setCuotasMatricula] = useState<CuotaMatricula[]>([]);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<string | null>(null);
  const [matriculasPorCurso, setMatriculasPorCurso] = useState<Map<string, string[]>>(new Map());
  const [materialesPorCurso, setMaterialesPorCurso] = useState<Map<string, string>>(new Map());
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  
  const [filters, setFilters] = useState({
    categoria: 'all',
    estado: 'all',
    estudiante: 'all',
    curso: 'all',
  });

  const [formData, setFormData] = useState<PagoFormData>({
    categoria_producto: 'matricula',
    codigo_producto: '',
    estudiante_id: '',
    monto_pago: 0,
    fecha_pago: getTodayInPeru(),
    metodo_pago: 'En efectivo',
    moneda_pago: 'PEN',
    estado_pago: 'pago_regular',
    comprobante: '',
    observaciones: '',
  });

  useEffect(() => {
    getCurrentUser();
    fetchPagos();
    fetchStudents();
    fetchCourses();
    fetchMatriculasConModulos();
    fetchMaterialesConCursos();
  }, []);

  // Resetear estado_pago a 'pago_regular' si se cambia a categoría diferente de matricula
  useEffect(() => {
    if (formData.categoria_producto !== 'matricula' && formData.estado_pago !== 'pago_regular') {
      setFormData(prev => ({ ...prev, estado_pago: 'pago_regular' }));
    }
  }, [formData.categoria_producto]);

  useEffect(() => {
    // Cerrar dropdown al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#codigo_producto') && !target.closest('.producto-dropdown')) {
        setShowProductoDropdown(false);
      }
    };

    if (showProductoDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProductoDropdown]);

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

  const fetchPagos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pagos' as any)
        .select(`
          *,
          estudiante:profiles!pagos_estudiante_id_fkey(id, first_name, last_name, email),
          usuario:profiles!pagos_usuario_id_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPagos(data as any || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al cargar pagos: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'student')
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      // Cargar cursos que tienen módulos activos
      const { data: modulosData, error: modulosError } = await supabase
        .from('modulos')
        .select('course_id, courses(id, name, code)')
        .eq('is_active', true);

      if (modulosError) throw modulosError;

      // Extraer cursos únicos
      const coursesMap = new Map();
      modulosData?.forEach((modulo: any) => {
        if (modulo.courses && !coursesMap.has(modulo.courses.id)) {
          coursesMap.set(modulo.courses.id, {
            id: modulo.courses.id,
            name: modulo.courses.name,
            code: modulo.courses.code,
          });
        }
      });

      const uniqueCourses = Array.from(coursesMap.values()) as Course[];
      uniqueCourses.sort((a, b) => a.name.localeCompare(b.name));
      
      setCourses(uniqueCourses);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchMatriculasConModulos = async () => {
    try {
      // Obtener todas las matrículas con sus enrollments
      const { data: matriculas, error } = await supabase
        .from('matriculas' as any)
        .select('cod_matricula, estudiante_id');

      if (error) throw error;

      // Para cada matrícula, obtener los módulos enrollados
      const matriculasCursoMap = new Map<string, string[]>();

      for (const matricula of matriculas || []) {
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('modulo_id, modulos!course_enrollments_modulo_id_fkey(course_id)')
          .eq('student_id', matricula.estudiante_id);

        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments
            .map((e: any) => e.modulos?.course_id)
            .filter((id: any) => id);

          if (courseIds.length > 0) {
            matriculasCursoMap.set(matricula.cod_matricula, courseIds);
          }
        }
      }

      setMatriculasPorCurso(matriculasCursoMap);
    } catch (error: any) {
      console.error('Error fetching matriculas con modulos:', error);
    }
  };

  const fetchMaterialesConCursos = async () => {
    try {
      // Obtener todos los materiales registrados con su course_id
      const { data: materiales, error } = await supabase
        .from('registro_compra_materiales')
        .select('codigo_material, course_id');

      if (error) throw error;

      // Crear un mapa: codigo_material -> course_id
      const materialesCursoMap = new Map<string, string>();

      materiales?.forEach((material: any) => {
        if (material.codigo_material && material.course_id) {
          materialesCursoMap.set(material.codigo_material, material.course_id);
        }
      });

      setMaterialesPorCurso(materialesCursoMap);
    } catch (error: any) {
      console.error('Error fetching materiales con cursos:', error);
    }
  };

  const fetchProductosPorCategoria = async (categoria: string) => {
    try {
      setLoadingProductos(true);
      const productos: ProductoDisponible[] = [];

      if (categoria === 'matricula') {
        const { data, error } = await supabase
          .from('matriculas' as any)
          .select(`
            id,
            cod_matricula,
            precio_final,
            moneda_monto,
            estudiante_id,
            estudiante:profiles!matriculas_estudiante_id_fkey(id, first_name, last_name)
          `)
          .eq('estado_pago', 'pendiente')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        data?.forEach((mat: any) => {
          if (mat.estudiante) {
            productos.push({
              codigo: mat.cod_matricula,
              descripcion: `Matrícula ${mat.cod_matricula}`,
              estudiante_id: mat.estudiante_id,
              estudiante_nombre: `${mat.estudiante.first_name} ${mat.estudiante.last_name}`,
              monto: mat.precio_final,
              moneda: mat.moneda_monto,
            });
          }
        });
      } else if (categoria === 'books' || categoria === 'kits') {
        // Filtrar materiales por tipo (book o kit)
        const { data, error } = await supabase
          .from('registro_compra_materiales' as any)
          .select(`
            id,
            codigo_material,
            nombre,
            tipo_material,
            monto,
            estudiante_id,
            estudiante:profiles!registro_compra_materiales_estudiante_id_fkey(id, first_name, last_name),
            course:courses(name)
          `)
          .eq('estado_pago', 'pendiente')
          .eq('tipo_material', categoria === 'books' ? 'book' : 'kit')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        data?.forEach((mat: any) => {
          if (mat.estudiante) {
            productos.push({
              codigo: mat.codigo_material,
              descripcion: `${mat.nombre} - ${mat.course?.name || 'Sin curso'}`,
              estudiante_id: mat.estudiante_id,
              estudiante_nombre: `${mat.estudiante.first_name} ${mat.estudiante.last_name}`,
              monto: mat.monto,
              moneda: 'PEN',
            });
          }
        });
      } else if (categoria === 'clases_grabadas') {
        const { data, error } = await supabase
          .from('venta_cursos_grabados' as any)
          .select(`
            id,
            codigo_venta,
            valor_venta,
            moneda_venta,
            estudiante_id,
            estudiante:profiles!venta_cursos_grabados_estudiante_id_fkey(id, first_name, last_name),
            curso_grabado:cursos_grabados(name)
          `)
          .eq('estado_pago', 'pendiente')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        data?.forEach((venta: any) => {
          if (venta.estudiante) {
            productos.push({
              codigo: venta.codigo_venta,
              descripcion: `${venta.curso_grabado?.name || 'Curso grabado'}`,
              estudiante_id: venta.estudiante_id,
              estudiante_nombre: `${venta.estudiante.first_name} ${venta.estudiante.last_name}`,
              monto: venta.valor_venta,
              moneda: venta.moneda_venta,
            });
          }
        });
      }

      setProductosDisponibles(productos);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al cargar productos: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleCategoriaChange = (categoria: string) => {
    setFormData({ 
      ...formData, 
      categoria_producto: categoria,
      codigo_producto: '',
      estudiante_id: '',
    });
    fetchProductosPorCategoria(categoria);
  };

  const handleProductoChange = async (codigo: string) => {
    const producto = productosDisponibles.find(p => p.codigo === codigo);
    if (producto) {
      setFormData({
        ...formData,
        codigo_producto: codigo,
        estudiante_id: producto.estudiante_id,
        monto_pago: producto.monto || formData.monto_pago,
        moneda_pago: (producto.moneda as any) || formData.moneda_pago,
      });
      setSearchProducto(codigo);
      
      // Si es una matrícula, cargar sus cuotas
      if (formData.categoria_producto === 'matricula') {
        await fetchCuotasMatricula(codigo);
      }
    } else {
      setFormData({
        ...formData,
        codigo_producto: codigo,
      });
      setSearchProducto(codigo);
      setCuotasMatricula([]);
      setCuotaSeleccionada(null);
    }
    setShowProductoDropdown(false);
  };

  const fetchCuotasMatricula = async (codMatricula: string) => {
    try {
      // Obtener la matrícula
      const { data: matriculaData, error: matriculaError } = await supabase
        .from('matriculas' as any)
        .select('id')
        .eq('cod_matricula', codMatricula)
        .single();

      if (matriculaError) throw matriculaError;
      if (!matriculaData) {
        setCuotasMatricula([]);
        return;
      }

      // Obtener el plan de cuotas
      const { data: planData, error: planError } = await supabase
        .from('plan_cuotas_matricula' as any)
        .select('id')
        .eq('matricula_id', matriculaData.id)
        .single();

      if (planError || !planData) {
        setCuotasMatricula([]);
        return;
      }

      // Obtener las cuotas
      const { data: cuotasData, error: cuotasError } = await supabase
        .from('cuotas_matricula' as any)
        .select('*')
        .eq('plan_cuotas_id', planData.id)
        .order('numero_cuota');

      if (cuotasError) throw cuotasError;

      setCuotasMatricula(cuotasData || []);
      
      // Auto-seleccionar la primera cuota pendiente
      const primeraCuotaPendiente = cuotasData?.find(c => c.estado === 'pendiente' || c.estado === 'parcial');
      if (primeraCuotaPendiente) {
        setCuotaSeleccionada(primeraCuotaPendiente.id);
        setFormData(prev => ({ ...prev, monto_pago: primeraCuotaPendiente.monto_cuota - primeraCuotaPendiente.monto_pagado }));
      }
    } catch (error: any) {
      console.error('Error al cargar cuotas:', error);
      setCuotasMatricula([]);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      categoria_producto: 'matricula',
      codigo_producto: '',
      estudiante_id: '',
      monto_pago: 0,
      fecha_pago: getTodayInPeru(),
      metodo_pago: 'En efectivo',
      moneda_pago: 'PEN',
      estado_pago: 'pago_regular',
      comprobante: '',
      observaciones: '',
    });
    setSearchProducto('');
    setShowProductoDropdown(false);
    setProductosDisponibles([]);
    setCuotasMatricula([]);
    setCuotaSeleccionada(null);
    setComprobanteFile(null);
    fetchProductosPorCategoria('matricula');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCuotasMatricula([]);
    setCuotaSeleccionada(null);
    setComprobanteFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.codigo_producto || !formData.monto_pago || !formData.estudiante_id) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos obligatorios (categoría, código, estudiante y monto)',
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
      let comprobanteUrl = formData.comprobante;

      // Si hay un archivo de comprobante, subirlo primero
      if (comprobanteFile) {
        setUploadingComprobante(true);
        const fileExt = comprobanteFile.name.split('.').pop();
        const fileName = `${Date.now()}_${formData.estudiante_id}_${formData.codigo_producto}.${fileExt}`;
        const filePath = `${formData.estudiante_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-receipts')
          .upload(filePath, comprobanteFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payment-receipts')
          .getPublicUrl(filePath);

        comprobanteUrl = urlData.publicUrl;
        setUploadingComprobante(false);
      }

      const pagoData: PagoInsert = {
        ...formData,
        comprobante: comprobanteUrl,
        usuario_id: currentUser.id,
        estudiante_id: formData.estudiante_id || null,
        cuota_id: cuotaSeleccionada || null,
      };

      const { error } = await supabase
        .from('pagos' as any)
        .insert(pagoData);

      if (error) throw error;

      // Si hay una cuota seleccionada, actualizar su monto pagado
      if (cuotaSeleccionada) {
        const cuota = cuotasMatricula.find(c => c.id === cuotaSeleccionada);
        if (cuota) {
          const nuevoMontoPagado = cuota.monto_pagado + formData.monto_pago;
          
          const { error: updateError } = await supabase
            .from('cuotas_matricula' as any)
            .update({ monto_pagado: nuevoMontoPagado })
            .eq('id', cuotaSeleccionada);

          if (updateError) {
            console.error('Error actualizando cuota:', updateError);
          }
        }
      }

      toast({
        title: 'Éxito',
        description: 'Pago registrado correctamente',
      });

      handleCloseDialog();
      fetchPagos();
      
      // Recargar materiales si el pago es de tipo material
      if (formData.categoria_producto === 'kits' || formData.categoria_producto === 'books') {
        fetchMaterialesConCursos();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al registrar pago: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  // Filtrar pagos
  const filteredPagos = pagos.filter(pago => {
    if (filters.categoria !== 'all' && pago.categoria_producto !== filters.categoria) return false;
    if (filters.estado !== 'all' && pago.estado_pago !== filters.estado) return false;
    if (filters.estudiante !== 'all' && pago.estudiante_id !== filters.estudiante) return false;
    
    // Filtro por curso
    if (filters.curso !== 'all') {
      if (pago.categoria_producto === 'matricula') {
        // Para matrículas: verificar si está relacionado con el curso
        const cursoIds = matriculasPorCurso.get(pago.codigo_producto);
        if (!cursoIds || !cursoIds.includes(filters.curso)) {
          return false;
        }
      } else if (pago.categoria_producto === 'kits' || pago.categoria_producto === 'books') {
        // Para materiales (kits/books): verificar si el material pertenece al curso
        const courseId = materialesPorCurso.get(pago.codigo_producto);
        if (!courseId || courseId !== filters.curso) {
          return false;
        }
      } else {
        // Para otros tipos de pago (clases_grabadas), no mostrar cuando se filtra por curso
        return false;
      }
    }
    
    return true;
  });

  // Estadísticas
  const totalMonto = filteredPagos.reduce((sum, pago) => {
    // Convertir todo a PEN para el total (simplificado)
    return sum + pago.monto_pago;
  }, 0);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Gestión de Pagos
              </CardTitle>
              <CardDescription>
                Registro y seguimiento de todos los pagos
              </CardDescription>
            </div>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Pago
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4" />
              <span className="font-semibold">Filtros</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={filters.categoria}
                  onValueChange={(value) =>
                    setFilters({ ...filters, categoria: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {CATEGORIAS_PRODUCTO.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === 'matricula' ? 'Matrícula' : 
                         cat === 'kits' ? 'Kit' : 
                         cat === 'books' ? 'Book' :
                         'Clases Grabadas'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={filters.estado}
                  onValueChange={(value) =>
                    setFilters({ ...filters, estado: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {TIPOS_PAGO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estudiante</Label>
                <Select
                  value={filters.estudiante}
                  onValueChange={(value) =>
                    setFilters({ ...filters, estudiante: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Curso</Label>
                <Select
                  value={filters.curso}
                  onValueChange={(value) =>
                    setFilters({ ...filters, curso: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los cursos</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} - {course.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Pagos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredPagos.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Monto Total (PEN)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">S/ {totalMonto.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Último Pago</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {filteredPagos.length > 0
                    ? formatDate(filteredPagos[0].fecha_pago)
                    : '-'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Pagos */}
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Código Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPagos.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell>
                      {formatDate(pago.fecha_pago)}
                    </TableCell>
                    <TableCell className="font-medium">{pago.codigo_producto}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          pago.categoria_producto === 'matricula'
                            ? 'bg-blue-100 text-blue-800'
                            : pago.categoria_producto === 'books'
                            ? 'bg-green-100 text-green-800'
                            : pago.categoria_producto === 'kits'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {pago.categoria_producto.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {pago.estudiante
                        ? `${pago.estudiante.first_name} ${pago.estudiante.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {pago.moneda_pago} {pago.monto_pago.toFixed(2)}
                    </TableCell>
                    <TableCell>{pago.metodo_pago.toUpperCase()}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          pago.estado_pago === 'pago_regular'
                            ? 'bg-green-100 text-green-800'
                            : pago.estado_pago === 'primera_cuota'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {pago.estado_pago.replace('_', ' ').toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {pago.comprobante ? (
                        <a 
                          href={pago.comprobante} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          Ver comprobante
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para registrar pago */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Registrar Nuevo Pago
            </DialogTitle>
            <DialogDescription>
              Complete los datos del pago recibido
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sección 1: Información del Producto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">1. Información del Producto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoria_producto">Categoría *</Label>
                    <Select
                      value={formData.categoria_producto}
                      onValueChange={handleCategoriaChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS_PRODUCTO.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat === 'matricula' ? 'Pago de Matrícula' : 
                             cat === 'kits' ? 'Pago de Kit' : 
                             cat === 'books' ? 'Pago de Book' :
                             'Pago de Clases Grabadas'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estudiante_id">Estudiante *</Label>
                    <Select
                      value={formData.estudiante_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, estudiante_id: value })
                      }
                      disabled={!formData.codigo_producto}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Se autocompletará" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.first_name} {student.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.estudiante_id && (
                      <p className="text-xs text-green-600">
                        ✓ Autocompletado del producto
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo_producto">Código del Producto *</Label>
                  {loadingProductos ? (
                    <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded">Cargando productos...</div>
                  ) : (
                    <div className="relative">
                      <Input
                        id="codigo_producto"
                        placeholder="Escriba para buscar código (ej: MAT-2026-00001)..."
                        value={searchProducto}
                        onChange={(e) => {
                          setSearchProducto(e.target.value);
                          setShowProductoDropdown(true);
                        }}
                        onFocus={() => setShowProductoDropdown(true)}
                        className="pr-10"
                      />
                      {searchProducto && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchProducto('');
                            setFormData({ 
                              ...formData, 
                              codigo_producto: '',
                              estudiante_id: '',
                            });
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                      
                      {/* Dropdown con resultados filtrados */}
                      {showProductoDropdown && searchProducto && (
                        <div className="producto-dropdown absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                          {productosDisponibles
                            .filter(p => 
                              p.codigo.toLowerCase().includes(searchProducto.toLowerCase()) ||
                              p.descripcion.toLowerCase().includes(searchProducto.toLowerCase()) ||
                              p.estudiante_nombre.toLowerCase().includes(searchProducto.toLowerCase())
                            )
                            .slice(0, 10)
                            .map((producto) => (
                              <div
                                key={producto.codigo}
                                onClick={() => handleProductoChange(producto.codigo)}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{producto.codigo}</span>
                                  <span className="text-xs text-gray-500">
                                    {producto.descripcion}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {producto.estudiante_nombre}
                                  </span>
                                </div>
                              </div>
                            ))
                          }
                          {productosDisponibles.filter(p => 
                            p.codigo.toLowerCase().includes(searchProducto.toLowerCase()) ||
                            p.descripcion.toLowerCase().includes(searchProducto.toLowerCase()) ||
                            p.estudiante_nombre.toLowerCase().includes(searchProducto.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                              No se encontraron resultados
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Seleccione la categoría para ver productos disponibles
                  </p>
                  {formData.codigo_producto && (
                    <p className="text-xs text-green-600">
                      ✓ Producto seleccionado: {formData.codigo_producto}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sección de Cuotas (solo para matrículas) */}
            {formData.categoria_producto === 'matricula' && cuotasMatricula.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Cuotas de la Matrícula</CardTitle>
                  <CardDescription>Seleccione la cuota a la que desea aplicar el pago</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cuotasMatricula.map((cuota) => {
                      const saldoPendiente = cuota.monto_cuota - cuota.monto_pagado;
                      const isPendiente = cuota.estado === 'pendiente' || cuota.estado === 'parcial';
                      
                      return (
                        <div
                          key={cuota.id}
                          onClick={() => {
                            if (isPendiente) {
                              setCuotaSeleccionada(cuota.id);
                              setFormData(prev => ({ ...prev, monto_pago: saldoPendiente }));
                            }
                          }}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            cuotaSeleccionada === cuota.id
                              ? 'border-blue-500 bg-blue-50'
                              : cuota.estado === 'pagado'
                              ? 'border-green-200 bg-green-50 opacity-60 cursor-not-allowed'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Cuota {cuota.numero_cuota}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  cuota.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                                  cuota.estado === 'parcial' ? 'bg-yellow-100 text-yellow-700' :
                                  cuota.estado === 'vencido' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {cuota.estado.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <div>Vence: {formatSimpleDate(cuota.fecha_vencimiento)}</div>
                                <div>Monto: {formData.moneda_pago} {cuota.monto_cuota.toFixed(2)}</div>
                                {cuota.monto_pagado > 0 && (
                                  <div className="text-green-600">
                                    Pagado: {formData.moneda_pago} {cuota.monto_pagado.toFixed(2)}
                                  </div>
                                )}
                                {saldoPendiente > 0 && (
                                  <div className="text-orange-600 font-medium">
                                    Saldo: {formData.moneda_pago} {saldoPendiente.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                            {cuotaSeleccionada === cuota.id && (
                              <div className="text-blue-600">
                                ✓
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {cuotaSeleccionada && (
                    <p className="text-xs text-green-600 mt-3">
                      ✓ Cuota seleccionada. El monto del pago se actualizará automáticamente.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sección 2: Detalles del Pago */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">2. Detalles del Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monto_pago">Monto *</Label>
                    <Input
                      id="monto_pago"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monto_pago}
                      onChange={(e) =>
                        setFormData({ ...formData, monto_pago: parseFloat(e.target.value) || 0 })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moneda_pago">Moneda *</Label>
                    <Select
                      value={formData.moneda_pago}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, moneda_pago: value })
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
                    <Label htmlFor="fecha_pago">Fecha *</Label>
                    <Input
                      id="fecha_pago"
                      type="date"
                      value={formData.fecha_pago}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha_pago: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="metodo_pago">Método de Pago *</Label>
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
                            {metodo.charAt(0).toUpperCase() + metodo.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado_pago">Estado del Pago *</Label>
                    <Select
                      value={formData.estado_pago}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, estado_pago: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.categoria_producto === 'matricula' ? (
                          // Para matrículas: mostrar todas las opciones de pago
                          TIPOS_PAGO.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo.replace('_', ' ').charAt(0).toUpperCase() + tipo.replace('_', ' ').slice(1)}
                            </SelectItem>
                          ))
                        ) : (
                          // Para materiales y cursos grabados: solo pago regular
                          <SelectItem value="pago_regular">Pago Regular</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {formData.categoria_producto !== 'matricula' && (
                      <p className="text-xs text-muted-foreground">
                        Los materiales y cursos grabados solo admiten pago regular.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sección 3: Información Adicional */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">3. Información Adicional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comprobante">Archivo de Comprobante</Label>
                  <Input
                    id="comprobante"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setComprobanteFile(file || null);
                    }}
                    disabled={uploadingComprobante}
                  />
                  {comprobanteFile && (
                    <p className="text-xs text-muted-foreground">
                      Archivo seleccionado: {comprobanteFile.name}
                    </p>
                  )}
                  {uploadingComprobante && (
                    <p className="text-xs text-blue-600">
                      Subiendo comprobante...
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) =>
                      setFormData({ ...formData, observaciones: e.target.value })
                    }
                    rows={3}
                    placeholder="Notas adicionales sobre el pago..."
                  />
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={uploadingComprobante}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadingComprobante}>
                <DollarSign className="mr-2 h-4 w-4" />
                {uploadingComprobante ? 'Subiendo...' : 'Registrar Pago'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
