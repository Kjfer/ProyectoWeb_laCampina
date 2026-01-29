import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Pago,
  PagoWithRelations,
  PagoFormData,
  PagoInsert,
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
import { Plus, DollarSign, Filter, Calendar } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoDisponible[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  
  const [filters, setFilters] = useState({
    categoria: 'all',
    estado: 'all',
    estudiante: 'all',
  });

  const [formData, setFormData] = useState<PagoFormData>({
    categoria_producto: 'matricula',
    codigo_producto: '',
    estudiante_id: '',
    monto_pago: 0,
    fecha_pago: new Date().toISOString().split('T')[0],
    metodo_pago: 'efectivo',
    moneda_pago: 'PEN',
    estado_pago: 'pago_regular',
    comprobante: '',
    observaciones: '',
  });

  useEffect(() => {
    getCurrentUser();
    fetchPagos();
    fetchStudents();
  }, []);

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
      } else if (categoria === 'material') {
        const { data, error } = await supabase
          .from('registro_compra_materiales' as any)
          .select(`
            id,
            nombre,
            monto,
            estudiante_id,
            estudiante:profiles!registro_compra_materiales_estudiante_id_fkey(id, first_name, last_name),
            course:courses(name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        data?.forEach((mat: any) => {
          if (mat.estudiante) {
            productos.push({
              codigo: `MAT-${mat.id.substring(0, 8)}`,
              descripcion: `${mat.nombre} - ${mat.course?.name || 'Sin curso'}`,
              estudiante_id: mat.estudiante_id,
              estudiante_nombre: `${mat.estudiante.first_name} ${mat.estudiante.last_name}`,
              monto: mat.monto,
              moneda: 'PEN',
            });
          }
        });
      } else if (categoria === 'curso_grabado') {
        const { data, error } = await supabase
          .from('venta_cursos_grabados' as any)
          .select(`
            id,
            monto,
            estudiante_id,
            estudiante:profiles!venta_cursos_grabados_estudiante_id_fkey(id, first_name, last_name),
            curso_grabado:cursos_grabados(name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        data?.forEach((venta: any) => {
          if (venta.estudiante) {
            productos.push({
              codigo: `CG-${venta.id.substring(0, 8)}`,
              descripcion: `${venta.curso_grabado?.name || 'Curso grabado'}`,
              estudiante_id: venta.estudiante_id,
              estudiante_nombre: `${venta.estudiante.first_name} ${venta.estudiante.last_name}`,
              monto: venta.monto,
              moneda: 'PEN',
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

  const handleProductoChange = (codigo: string) => {
    const producto = productosDisponibles.find(p => p.codigo === codigo);
    if (producto) {
      setFormData({
        ...formData,
        codigo_producto: codigo,
        estudiante_id: producto.estudiante_id,
        monto_pago: producto.monto || formData.monto_pago,
        moneda_pago: (producto.moneda as any) || formData.moneda_pago,
      });
    } else {
      setFormData({
        ...formData,
        codigo_producto: codigo,
      });
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      categoria_producto: 'matricula',
      codigo_producto: '',
      estudiante_id: '',
      monto_pago: 0,
      fecha_pago: new Date().toISOString().split('T')[0],
      metodo_pago: 'efectivo',
      moneda_pago: 'PEN',
      estado_pago: 'pago_regular',
      comprobante: '',
      observaciones: '',
    });
    setProductosDisponibles([]);
    fetchProductosPorCategoria('matricula');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
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
      const pagoData: PagoInsert = {
        ...formData,
        usuario_id: currentUser.id,
        estudiante_id: formData.estudiante_id || null,
      };

      const { error } = await supabase
        .from('pagos' as any)
        .insert(pagoData);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Pago registrado correctamente',
      });

      handleCloseDialog();
      fetchPagos();
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
            <div className="grid grid-cols-3 gap-4">
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
                        {cat.toUpperCase()}
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
                    ? new Date(filteredPagos[0].fecha_pago).toLocaleDateString()
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
                      {new Date(pago.fecha_pago).toLocaleDateString()}
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
                    <TableCell>{pago.comprobante || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para registrar pago */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Pago</DialogTitle>
            <DialogDescription>
              Complete los datos del pago recibido
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Categoría */}
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
                        {cat === 'matricula' ? 'Matrícula' : 
                         cat === 'material' ? 'Material (Book/Kit)' : 
                         'Curso Grabado'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Código del Producto */}
              <div className="space-y-2">
                <Label htmlFor="codigo_producto">Código del Producto *</Label>
                {loadingProductos ? (
                  <div className="text-sm text-gray-500">Cargando productos...</div>
                ) : (
                  <Select
                    value={formData.codigo_producto}
                    onValueChange={handleProductoChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {productosDisponibles.map((producto) => (
                        <SelectItem key={producto.codigo} value={producto.codigo}>
                          {producto.codigo} - {producto.descripcion} ({producto.estudiante_nombre})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-gray-500">
                  Seleccione primero la categoría para ver los productos disponibles
                </p>
              </div>

              {/* Estudiante (autocompletado, solo lectura) */}
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
                    <SelectValue placeholder="Se llenará automáticamente al seleccionar el producto" />
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
                    ✓ Estudiante seleccionado automáticamente del producto
                  </p>
                )}
              </div>

              {/* Monto, Moneda y Fecha */}
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
                  <Label htmlFor="moneda_pago">Moneda</Label>
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

              {/* Método y Estado */}
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
                          {metodo.toUpperCase()}
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
                      {TIPOS_PAGO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Comprobante */}
              <div className="space-y-2">
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

              {/* Observaciones */}
              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, observaciones: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Pago</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
