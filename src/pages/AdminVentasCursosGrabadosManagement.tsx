import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MONEDAS } from '@/integrations/supabase/peri-types';
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
  usuario_id: string;
  id_clases_grabadas: string;
  valor_venta: number;
  moneda_venta?: string;
  matricula_id: string | null;
  created_at: string;
  updated_at: string;
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
  const [filteredStudents, setFilteredStudents] = useState<Profile[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchType, setSearchType] = useState<'nombre' | 'codigo' | 'dni'>('nombre');
  const [cursosGrabados, setCursosGrabados] = useState<CursoGrabado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    estudiante_id: '',
    id_clases_grabadas: '',
    valor_venta: 0,
    moneda_venta: 'PEN',
    usuario_id: '',
  });

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!studentSearch.trim()) {
      setFilteredStudents(estudiantes);
      return;
    }

    const searchLower = studentSearch.toLowerCase();
    const filtered = estudiantes.filter((student: any) => {
      if (searchType === 'nombre') {
        return `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchLower);
      } else if (searchType === 'codigo') {
        return student.student_code?.toLowerCase().includes(searchLower);
      } else {
        return student.document_number?.toLowerCase().includes(searchLower);
      }
    });
    setFilteredStudents(filtered);
  }, [studentSearch, searchType, estudiantes]);

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
        .select('id, first_name, last_name, email, student_code, document_number')
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

      setVentas(ventasData as any || []);
      setEstudiantes(estudiantesData || []);
      setFilteredStudents(estudiantesData || []);
      setCursosGrabados(cursosData as any || []);
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
      id_clases_grabadas: '',
      valor_venta: 0,
      moneda_venta: 'PEN',
      usuario_id: currentUser?.id || '',
    });
    setStudentSearch('');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.estudiante_id || !formData.id_clases_grabadas || !formData.valor_venta) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (formData.valor_venta <= 0) {
      toast({
        title: 'Error',
        description: 'El valor de venta debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Verificar si ya existe una venta del mismo curso grabado para este estudiante
      const { data: existingVentas, error: checkError } = await supabase
        .from('venta_cursos_grabados' as any)
        .select('id, curso_grabado:cursos_grabados(name)')
        .eq('estudiante_id', formData.estudiante_id)
        .eq('id_clases_grabadas', formData.id_clases_grabadas);

      if (checkError) throw checkError;

      if (existingVentas && existingVentas.length > 0) {
        const cursoNombre = (existingVentas[0] as any).curso_grabado?.name || 'este curso';
        toast({
          title: 'Curso duplicado',
          description: `El estudiante ya tiene una compra registrada de ${cursoNombre}. No se pueden registrar compras duplicadas del mismo curso grabado.`,
          variant: 'destructive',
        });
        return;
      }

      const dataToSave = {
        estudiante_id: formData.estudiante_id,
        id_clases_grabadas: formData.id_clases_grabadas,
        valor_venta: formData.valor_venta,
        moneda_venta: formData.moneda_venta,
        usuario_id: currentUser?.id || formData.usuario_id,
        matricula_id: null,
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
                    <TableHead>Valor Venta</TableHead>
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
                        {venta.created_at && !isNaN(new Date(venta.created_at).getTime())
                          ? new Date(venta.created_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="mr-2">
                          {venta.moneda_venta || 'PEN'}
                        </Badge>
                        {venta.valor_venta ? venta.valor_venta.toFixed(2) : '0.00'}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Venta de Curso Grabado</DialogTitle>
              <DialogDescription>
                Registre la venta de un curso grabado a un estudiante (venta independiente, no asociada a matrícula)
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
                  onValueChange={(value) => setFormData({ ...formData, estudiante_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No se encontraron estudiantes</div>
                    ) : (
                      filteredStudents.map((estudiante: any) => (
                        <SelectItem key={estudiante.id} value={estudiante.id}>
                          {estudiante.first_name} {estudiante.last_name}
                          {estudiante.student_code && ` (${estudiante.student_code})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_clases_grabadas">Curso Grabado *</Label>
                <Select
                  value={formData.id_clases_grabadas}
                  onValueChange={(value) => setFormData({ ...formData, id_clases_grabadas: value })}
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
                <p className="text-xs text-gray-500">
                  💡 Nota: Las ventas asociadas a matrículas se registran automáticamente desde el formulario de matrícula
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moneda_venta">Moneda *</Label>
                  <Select
                    value={formData.moneda_venta}
                    onValueChange={(value) => setFormData({ ...formData, moneda_venta: value })}
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
                  <Label htmlFor="valor_venta">Valor Venta *</Label>
                  <Input
                    id="valor_venta"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_venta}
                    onChange={(e) => setFormData({ ...formData, valor_venta: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

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
