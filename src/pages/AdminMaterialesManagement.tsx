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

export default function AdminMaterialesManagement() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_material: 'book' as 'book' | 'kit',
    estudiante_id: '',
    course_id: '',
    estado_pago: 'pendiente' as 'pendiente' | 'pagado' | 'cancelado',
    monto: 0,
    fecha_pago: '',
  });

  useEffect(() => {
    fetchData();
    getCurrentUser();
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
        .select('id, first_name, last_name, email')
        .eq('role', 'student')
        .order('first_name');

      if (studentsError) throw studentsError;

      // Cargar cursos con material
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, code, material')
        .neq('material', 'none')
        .eq('is_active', true)
        .order('name');

      if (coursesError) throw coursesError;

      setMateriales(materialesData as any || []);
      setStudents(studentsData || []);
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

  const handleOpenDialog = () => {
    setFormData({
      nombre: '',
      tipo_material: 'book',
      estudiante_id: '',
      course_id: '',
      estado_pago: 'pendiente',
      monto: 0,
      fecha_pago: '',
    });
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

    try {
      const dataToSave = {
        ...formData,
        usuario_id: currentUser.id,
        fecha_pago: formData.estado_pago === 'pagado' && formData.fecha_pago ? formData.fecha_pago : null,
      };

      const { error } = await supabase
        .from('registro_compra_materiales' as any)
        .insert(dataToSave);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Material registrado correctamente',
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
                  {materiales.map((material) => (
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
                      <TableCell>S/ {material.monto.toFixed(2)}</TableCell>
                      <TableCell>
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de registro */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Material</DialogTitle>
              <DialogDescription>
                Registre la compra de un libro o kit para un estudiante
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="estudiante_id">Estudiante *</Label>
                <Select
                  value={formData.estudiante_id}
                  onValueChange={(value) => setFormData({ ...formData, estudiante_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course_id">Curso *</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} ({course.material})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Material *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: English Book Level 3"
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
                <Label htmlFor="estado_pago">Estado de Pago *</Label>
                <Select
                  value={formData.estado_pago}
                  onValueChange={(value: any) => setFormData({ ...formData, estado_pago: value })}
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
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
