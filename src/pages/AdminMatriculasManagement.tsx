import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from '@/hooks/use-toast';
import { Plus, Eye, Search, FileText, DollarSign } from 'lucide-react';

export default function AdminMatriculasManagement() {
  const navigate = useNavigate();
  const [matriculas, setMatriculas] = useState<MatriculaWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatricula, setSelectedMatricula] = useState<MatriculaWithRelations | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchMatriculas();
  }, []);

  const fetchMatriculas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('peri_matriculas')
        .select(`
          *,
          estudiante:profiles!peri_matriculas_estudiante_id_fkey(id, first_name, last_name, email, codigo_estudiante),
          usuario:profiles!peri_matriculas_usuario_id_fkey(id, first_name, last_name),
          curso_grabado:cursos_grabados(id, name),
          pagos:peri_pagos(monto_pago, fecha_pago, estado_pago, metodo_pago)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatriculas(data as any || []);
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
    return (
      mat.cod_matricula.toLowerCase().includes(searchLower) ||
      mat.estudiante?.first_name.toLowerCase().includes(searchLower) ||
      mat.estudiante?.last_name.toLowerCase().includes(searchLower) ||
      mat.estudiante?.email.toLowerCase().includes(searchLower)
    );
  });

  // Calcular totales
  const totalMatriculas = filteredMatriculas.length;
  const totalIngresos = filteredMatriculas.reduce((sum, mat) => sum + mat.precio_final, 0);
  const totalPagado = filteredMatriculas.reduce((sum, mat) => {
    const pagos = mat.pagos || [];
    return sum + pagos.reduce((s, p) => s + p.monto_pago, 0);
  }, 0);

  return (
    <div className="container mx-auto py-8">
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
          {/* Buscador */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por código, nombre o email del estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
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
                  <TableHead>Extras</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatriculas.map((matricula) => {
                  const totalPagadoMatricula = matricula.pagos?.reduce(
                    (sum, p) => sum + p.monto_pago,
                    0
                  ) || 0;
                  const pendiente = matricula.precio_final - totalPagadoMatricula;
                  
                  return (
                    <TableRow key={matricula.id}>
                      <TableCell className="font-medium">
                        {matricula.cod_matricula}
                      </TableCell>
                      <TableCell>
                        {matricula.estudiante
                          ? `${matricula.estudiante.first_name} ${matricula.estudiante.last_name}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {matricula.codigo_estudiante || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {Array.isArray(matricula.modulos_matriculados)
                            ? matricula.modulos_matriculados.length
                            : 0}{' '}
                          módulos
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {matricula.moneda_monto} {matricula.precio_final.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-green-600">
                            {matricula.moneda_monto} {totalPagadoMatricula.toFixed(2)}
                          </span>
                          {pendiente > 0 && (
                            <span className="text-xs text-orange-600">
                              Pend: {matricula.moneda_monto} {pendiente.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {matricula.book_incluido && (
                            <Badge variant="outline" className="text-xs">
                              📚 Book
                            </Badge>
                          )}
                          {matricula.kit_incluido && (
                            <Badge variant="outline" className="text-xs">
                              🎒 Kit
                            </Badge>
                          )}
                          {matricula.id_clases_grabadas && (
                            <Badge variant="outline" className="text-xs">
                              🎥 Video
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(matricula.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(matricula)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalle */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Matrícula</DialogTitle>
            <DialogDescription>
              {selectedMatricula?.cod_matricula}
            </DialogDescription>
          </DialogHeader>

          {selectedMatricula && (
            <div className="space-y-6">
              {/* Información del Estudiante */}
              <div>
                <h3 className="font-semibold mb-2">Información del Estudiante</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600">Nombre</Label>
                    <p className="font-medium">
                      {selectedMatricula.estudiante?.first_name}{' '}
                      {selectedMatricula.estudiante?.last_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Email</Label>
                    <p className="font-medium">{selectedMatricula.estudiante?.email}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Código Estudiante</Label>
                    <p className="font-medium">{selectedMatricula.codigo_estudiante || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Registrado por</Label>
                    <p className="font-medium">
                      {selectedMatricula.usuario?.first_name}{' '}
                      {selectedMatricula.usuario?.last_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Módulos Matriculados */}
              <div>
                <h3 className="font-semibold mb-2">Módulos Matriculados</h3>
                <div className="space-y-2">
                  {Array.isArray(selectedMatricula.modulos_matriculados) &&
                    selectedMatricula.modulos_matriculados.map((modulo: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium">{modulo.nombre}</div>
                        <div className="text-sm text-gray-600">
                          Código: {modulo.code}
                        </div>
                        {modulo.course_name && (
                          <div className="text-sm text-gray-600">
                            Edición: {modulo.course_name}
                          </div>
                        )}
                        {modulo.start_date && modulo.end_date && (
                          <div className="text-xs text-gray-500">
                            {new Date(modulo.start_date).toLocaleDateString()} -{' '}
                            {new Date(modulo.end_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Información Financiera */}
              <div>
                <h3 className="font-semibold mb-2">Información Financiera</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600">Valor Matrícula</Label>
                    <p className="font-medium">
                      {selectedMatricula.moneda_monto} {selectedMatricula.valor_matricula.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Descuento</Label>
                    <p className="font-medium text-orange-600">
                      - {selectedMatricula.moneda_monto} {selectedMatricula.descuento.toFixed(2)}
                    </p>
                  </div>
                  {selectedMatricula.id_clases_grabadas && (
                    <div>
                      <Label className="text-gray-600">Clases Grabadas</Label>
                      <p className="font-medium">
                        {selectedMatricula.moneda_monto}{' '}
                        {selectedMatricula.valor_clase_grabada.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedMatricula.curso_grabado?.name}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-600">Precio Final</Label>
                    <p className="font-bold text-lg text-blue-600">
                      {selectedMatricula.moneda_monto} {selectedMatricula.precio_final.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Extras */}
              <div>
                <h3 className="font-semibold mb-2">Extras Incluidos</h3>
                <div className="flex gap-2">
                  {selectedMatricula.book_incluido && (
                    <Badge>📚 Libro Incluido</Badge>
                  )}
                  {selectedMatricula.kit_incluido && (
                    <Badge>🎒 Kit Incluido</Badge>
                  )}
                  {!selectedMatricula.book_incluido && !selectedMatricula.kit_incluido && (
                    <span className="text-sm text-gray-500">Sin extras</span>
                  )}
                </div>
              </div>

              {/* Historial de Pagos */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Historial de Pagos
                </h3>
                {selectedMatricula.pagos && selectedMatricula.pagos.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMatricula.pagos.map((pago: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {new Date(pago.fecha_pago).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {selectedMatricula.moneda_monto} {pago.monto_pago.toFixed(2)}
                          </TableCell>
                          <TableCell>{pago.metodo_pago.toUpperCase()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {pago.estado_pago.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500">No hay pagos registrados</p>
                )}
              </div>

              {/* Observaciones */}
              {selectedMatricula.observaciones && (
                <div>
                  <h3 className="font-semibold mb-2">Observaciones</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedMatricula.observaciones}
                  </p>
                </div>
              )}

              {/* Fechas */}
              <div className="text-xs text-gray-500 border-t pt-4">
                <p>Creado: {new Date(selectedMatricula.created_at).toLocaleString()}</p>
                <p>Actualizado: {new Date(selectedMatricula.updated_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
