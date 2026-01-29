import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Video } from 'lucide-react';

interface CursoGrabado {
  id: string;
  name: string;
  description: string | null;
  program_id: string | null;
  video_url: string | null;
  duration_hours: number | null;
  is_active: boolean;
  created_at: string;
  programa?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Programa {
  id: string;
  name: string;
  code: string;
}

export default function AdminCursosGrabadosManagement() {
  const [cursosGrabados, setCursosGrabados] = useState<CursoGrabado[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<CursoGrabado | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    program_id: '',
    duration_hours: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Autocompletar nombre según programa seleccionado
  useEffect(() => {
    if (formData.program_id && !editingCurso) {
      const programa = programas.find(p => p.id === formData.program_id);
      if (programa) {
        // Solo autocompletar si el nombre está vacío o es el valor por defecto
        if (!formData.name || formData.name === '') {
          setFormData(prev => ({
            ...prev,
            name: `${programa.name} - Curso Grabado`
          }));
        }
      }
    }
  }, [formData.program_id, programas, editingCurso]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Cargar cursos grabados
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos_grabados' as any)
        .select(`
          *,
          programa:programas(id, name, code)
        `)
        .order('created_at', { ascending: false });

      if (cursosError) throw cursosError;

      // Cargar programas
      const { data: programasData, error: programasError } = await supabase
        .from('programas' as any)
        .select('id, name, code')
        .order('name');

      if (programasError) throw programasError;

      setCursosGrabados(cursosData as any || []);
      setProgramas(programasData as any || []);
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

  const handleOpenDialog = (curso?: CursoGrabado) => {
    if (curso) {
      setEditingCurso(curso);
      setFormData({
        name: curso.name,
        description: curso.description || '',
        program_id: curso.program_id || '',
        duration_hours: curso.duration_hours || 0,
        is_active: curso.is_active,
      });
    } else {
      setEditingCurso(null);
      setFormData({
        name: '',
        description: '',
        program_id: '',
        duration_hours: 0,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        program_id: formData.program_id || null,
      };

      if (editingCurso) {
        const { error } = await supabase
          .from('cursos_grabados' as any)
          .update(dataToSave)
          .eq('id', editingCurso.id);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Curso grabado actualizado correctamente',
        });
      } else {
        const { error } = await supabase
          .from('cursos_grabados' as any)
          .insert(dataToSave);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Curso grabado creado correctamente',
        });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al guardar curso grabado: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este curso grabado?')) return;

    try {
      const { error } = await supabase
        .from('cursos_grabados' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Curso grabado eliminado correctamente',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al eliminar curso grabado: ${error.message}`,
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
                  <Video className="h-6 w-6" />
                  Cursos Grabados
                </CardTitle>
                <CardDescription>
                  Catálogo de cursos en formato video (clases grabadas)
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Curso Grabado
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Programa</TableHead>
                    <TableHead>Duración (hrs)</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cursosGrabados.map((curso) => (
                    <TableRow key={curso.id}>
                      <TableCell className="font-medium">{curso.name}</TableCell>
                      <TableCell>{curso.programa?.name || '-'}</TableCell>
                      <TableCell>{curso.duration_hours || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={curso.is_active ? 'default' : 'secondary'}>
                          {curso.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(curso)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(curso.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
              <DialogTitle className="text-xl flex items-center gap-2">
                <Video className="h-5 w-5" />
                {editingCurso ? 'Editar Curso Grabado' : 'Nuevo Curso Grabado'}
              </DialogTitle>
              <DialogDescription>
                Complete los datos del curso grabado
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Información del Curso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="program_id">Programa</Label>
                    <Select
                      value={formData.program_id}
                      onValueChange={(value) => setFormData({ ...formData, program_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin programa - Seleccione si aplica" />
                      </SelectTrigger>
                      <SelectContent>
                        {programas.map((programa) => (
                          <SelectItem key={programa.id} value={programa.id}>
                            {programa.name} ({programa.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      💡 El nombre se autocompletará según el programa seleccionado
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Curso *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: English Complete Course"
                      required
                    />
                    {formData.program_id && !editingCurso && (
                      <p className="text-xs text-green-600">
                        ✓ Nombre autocompletado - Puede editarlo si lo desea
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción detallada del contenido del curso..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration_hours">Duración (horas)</Label>
                      <Input
                        id="duration_hours"
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.duration_hours}
                        onChange={(e) =>
                          setFormData({ ...formData, duration_hours: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="Ej: 40"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="is_active">Estado</Label>
                      <div className="flex items-center space-x-2 h-10">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active" className="cursor-pointer">
                          {formData.is_active ? 'Activo' : 'Inactivo'}
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  <Video className="mr-2 h-4 w-4" />
                  {editingCurso ? 'Actualizar Curso' : 'Crear Curso'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
