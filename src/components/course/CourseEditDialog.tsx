import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Plus, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CourseEditDialogProps {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CourseEditDialog({ courseId, open, onOpenChange, onSuccess }: CourseEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courseTeachers, setCourseTeachers] = useState<Teacher[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    semester: '',
    academic_year: '',
    teacher_id: '',
    start_date: '',
    end_date: '',
    schedule_days: [] as string[],
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    if (open && courseId) {
      fetchCourseData();
      fetchTeachers();
      fetchCourseTeachers();
    }
  }, [open, courseId]);

  const fetchCourseData = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name || '',
        code: data.code || '',
        description: data.description || '',
        semester: data.semester || '',
        academic_year: data.academic_year || '',
        teacher_id: data.teacher_id || '',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        schedule_days: data.schedule_days || [],
        start_time: data.start_time || '',
        end_time: data.end_time || ''
      });
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Error al cargar los datos del curso');
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchCourseTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('course_teachers')
        .select(`
          teacher:profiles!course_teachers_teacher_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('course_id', courseId);

      if (error) throw error;
      setCourseTeachers(data?.map(item => item.teacher).filter(Boolean) || []);
    } catch (error) {
      console.error('Error fetching course teachers:', error);
    }
  };

  const handleAddTeacher = async (teacherId: string) => {
    if (courseTeachers.some(t => t.id === teacherId)) {
      toast.error('Este profesor ya está asignado al curso');
      return;
    }

    try {
      const { error } = await supabase
        .from('course_teachers')
        .insert({
          course_id: courseId,
          teacher_id: teacherId,
          is_primary: false
        });

      if (error) throw error;

      toast.success('Profesor agregado exitosamente');
      fetchCourseTeachers();
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast.error('Error al agregar profesor');
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    try {
      const { error } = await supabase
        .from('course_teachers')
        .delete()
        .eq('course_id', courseId)
        .eq('teacher_id', teacherId);

      if (error) throw error;

      toast.success('Profesor removido exitosamente');
      fetchCourseTeachers();
    } catch (error) {
      console.error('Error removing teacher:', error);
      toast.error('Error al remover profesor');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          semester: formData.semester,
          academic_year: formData.academic_year,
          teacher_id: formData.teacher_id,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          schedule_days: formData.schedule_days,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null
        })
        .eq('id', courseId);

      if (error) throw error;

      toast.success('Curso actualizado exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Error al actualizar el curso');
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = [
    { value: 'monday', label: 'Lunes' },
    { value: 'tuesday', label: 'Martes' },
    { value: 'wednesday', label: 'Miércoles' },
    { value: 'thursday', label: 'Jueves' },
    { value: 'friday', label: 'Viernes' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
  ];

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Curso</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Curso *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Academic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="academic_year">Año Académico *</Label>
              <Input
                id="academic_year"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Semestre *</Label>
              <Select
                value={formData.semester}
                onValueChange={(value) => setFormData({ ...formData, semester: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar semestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primer-semestre">Primer Semestre</SelectItem>
                  <SelectItem value="segundo-semestre">Segundo Semestre</SelectItem>
                  <SelectItem value="verano">Verano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha de Fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Primary Teacher */}
          <div className="space-y-2">
            <Label htmlFor="teacher">Profesor Principal *</Label>
            <Select
              value={formData.teacher_id}
              onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar profesor" />
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

          {/* Additional Teachers */}
          <div className="space-y-3">
            <Label>Profesores Adicionales</Label>
            
            <div className="flex gap-2">
              <Select onValueChange={handleAddTeacher}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Agregar profesor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers
                    .filter(t => t.id !== formData.teacher_id && !courseTeachers.some(ct => ct.id === t.id))
                    .map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {courseTeachers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {courseTeachers.map((teacher) => (
                  <Badge key={teacher.id} variant="secondary" className="gap-2">
                    <UserCheck className="h-3 w-3" />
                    {teacher.first_name} {teacher.last_name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTeacher(teacher.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <Label>Días de Clase</Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <Badge
                  key={day.value}
                  variant={formData.schedule_days.includes(day.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Hora de Inicio</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">Hora de Fin</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
