import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface CourseScheduleManagerProps {
  courseId: string;
  canEdit: boolean;
}

const WEEKDAYS = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

export function CourseScheduleManager({ courseId, canEdit: _canEdit }: CourseScheduleManagerProps) {
  const { profile } = useAuth();
  
  // Solo los administradores pueden editar el horario
  const canEdit = profile?.role === 'admin';
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, [courseId]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('schedule_days, start_time, end_time')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      if (data) {
        setScheduleDays(data.schedule_days || []);
        setStartTime(data.start_time || '');
        setEndTime(data.end_time || '');
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Error al cargar el horario');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setScheduleDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);

      if (scheduleDays.length === 0) {
        toast.error('Debe seleccionar al menos un día');
        return;
      }

      if (!startTime || !endTime) {
        toast.error('Debe especificar hora de inicio y fin');
        return;
      }

      const { error } = await supabase
        .from('courses')
        .update({
          schedule_days: scheduleDays,
          start_time: startTime,
          end_time: endTime,
        })
        .eq('id', courseId);

      if (error) throw error;

      toast.success('Horario guardado correctamente');
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Error al guardar el horario');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Cargando horario...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <div>
            <CardTitle>Horario del Curso</CardTitle>
            <CardDescription>
              Define los días y horarios en que se imparte este curso
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Días de clase</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WEEKDAYS.map(day => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={day.value}
                  checked={scheduleDays.includes(day.value)}
                  onCheckedChange={() => handleDayToggle(day.value)}
                  disabled={!canEdit}
                />
                <label
                  htmlFor={day.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {day.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-time">Hora de inicio</Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-time">Hora de fin</Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={handleSaveSchedule} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Horario'}
            </Button>
          </div>
        )}

        {!canEdit && (
          <div className="text-sm text-muted-foreground">
            No tienes permisos para editar el horario del curso
          </div>
        )}
      </CardContent>
    </Card>
  );
}
