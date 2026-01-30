import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/dateUtils.ts';
import { MatriculaWithRelations } from '@/integrations/supabase/peri-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Eye, Search, FileText, DollarSign, Calendar } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string;
}

export function MatriculasTab() {
  const navigate = useNavigate();
  const [matriculas, setMatriculas] = useState<MatriculaWithRelations[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'codigo' | 'fecha' | 'curso'>('codigo');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMatricula, setSelectedMatricula] = useState<MatriculaWithRelations | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchMatriculas();
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error('Error loading courses:', error);
    }
  };

  const fetchMatriculas = async () => {
    try {
      setLoading(true);
      
      // Cargar matrículas con información completa
      const { data: matriculasData, error: matriculasError } = await supabase
        .from('matriculas' as any)
        .select(`
          *,
          estudiante:profiles!matriculas_estudiante_id_fkey(id, first_name, last_name, email, student_code),
          usuario:profiles!matriculas_usuario_id_fkey(id, first_name, last_name),
          curso_grabado:cursos_grabados(id, name)
        `)
        .order('created_at', { ascending: false });

      if (matriculasError) throw matriculasError;

      // Para cada matrícula, obtener los módulos enrollados
      const matriculasConModulos = await Promise.all(
        (matriculasData || []).map(async (mat: any) => {
          // Obtener enrollments del estudiante
          const { data: enrollments } = await supabase
            .from('course_enrollments')
            .select(`
              modulo_id,
              modulos!course_enrollments_modulo_id_fkey(
                id,
                name,
                code,
                course_id
              )
            `)
            .eq('student_id', mat.estudiante_id);

          return {
            ...mat,
            modulos_matriculados: enrollments?.map(e => e.modulos).filter(Boolean) || []
          };
        })
      );

      // Cargar pagos relacionados
      const { data: pagosData } = await supabase
        .from('pagos' as any)
        .select('*')
        .eq('categoria_producto', 'matricula');

      // Asociar pagos con matrículas
      const matriculasConPagos = matriculasConModulos.map((mat: any) => ({
        ...mat,
        pagos: (pagosData || []).filter((pago: any) => pago.codigo_producto === mat.cod_matricula)
      }));

      setMatriculas(matriculasConPagos as any);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al cargar matrículas: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (matricula: MatriculaWithRelations) => {
    setSelectedMatricula(matricula);
    setDetailDialogOpen(true);
  };

  const handleNewMatricula = () => {
    navigate('/admin/matriculas/nueva');
  };

  // Filtrar matrículas por búsqueda
  const filteredMatriculas = matriculas.filter(mat => {
    const searchLower = searchTerm.toLowerCase();

    // Filtrar por tipo de búsqueda
    if (searchType === 'codigo') {
      return mat.cod_matricula.toLowerCase().includes(searchLower);
    } else if (searchType === 'fecha') {
      if (!selectedDate) return true;
      const matriculaDate = new Date(mat.created_at).toISOString().split('T')[0];
      return matriculaDate === selectedDate;
    } else if (searchType === 'curso') {
      if (!selectedCourseId) return true;
      // Verificar si algún módulo matriculado pertenece al curso seleccionado
      const modulos = mat.modulos_matriculados || [];
      return modulos.some((modulo: any) => {
        // Buscar si el módulo tiene relación con el curso seleccionado
        return modulo.course_id === selectedCourseId;
      });
    }

    return true;
  });

  // Calcular totales
  const totalMatriculas = filteredMatriculas.length;
  const totalIngresos = filteredMatriculas.reduce((sum, mat) => sum + mat.precio_final, 0);
  const totalPagado = filteredMatriculas.reduce((sum, mat) => {
    const pagos = mat.pagos || [];
    return sum + pagos.reduce((s, p) => s + p.monto_pago, 0);
  }, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Gestión de Matrículas
              </CardTitle>
              <CardDescription>
                Listado y seguimiento de todas las matrículas registradas
              </CardDescription>
            </div>
            <Button onClick={handleNewMatricula}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Matrícula
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Opciones de búsqueda */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Label>Buscar por:</Label>
                <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="codigo">Código de Matrícula</SelectItem>
                    <SelectItem value="fecha">Fecha de Matrícula</SelectItem>
                    <SelectItem value="curso">Curso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {searchType === 'codigo' && (
                <div className="flex-1">
                  <Label>Código de Matrícula</Label>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por código de matrícula..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {searchType === 'fecha' && (
                <div className="flex-1">
                  <Label>Fecha de Matrícula</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {searchType === 'curso' && (
                <div className="flex-1">
                  <Label>Curso</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un curso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los cursos</SelectItem>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Matrículas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMatriculas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Ingresos Totales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  S/ {totalIngresos.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pagado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  S/ {totalPagado.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  Pendiente: S/ {(totalIngresos - totalPagado).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Matrículas */}
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Código Est.</TableHead>
                  <TableHead>Módulos</TableHead>
                  <TableHead>Precio Final</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatriculas.map((matricula) => {
                  const totalPagadoMatricula = matricula.pagos?.reduce(
                    (sum, pago) => sum + pago.monto_pago,
                    0
                  ) || 0;
                  const pendiente = matricula.precio_final - totalPagadoMatricula;

                  return (
                    <TableRow key={matricula.id}>
                      <TableCell className="font-medium">
                        {matricula.cod_matricula}
                      </TableCell>
                      <TableCell>
                        {matricula.estudiante?.first_name} {matricula.estudiante?.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {matricula.student_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{matricula.modulos_matriculados?.length || 0} módulos</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {matricula.moneda} {matricula.precio_final.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-green-600 font-medium">
                            S/ {totalPagadoMatricula.toFixed(2)}
                          </span>
                          {pendiente > 0 && (
                            <span className="text-xs text-gray-500">
                              Pend: S/ {pendiente.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {pendiente <= 0 ? (
                          <Badge className="bg-green-500">Pagado</Badge>
                        ) : totalPagadoMatricula > 0 ? (
                          <Badge className="bg-yellow-500">Parcial</Badge>
                        ) : (
                          <Badge variant="destructive">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(matricula.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(matricula)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMatriculas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No se encontraron matrículas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Matrícula</DialogTitle>
            <DialogDescription>
              Código: {selectedMatricula?.cod_matricula}
            </DialogDescription>
          </DialogHeader>

          {selectedMatricula && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estudiante</Label>
                  <p className="font-medium">
                    {selectedMatricula.estudiante?.first_name} {selectedMatricula.estudiante?.last_name}
                  </p>
                </div>
                <div>
                  <Label>Código Estudiante</Label>
                  <p className="font-medium">{selectedMatricula.student_code}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="font-medium">{selectedMatricula.estudiante?.email}</p>
                </div>
                <div>
                  <Label>Fecha de Matrícula</Label>
                  <p className="font-medium">
                    {new Date(selectedMatricula.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <Label>Módulos Matriculados</Label>
                <div className="mt-2 space-y-2">
                  {selectedMatricula.modulos_matriculados?.map((modulo, index) => (
                    <Badge key={index} variant="outline" className="mr-2">
                      {modulo.name || `Módulo ${index + 1}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Valor Matrícula</Label>
                  <p className="font-medium">
                    {selectedMatricula.moneda} {selectedMatricula.valor_matricula.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label>Descuento</Label>
                  <p className="font-medium">
                    {selectedMatricula.moneda} {selectedMatricula.descuento.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label>Precio Final</Label>
                  <p className="font-bold text-lg">
                    {selectedMatricula.moneda} {selectedMatricula.precio_final.toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedMatricula.observaciones && (
                <div>
                  <Label>Observaciones</Label>
                  <p className="text-sm text-gray-600">{selectedMatricula.observaciones}</p>
                </div>
              )}

              {/* Pagos */}
              <div>
                <Label className="text-lg">Historial de Pagos</Label>
                {selectedMatricula.pagos && selectedMatricula.pagos.length > 0 ? (
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMatricula.pagos.map((pago) => (
                        <TableRow key={pago.id}>
                          <TableCell>
                            {new Date(pago.fecha_pago).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {pago.moneda} {pago.monto_pago.toFixed(2)}
                          </TableCell>
                          <TableCell>{pago.metodo_pago}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{pago.tipo_pago}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">No hay pagos registrados</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
