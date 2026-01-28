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
import { Plus, ShoppingCart } from 'lucide-react';

interface VentaCursoGrabado {
  id: string;
  estudiante_id: string;
  curso_grabado_id: string;
  matricula_id: string | null;
  fecha_compra: string;
  monto: number;
  estado_pago: string;
  fecha_pago: string | null;
  created_at: string;
  estudiante?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  curso_grabado?: {
    id: string;
    name: string;
  };
  matricula?: {
    id: string;
    cod_matricula: string;
  };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CursoGrabado {
  id: string;
  name: string;
}

interface Matricula {
  id: string;
  cod_matricula: string;
}

export default function AdminVentasCursosGrabadosManagement() {
  const [ventas, setVentas] = useState<VentaCursoGrabado[]>([]);
  const [estudiantes, setEstudiantes] = useState<Profile[]>([]);
  const [cursosGrabados, setCursosGrabados] = useState<CursoGrabado[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    estudiante_id: '',
    curso_grabado_id: '',
    matricula_id: '',
    fecha_compra: new Date().toISOString().split('T')[0],
    monto: 0,
    estado_pago: 'pendiente',
    fecha_pago: '',
  });

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Cargar ventas
      const { data: ventasData, error: ventasError } = await supabase
        .from('venta_cursos_grabados' as any)
        .select(`
          *,
          estudiante:profiles!venta_cursos_grabados_estudiante_id_fkey(id, first_name, last_name, email),
          curso_grabado:cursos_grabados(id, name),
          matricula:matriculas(id, cod_matricula)
        `)
        .order('created_at', { ascending: false });

      if (ventasError) throw ventasError;

      // Cargar estudiantes
      const { data: estudiantesData, error: estudiantesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'student')
        .order('first_name');

      if (estudiantesError) throw estudiantesError;

      // Cargar cursos grabados activos
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos_grabados' as any)
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (cursosError) throw cursosError;

      // Cargar matrículas
      const { data: matriculasData, error: matriculasError } = await supabase
        .from('matriculas' as any)
        .select('id, cod_matricula')
        .order('cod_matricula', { ascending: false });

      if (matriculasError) throw matriculasError;

      setVentas(ventasData as any || []);
      setEstudiantes(estudiantesData || []);
      setCursosGrabados(cursosData as any || []);
      setMatriculas(matriculasData as any || []);
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

  const handleOpenDialog = () => {
    setFormData({
      estudiante_id: '',
      curso_grabado_id: '',
      matricula_id: '',
      fecha_compra: new Date().toISOString().split('T')[0],
      monto: 0,
      estado_pago: 'pendiente',
      fecha_pago: '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.estudiante_id || !formData.curso_grabado_id || !formData.monto) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        matricula_id: formData.matricula_id || null,
        fecha_pago: formData.estado_pago === 'pagado' && formData.fecha_pago ? formData.fecha_pago : null,
      };

      const { error } = await supabase
        .from('venta_cursos_grabados' as any)
        .insert(dataToSave);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Venta registrada correctamente',
      });

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al registrar venta: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateEstado = async (id: string, nuevoEstado: string) => {
    try {
      const updateData: any = {
        estado_pago: nuevoEstado,
      };

      if (nuevoEstado === 'pagado' && !ventas.find(v => v.id === id)?.fecha_pago) {
        updateData.fecha_pago = new Date().toISOString().split('T')[0];
      } else if (nuevoEstado !== 'pagado') {
        updateData.fecha_pago = null;
      }

      const { error } = await supabase
        .from('venta_cursos_grabados' as any)
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

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'pagado':
        return 'default';
      case 'pendiente':
        return 'secondary';
      case 'cancelado':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6" />
                  Ventas de Cursos Grabados
                </CardTitle>
                <CardDescription>
                  Registro de ventas de cursos en video a estudiantes
                </CardDescription>
              </div>
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Venta
              </Button>
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
                    <TableHead>Curso Grabado</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Fecha Compra</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta) => (
                    <TableRow key={venta.id}>
                      <TableCell className="font-medium">
                        {venta.estudiante ? `${venta.estudiante.first_name} ${venta.estudiante.last_name}` : '-'}
                      </TableCell>
                      <TableCell>{venta.curso_grabado?.name || '-'}</TableCell>
                      <TableCell>{venta.matricula?.cod_matricula || '-'}</TableCell>
                      <TableCell>
                        {new Date(venta.fecha_compra).toLocaleDateString()}
                      </TableCell>
                      <TableCell>${venta.monto.toFixed(2)}</TableCell>
                      <TableCell>
                        <Select
                          value={venta.estado_pago}
                          onValueChange={(value) => handleUpdateEstado(venta.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <Badge variant={getEstadoBadgeVariant(venta.estado_pago)}>
                              {venta.estado_pago}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="pagado">Pagado</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {venta.fecha_pago
                          ? new Date(venta.fecha_pago).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de formulario */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva Venta de Curso Grabado</DialogTitle>
              <DialogDescription>
                Registre la venta de un curso grabado a un estudiante
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="estudiante_id">Estudiante *</Label>
                <Select
                  value={formData.estudiante_id}
                  onValueChange={(value) => setFormData({ ...formData, estudiante_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {estudiantes.map((estudiante) => (
                      <SelectItem key={estudiante.id} value={estudiante.id}>
                        {estudiante.first_name} {estudiante.last_name} ({estudiante.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="curso_grabado_id">Curso Grabado *</Label>
                <Select
                  value={formData.curso_grabado_id}
                  onValueChange={(value) => setFormData({ ...formData, curso_grabado_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un curso" />
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
                <Label htmlFor="matricula_id">Matrícula (opcional)</Label>
                <Select
                  value={formData.matricula_id}
                  onValueChange={(value) => setFormData({ ...formData, matricula_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una matrícula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin matrícula</SelectItem>
                    {matriculas.map((matricula) => (
                      <SelectItem key={matricula.id} value={matricula.id}>
                        {matricula.cod_matricula}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_compra">Fecha de Compra *</Label>
                <Input
                  id="fecha_compra"
                  type="date"
                  value={formData.fecha_compra}
                  onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado_pago">Estado de Pago</Label>
                <Select
                  value={formData.estado_pago}
                  onValueChange={(value) => setFormData({ ...formData, estado_pago: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.estado_pago === 'pagado' && (
                <div className="space-y-2">
                  <Label htmlFor="fecha_pago">Fecha de Pago</Label>
                  <Input
                    id="fecha_pago"
                    type="date"
                    value={formData.fecha_pago}
                    onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                  />
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Venta</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
