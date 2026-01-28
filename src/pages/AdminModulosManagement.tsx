import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Modulo,
  ModuloInsert,
  Course,
  Programa,
  ModuloSchedule,
  generateModuloCode,
} from '@/integrations/supabase/peri-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Edit, Trash2, ArrowLeft, Calendar } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function AdminModulosManagement() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null);
  
  const [formData, setFormData] = useState<Partial<ModuloInsert>>({
    name: '',
    num_modulo: 1,
    description: '',
    code: '',
    course_id: courseId,
    teacher_principal_id: '',
    academic_year: '',
    semester_year: '',
    is_active: true,
    start_date: '',
    end_date: '',
    schedule: {},
    aditional_teachers: [],
  });

  const [schedule, setSchedule] = useState<ModuloSchedule>({});

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Cargar edición
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData as any);

      // Cargar programa
      const { data: programaData, error: programaError } = await supabase
        .from('programas' as any)
        .select('*')
        .eq('id', (courseData as any).program_id)
        .single();

      if (programaError) throw programaError;
      setPrograma(programaData as any);

      // Cargar módulos
      const { data: modulosData, error: modulosError } = await supabase
        .from('modulos' as any)
        .select('*')
        .eq('course_id', courseId)
        .order('num_modulo');

      if (modulosError) throw modulosError;
      setModulos(modulosData as any || []);

      // Cargar profesores
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'teacher')
        .order('first_name');

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Inicializar datos del formulario
      setFormData(prev => ({
        ...prev,
        teacher_principal_id: (courseData as any).teacher_principal_id,
        academic_year: (courseData as any).academic_year,
        semester_year: (courseData as any).academic_year + '-' + (courseData as any).semester,
      }));

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

  const handleOpenDialog = (modulo?: Modulo) => {
    if (modulo) {
      setEditingModulo(modulo);
      setFormData({
        name: modulo.name,
        num_modulo: modulo.num_modulo,
        description: modulo.description,
        code: modulo.code,
        course_id: modulo.course_id,
        teacher_principal_id: modulo.teacher_principal_id,
        academic_year: modulo.academic_year,
        semester_year: modulo.semester_year,
        is_active: modulo.is_active,
        start_date: modulo.start_date,
        end_date: modulo.end_date,
        schedule: modulo.schedule || {},
        aditional_teachers: modulo.aditional_teachers || [],
      });
      setSchedule(modulo.schedule || {});
    } else {
      const nextNum = modulos.length > 0 
        ? Math.max(...modulos.map(m => m.num_modulo)) + 1 
        : 1;
      
      setEditingModulo(null);
      setFormData({
        name: '',
        num_modulo: nextNum,
        description: '',
        code: '',
        course_id: courseId,
        teacher_principal_id: course?.teacher_principal_id || '',
        academic_year: course?.academic_year || '',
        semester_year: course?.academic_year + '-' + course?.semester || '',
        is_active: true,
        start_date: '',
        end_date: '',
        schedule: {},
        aditional_teachers: [],
      });
      setSchedule({});
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingModulo(null);
    setSchedule({});
  };

  const handleScheduleChange = (dia: string, horario: string) => {
    const newSchedule = { ...schedule };
    if (horario) {
      newSchedule[dia] = horario;
    } else {
      delete newSchedule[dia];
    }
    setSchedule(newSchedule);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Generar código si no existe
      let code = formData.code;
      if (!code && programa) {
        code = generateModuloCode(
          programa.code,
          formData.num_modulo!,
          new Date(formData.start_date!)
        );
      }

      const dataToSave = {
        ...formData,
        code,
        schedule,
      };

      if (editingModulo) {
        // Actualizar
        const { error } = await supabase
          .from('modulos' as any)
          .update(dataToSave)
          .eq('id', editingModulo.id);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Módulo actualizado correctamente',
        });
      } else {
        // Crear
        const { error } = await supabase
          .from('modulos' as any)
          .insert(dataToSave as ModuloInsert);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Módulo creado correctamente',
        });
      }

      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al guardar módulo: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este módulo?')) return;

    try {
      const { error } = await supabase
        .from('modulos' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Módulo eliminado correctamente',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al eliminar módulo: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8 text-center">Cargando...</div>;
  }

  if (!course || !programa) {
    return <div className="container mx-auto py-8 text-center">Edición no encontrada</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/ediciones')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Módulos de {course.name}
              </CardTitle>
              <CardDescription>
                Programa: {programa.name} | Código: {course.code}
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Módulo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Profesor</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modulos.map((modulo) => {
                const teacher = teachers.find(t => t.id === modulo.teacher_principal_id);
                return (
                  <TableRow key={modulo.id}>
                    <TableCell className="font-medium">M{modulo.num_modulo}</TableCell>
                    <TableCell>{modulo.code}</TableCell>
                    <TableCell>{modulo.name}</TableCell>
                    <TableCell>
                      {teacher ? `${teacher.first_name} ${teacher.last_name}` : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(modulo.start_date).toLocaleDateString()} - {' '}
                      {new Date(modulo.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          modulo.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {modulo.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(modulo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(modulo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para crear/editar módulo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModulo ? 'Editar Módulo' : 'Nuevo Módulo'}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del módulo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Número y Nombre */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="num_modulo">Nº Módulo *</Label>
                  <Input
                    id="num_modulo"
                    type="number"
                    min="1"
                    value={formData.num_modulo}
                    onChange={(e) =>
                      setFormData({ ...formData, num_modulo: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="name">Nombre del Módulo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ej: Fundamentos de Programación"
                    required
                  />
                </div>
              </div>

              {/* Código */}
              <div className="space-y-2">
                <Label htmlFor="code">Código (auto-generado)</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Se genera automáticamente"
                  disabled={!editingModulo}
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              {/* Profesor */}
              <div className="space-y-2">
                <Label htmlFor="teacher_principal_id">Profesor Principal *</Label>
                <Select
                  value={formData.teacher_principal_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, teacher_principal_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un profesor" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Fecha de Inicio *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Fecha de Fin *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Horario */}
              <div className="space-y-2">
                <Label>Horario Semanal</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia} className="flex items-center gap-2">
                      <Label className="w-24 text-sm">{dia}:</Label>
                      <Input
                        placeholder="Ej: 10:00-12:00"
                        value={schedule[dia] || ''}
                        onChange={(e) => handleScheduleChange(dia, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Módulo activo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingModulo ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
