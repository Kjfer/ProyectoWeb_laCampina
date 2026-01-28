import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  CourseInsert,
  Programa,
  generateCourseCode,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function AdminEdicionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [programas, setProgramas] = useState<Programa[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [uploadingBook, setUploadingBook] = useState(false);
  const [formData, setFormData] = useState<Partial<CourseInsert>>({
    name: '',
    description: '',
    code: '',
    program_id: '',
    teacher_principal_id: '',
    academic_year: new Date().getFullYear().toString(),
    semester: '',
    is_active: true,
    start_date: '',
    end_date: '',
    numero_modulos: 1,
    material: 'none',
    book_url: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      // Cargar programas activos
      const { data: programasData, error: programasError } = await supabase
        .from('programas' as any)
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (programasError) throw programasError;

      // Cargar profesores
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'teacher')
        .order('first_name');

      if (teachersError) throw teachersError;

      setProgramas(programasData || []);
      setTeachers(teachersData || []);

      // Si estamos editando, cargar los datos de la edición
      if (id) {
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();

        if (courseError) throw courseError;

        setFormData({
          name: courseData.name,
          description: courseData.description,
          code: courseData.code,
          program_id: courseData.program_id,
          teacher_principal_id: courseData.teacher_principal_id,
          academic_year: courseData.academic_year,
          semester: courseData.semester,
          is_active: courseData.is_active,
          start_date: courseData.start_date,
          end_date: courseData.end_date,
          numero_modulos: courseData.numero_modulos,
          material: courseData.material,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al cargar datos: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const generateEdicionName = (programId: string, startDate: string) => {
    const programa = programas.find(p => p.id === programId);
    if (!programa || !startDate) return '';
    
    const date = new Date(startDate);
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mes = meses[date.getMonth()];
    const año = date.getFullYear();
    
    return `${programa.name} - ${mes} ${año}`;
  };

  const handleProgramChange = (programId: string) => {
    const newFormData = { ...formData, program_id: programId };
    
    // Generar código automáticamente
    if (formData.start_date) {
      const programa = programas.find(p => p.id === programId);
      if (programa) {
        const code = generateCourseCode(programa.code, new Date(formData.start_date));
        const name = generateEdicionName(programId, formData.start_date);
        newFormData.code = code;
        newFormData.name = name;
      }
    }
    
    setFormData(newFormData);
  };

  const handleStartDateChange = (date: string) => {
    const newFormData = { ...formData, start_date: date };
    
    // Regenerar código y nombre si ya hay programa seleccionado
    if (formData.program_id) {
      const programa = programas.find(p => p.id === formData.program_id);
      if (programa) {
        const code = generateCourseCode(programa.code, new Date(date));
        const name = generateEdicionName(formData.program_id, date);
        newFormData.code = code;
        newFormData.name = name;
      }
    }
    
    setFormData(newFormData);
  };

  const uploadBookToStorage = async (): Promise<string | null> => {
    if (!bookFile) return formData.book_url || null;

    try {
      setUploadingBook(true);
      const fileExt = bookFile.name.split('.').pop();
      const fileName = `${formData.code}_book_${Date.now()}.${fileExt}`;
      const filePath = `books/${fileName}`;

      const { data, error } = await supabase.storage
        .from('course-materials')
        .upload(filePath, bookFile);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('course-materials')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al subir el libro: ${error.message}`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingBook(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name || !formData.program_id || !formData.teacher_principal_id || 
        !formData.start_date || !formData.academic_year || !formData.semester) {
      toast({
        title: 'Error',
        description: 'Por favor complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (formData.numero_modulos! < 1 || formData.numero_modulos! > 20) {
      toast({
        title: 'Error',
        description: 'El número de módulos debe estar entre 1 y 20',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Subir libro si hay uno y material es 'book'
      let bookUrl = formData.book_url;
      if (formData.material === 'book' && bookFile) {
        const uploadedUrl = await uploadBookToStorage();
        if (uploadedUrl) {
          bookUrl = uploadedUrl;
        }
      }

      const dataToSave = { ...formData, book_url: bookUrl };

      if (isEditing) {
        // Actualizar
        const { error } = await supabase
          .from('courses')
          .update(dataToSave)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Edición actualizada correctamente',
        });
      } else {
        // Crear
        const { error } = await supabase
          .from('courses')
          .insert(dataToSave as CourseInsert);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Edición creada correctamente. Ahora puede crear los módulos.',
        });
      }

      navigate('/admin/courses');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Error al guardar: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/courses')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle>
                {isEditing ? 'Editar Edición' : 'Nueva Edición'}
              </CardTitle>
              <CardDescription>
                Complete los datos de la edición del programa
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de Programa */}
            <div className="space-y-2">
              <Label htmlFor="program_id">Programa *</Label>
              <Select
                value={formData.program_id}
                onValueChange={handleProgramChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un programa" />
                </SelectTrigger>
                <SelectContent>
                  {programas.map((programa) => (
                    <SelectItem key={programa.id} value={programa.id}>
                      {programa.code} - {programa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nombre y Código */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Edición (auto-generado) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  placeholder="Seleccione programa y fecha de inicio"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código (auto-generado)</Label>
                <Input
                  id="code"
                  value={formData.code}
                  placeholder="AUTO"
                  disabled
                />
              </div>
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
                placeholder="Descripción de la edición"
                rows={3}
              />
            </div>

            {/* Profesor Principal */}
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

            {/* Período Académico */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academic_year">Año Académico *</Label>
                <Input
                  id="academic_year"
                  type="number"
                  value={formData.academic_year}
                  onChange={(e) =>
                    setFormData({ ...formData, academic_year: e.target.value })
                  }
                  placeholder="2026"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semestre *</Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value) =>
                    setFormData({ ...formData, semester: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">I</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="Verano">Verano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Fecha de Inicio *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha de Fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Número de Módulos y Material */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero_modulos">Número de Módulos *</Label>
                <Input
                  id="numero_modulos"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.numero_modulos}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_modulos: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Material Asociado</Label>
                <Select
                  value={formData.material}
                  onValueChange={(value: 'book' | 'kit' | 'none') =>
                    setFormData({ ...formData, material: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    <SelectItem value="book">Libro</SelectItem>
                    <SelectItem value="kit">Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subir Libro (solo si material es 'book') */}
            {formData.material === 'book' && (
              <div className="space-y-2">
                <Label htmlFor="book_file">Archivo del Libro (PDF) *</Label>
                <Input
                  id="book_file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setBookFile(e.target.files?.[0] || null)}
                />
                {bookFile && (
                  <p className="text-sm text-gray-600">Archivo seleccionado: {bookFile.name}</p>
                )}
                {formData.book_url && !bookFile && (
                  <p className="text-sm text-green-600">✓ Libro ya cargado</p>
                )}
              </div>
            )}

            {/* Estado */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Edición activa</Label>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/courses')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
