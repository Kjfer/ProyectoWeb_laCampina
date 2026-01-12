import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Loader2, Check, BookOpen, Edit, Trash2, Users, Calendar, Clock, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchAllTeachers } from '@/utils/teacherUtils';
// NUEVO: Importamos Tabs y el Gestor de Programas
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminProgramManagement } from './AdminProgramManagement';

// --- Interfaces ---
interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Course {
  id: string;
  name: string;
  description?: string;
  code: string;
  teacher_id: string;
  program_id?: string; // NUEVO
  teacher?: Teacher;
  academic_year: string;
  start_date?: string;
  end_date?: string;
  start_time?: string; // NUEVO
  end_time?: string;   // NUEVO
  additional_teachers?: string[];
  is_active: boolean;
  schedule?: string | any;
  enrollments?: { count: number }[];
  semester?: string;
}

interface CourseFormData {
  name: string;
  description: string;
  code: string;
  teacher_id: string;
  program_id: string; // NUEVO
  academic_year: string;
  start_date: string;
  end_date: string;
  start_time: string; // NUEVO
  end_time: string;   // NUEVO
  additional_teachers: string[];
}

const AdminCourseManagement = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [programs, setPrograms] = useState<any[]>([]); // NUEVO: Lista de Programas
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Estados de edición/borrado
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  // NUEVO: Mensaje de ayuda fechas
  const [durationMsg, setDurationMsg] = useState("");

  // Formulario Principal
  const [formData, setFormData] = useState<CourseFormData>({
    name: '',
    description: '',
    code: '',
    teacher_id: '',
    program_id: '',
    academic_year: '2026',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    additional_teachers: [],
  });

  // Estado para los Días
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  const daysOfWeekList = [
    { key: 'Monday', label: 'Lunes' },
    { key: 'Tuesday', label: 'Martes' },
    { key: 'Wednesday', label: 'Miércoles' },
    { key: 'Thursday', label: 'Jueves' },
    { key: 'Friday', label: 'Viernes' },
    { key: 'Saturday', label: 'Sábado' },
    { key: 'Sunday', label: 'Domingo' },
  ];

  // Selección masiva y filtros (TU CÓDIGO ORIGINAL)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkTeacherModal, setShowBulkTeacherModal] = useState(false);
  const [showBulkScheduleModal, setShowBulkScheduleModal] = useState(false);
  const [bulkTeacherId, setBulkTeacherId] = useState<string>('');
  const [bulkSchedule, setBulkSchedule] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('all');

  // Edición rápida (TU CÓDIGO ORIGINAL)
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [quickEditChanges, setQuickEditChanges] = useState<{ [id: string]: Partial<Course> }>({});
  
  // Modal Horario Detallado (TU CÓDIGO ORIGINAL)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleEditCourse, setScheduleEditCourse] = useState<Course | null>(null);
  const [scheduleForm, setScheduleForm] = useState<any[]>([]);
  const [inlineSaving, setInlineSaving] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCourses(), fetchTeachers(), fetchPrograms()]);
    setLoading(false);
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          teacher:profiles!courses_teacher_id_fkey (id, first_name, last_name, email),
          enrollments:course_enrollments (count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const fixedCourses = (data || []).map((c: any) => ({
        ...c,
        schedule: typeof c.schedule === 'string' ? c.schedule : (c.schedule ? JSON.stringify(c.schedule) : ''),
      }));
      setCourses(fixedCourses);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "Error al cargar cursos", variant: "destructive" });
    }
  };

  const fetchTeachers = async () => {
    const data = await fetchAllTeachers();
    setTeachers(data);
  };

  // NUEVO: Cargar Programas Padres
  const fetchPrograms = async () => {
    const { data } = await supabase.from('programs').select('*').eq('is_active', true);
    if (data) setPrograms(data);
  };

  // --- Manejadores del Formulario ---

  // NUEVO: Lógica Inteligente de Fechas
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setFormData(prev => ({ ...prev, start_date: newStart }));

    if (newStart) {
        const startObj = new Date(newStart);
        const endObj = new Date(startObj);
        endObj.setDate(startObj.getDate() + 28); // +28 días por defecto
        
        const endStr = endObj.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, start_date: newStart, end_date: endStr }));
        setDurationMsg("📅 Duración calculada: 4 semanas");
    }
  };

  const handleInputChange = useCallback((field: keyof CourseFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleSelectChange = useCallback((field: keyof CourseFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleDaySelection = (dayKey: string) => {
    if (selectedDays.includes(dayKey)) {
      setSelectedDays(selectedDays.filter(d => d !== dayKey));
    } else {
      setSelectedDays([...selectedDays, dayKey]);
    }
  };

  const resetForm = useCallback(() => {
    setFormData({
      name: '', description: '', code: '', teacher_id: '', program_id: '',
      academic_year: '2026', start_date: '', end_date: '', start_time: '', end_time: '',
      additional_teachers: [],
    });
    setSelectedDays([]);
    setDurationMsg("");
  }, []);

  // --- Crear Curso (LÓGICA ACTUALIZADA) ---
  const handleCreateCourse = async () => {
    if (!formData.name || !formData.code || !formData.teacher_id || !formData.start_date || !formData.end_date) {
      toast({ title: "Campos requeridos", description: "Completa todos los campos obligatorios.", variant: "destructive" });
      return;
    }

    if (selectedDays.length === 0) {
       toast({ title: "Horario requerido", description: "Selecciona al menos un día.", variant: "destructive" });
       return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            code: formData.code,
            teacher_id: formData.teacher_id,
            program_id: formData.program_id || null, // Conectamos con el padre
            academic_year: formData.academic_year,
            semester: '2026-I',
            start_date: formData.start_date,
            end_date: formData.end_date,
            start_time: formData.start_time || null, // Guardamos horas
            end_time: formData.end_time || null,
            number_of_modules: 1, // SIEMPRE 1 AHORA
            schedule: selectedDays, 
            is_active: true,
            additional_teachers: formData.additional_teachers
          },
        ]);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Curso creado", description: "Apertura creada correctamente." });
        setIsCreateModalOpen(false);
        resetForm();
        fetchCourses();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  // --- Editar Curso (TU LÓGICA ORIGINAL + CAMPOS NUEVOS) ---
  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    
    let currentDays: string[] = [];
    try {
      if (course.schedule) {
        const parsed = typeof course.schedule === 'string' ? JSON.parse(course.schedule) : course.schedule;
        if (Array.isArray(parsed)) {
            if (typeof parsed[0] === 'string') currentDays = parsed;
            else if (typeof parsed[0] === 'object') currentDays = parsed.map((d: any) => d.day);
        }
      }
    } catch(e) {}

    setFormData({
      name: course.name,
      description: course.description || '',
      code: course.code,
      teacher_id: course.teacher_id,
      program_id: course.program_id || '',
      academic_year: course.academic_year,
      start_date: course.start_date || '',
      end_date: course.end_date || '',
      start_time: course.start_time || '',
      end_time: course.end_time || '',
      additional_teachers: course.additional_teachers || [],
    });
    setSelectedDays(currentDays);
    setIsEditModalOpen(true);
  };

  const handleEditCourse = async () => {
    if (!editingCourse) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          name: formData.name,
          description: formData.description,
          code: formData.code,
          teacher_id: formData.teacher_id,
          academic_year: formData.academic_year,
          start_date: formData.start_date,
          end_date: formData.end_date,
          start_time: formData.start_time, // Nuevo
          end_time: formData.end_time,     // Nuevo
          additional_teachers: formData.additional_teachers,
          schedule: selectedDays,
        })
        .eq('id', editingCourse.id);

      if (error) throw error;
      
      toast({ title: "Actualizado", description: "Curso guardado correctamente." });
      setIsEditModalOpen(false);
      setEditingCourse(null);
      fetchCourses();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // --- Helpers y Acciones Secundarias (TU CÓDIGO ORIGINAL MANTENIDO) ---
  const openDeleteModal = (course: Course) => {
    setDeletingCourse(course);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('courses').delete().eq('id', deletingCourse.id);
      if (error) throw error;
      toast({ title: "Eliminado", description: "Curso borrado." });
      fetchCourses();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(false);
      setIsDeleteModalOpen(false);
      setDeletingCourse(null);
    }
  };

  const handleToggleCourseStatus = async (course: Course) => {
    const { error } = await supabase.from('courses').update({ is_active: !course.is_active }).eq('id', course.id);
    if (!error) {
        toast({ title: "Estado actualizado" });
        fetchCourses();
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = filterYear === 'all' || course.academic_year === filterYear;
    return matchesSearch && matchesYear;
  });

  const handleQuickEditChange = (courseId: string, field: keyof Course, value: any) => {
    setQuickEditChanges(prev => ({ ...prev, [courseId]: { ...prev[courseId], [field]: value } }));
  };

  const saveAllQuickEdits = async () => {
    const updates = Object.entries(quickEditChanges);
    if (updates.length === 0) return;
    setSaving(true);
    try {
      for (const [id, changes] of updates) {
        await supabase.from('courses').update(changes).eq('id', id);
      }
      toast({ title: 'Guardado', description: 'Cambios rápidos aplicados.' });
      setQuickEditChanges({});
      setQuickEditMode(false);
      fetchCourses();
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getScheduleSummary = (schedule: any) => {
    if (!schedule) return 'Sin horario';
    try {
       const arr = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
       if (Array.isArray(arr)) {
         if (typeof arr[0] === 'string') {
             const map: {[key:string]: string} = { 'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié', 'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb', 'Sunday': 'Dom' };
             return arr.map((d: string) => map[d] || d).join(', ');
         }
         if (typeof arr[0] === 'object') return 'Ver detalle';
       }
       return 'Sin horario';
    } catch { return 'Sin horario'; }
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        
        {/* Header (TU CÓDIGO ORIGINAL MEJORADO) */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Gestión Académica</h1>
          <p className="text-gray-600">Administra el catálogo y las aperturas.</p>
          
          {/* Tarjetas de Estadísticas (ORIGINALES) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            <Card className="hover:shadow-lg transition-shadow">
               <div className="p-4"><div className="text-sm text-gray-600">Total Aperturas</div><div className="text-2xl font-bold">{courses.length}</div></div>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
               <div className="p-4"><div className="text-sm text-gray-600">Activos</div><div className="text-2xl font-bold">{courses.filter(c => c.is_active).length}</div></div>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
               <div className="p-4"><div className="text-sm text-gray-600">Profesores</div><div className="text-2xl font-bold">{[...new Set(courses.map(c => c.teacher_id).filter(Boolean))].length}</div></div>
            </Card>
          </div>
        </div>

        {/* --- SISTEMA DE PESTAÑAS (NUEVO) --- */}
        <Tabs defaultValue="courses" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="courses">Ediciones (Cursos)</TabsTrigger>
                <TabsTrigger value="programs">Catálogo (Programas)</TabsTrigger>
            </TabsList>

            {/* PESTAÑA 1: TU VISTA ORIGINAL COMPLETA */}
            <TabsContent value="courses" className="space-y-6">
                
                {/* Botonera Acciones y Filtros */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex-1">
                        <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm"/>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center justify-end">
                        {selectedIds.length > 0 && (
                            <>
                                <Button size="sm" className="bg-purple-600" onClick={() => setShowBulkTeacherModal(true)}>Asignar Profe</Button>
                                <Button size="sm" className="bg-blue-600" onClick={() => setShowBulkScheduleModal(true)}>Asignar Horario</Button>
                                <span className="text-xs text-gray-500 ml-2">{selectedIds.length} selec.</span>
                            </>
                        )}
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white" 
                          onClick={() => { 
                            fetchPrograms(); // <--- AGREGAR ESTA LÍNEA (Recarga la lista al hacer clic)
                            resetForm(); 
                            setIsCreateModalOpen(true); 
                          }}>
                            + Nuevo Curso
                        </Button>
                        <Button variant={quickEditMode ? 'default' : 'outline'} onClick={() => setQuickEditMode(!quickEditMode)}>
                            {quickEditMode ? 'Salir Edición Rápida' : 'Edición Rápida'}
                        </Button>
                        {quickEditMode && Object.keys(quickEditChanges).length > 0 && (
                            <Button className="bg-green-600 text-white" onClick={saveAllQuickEdits} disabled={saving}>Guardar Cambios</Button>
                        )}
                    </div>
                </div>

                {/* Tabla Principal */}
                <Card className="shadow-card border-0">
                  <CardContent>
                    <div className="overflow-x-auto relative">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead></TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Profesor</TableHead>
                            <TableHead>Fechas y Horas</TableHead>
                            <TableHead>Días</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCourses.map((course) => (
                            <TableRow key={course.id}>
                              <TableCell><input type="checkbox" checked={selectedIds.includes(course.id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, course.id] : prev.filter(id => id !== course.id))} /></TableCell>
                              <TableCell>{quickEditMode ? <Input value={quickEditChanges[course.id]?.code ?? course.code} onChange={e => handleQuickEditChange(course.id, 'code', e.target.value)} /> : course.code}</TableCell>
                              <TableCell className="font-medium">
                                  {quickEditMode ? <Input value={quickEditChanges[course.id]?.name ?? course.name} onChange={e => handleQuickEditChange(course.id, 'name', e.target.value)} /> : course.name}
                                  {/* Mostrar Padre */}
                                  {course.program_id && programs.find(p=>p.id===course.program_id) && !quickEditMode && (
                                      <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                          <Package className="w-3 h-3"/> {programs.find(p=>p.id===course.program_id)?.name}
                                      </div>
                                  )}
                              </TableCell>
                              <TableCell>{course.teacher ? `${course.teacher.first_name} ${course.teacher.last_name}` : ''}</TableCell>
                              <TableCell>
                                <div className="flex flex-col text-sm gap-1">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {course.start_date ? course.start_date.slice(5) : '--'} / {course.end_date ? course.end_date.slice(5) : '--'}</span>
                                    {course.start_time && (
                                        <span className="flex items-center gap-1 text-gray-500 text-xs"><Clock className="w-3 h-3"/> {course.start_time.slice(0,5)} - {course.end_time?.slice(0,5)}</span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>{getScheduleSummary(course.schedule)}</TableCell>
                              <TableCell>
                                <Switch checked={quickEditMode ? (quickEditChanges[course.id]?.is_active ?? course.is_active) : course.is_active} onCheckedChange={val => quickEditMode ? handleQuickEditChange(course.id, 'is_active', val) : handleToggleCourseStatus(course)} disabled={!quickEditMode && false} />
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => openEditModal(course)}><Edit className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => openDeleteModal(course)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
            </TabsContent>

            {/* PESTAÑA 2: PROGRAMAS (NUEVO) */}
            <TabsContent value="programs">
                <AdminProgramManagement />
            </TabsContent>
        </Tabs>

        {/* --- MODALES (TODOS CONSERVADOS Y MEJORADOS) --- */}

        {/* 1. CREAR CURSO (NUEVO DISEÑO INTELIGENTE) */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Abrir Nueva Edición (Curso)</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
                {/* Paso 1: Padre */}
                {/* 1. SELECCIÓN DE PROGRAMA PADRE + AÑO */}
                <div className="bg-gray-50 p-4 rounded border mb-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label>Programa Base (Molde)</Label>
                            <Select 
                                value={formData.program_id} 
                                onValueChange={(val) => {
                                    const prog = programs.find(p => p.id === val);
                                    const now = new Date();
                                    const currentYear = now.getFullYear();
                                    
                                    // Diccionario de meses (Para el código)
                                    const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
                                    const currentMonthCode = monthNames[now.getMonth()]; // Ej: ENE
                                    
                                    setFormData(prev => ({ 
                                        ...prev, 
                                        program_id: val,
                                        // Nombre sugerido: Taller... - Módulo 1
                                        name: prog ? `${prog.name} - Módulo 1` : prev.name,
                                        
                                        // CÓDIGO PERFECTO: P001-M1-ENE-2026
                                        code: prog ? `${prog.code}-M1-${currentMonthCode}-${currentYear}` : prev.code,
                                        
                                        // Rellenamos también el año académico
                                        academic_year: currentYear.toString()
                                    }));
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Seleccionar Programa..." /></SelectTrigger>
                                <SelectContent>
                                    {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Campo Año Académico (Separado) */}
                        <div className="space-y-2">
                            <Label>Año Académico</Label>
                            <Input 
                                value={formData.academic_year} 
                                onChange={handleInputChange('academic_year')} 
                                placeholder="2026"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre Edición</Label><Input value={formData.name} onChange={handleInputChange('name')} /></div>
                    <div className="space-y-2"><Label>Código</Label><Input value={formData.code} onChange={handleInputChange('code')} /></div>
                </div>

                {/* Fechas Inteligentes */}
                <div className="bg-blue-50 p-4 rounded border border-blue-100 space-y-3">
                    <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2"><Calendar className="h-4 w-4"/> Tiempo</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label className="text-blue-900">Inicio</Label><Input type="date" value={formData.start_date} onChange={handleStartDateChange} className="bg-white"/></div>
                        <div><Label className="text-blue-900">Fin</Label><Input type="date" value={formData.end_date} onChange={handleInputChange('end_date')} className="bg-white"/></div>
                    </div>
                    {durationMsg && <p className="text-xs text-blue-700 font-medium">{durationMsg}</p>}
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label className="text-blue-900">Hora Inicio</Label><Input type="time" value={formData.start_time} onChange={handleInputChange('start_time')} className="bg-white"/></div>
                        <div><Label className="text-blue-900">Hora Fin</Label><Input type="time" value={formData.end_time} onChange={handleInputChange('end_time')} className="bg-white"/></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Profesor</Label>
                        <Select value={formData.teacher_id} onValueChange={handleSelectChange('teacher_id')}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>Días</Label>
                        <div className="flex flex-wrap gap-1">
                            {daysOfWeekList.map(day => (
                                <Badge key={day.key} variant={selectedDays.includes(day.key) ? 'default' : 'outline'} className="cursor-pointer select-none" onClick={() => toggleDaySelection(day.key)}>{day.label.slice(0,3)}</Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateCourse} disabled={saving} className="bg-blue-600 text-white">Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2. EDITAR CURSO (TU MODAL ORIGINAL MANTENIDO + CAMPOS NUEVOS) */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Editar Curso</DialogTitle></DialogHeader>
            <div className="space-y-4">
               <Input value={formData.name} onChange={handleInputChange('name')} placeholder="Nombre" />
               <div className="grid grid-cols-2 gap-4">
                   <Input type="date" value={formData.start_date} onChange={handleInputChange('start_date')} />
                   <Input type="date" value={formData.end_date} onChange={handleInputChange('end_date')} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <Input type="time" value={formData.start_time} onChange={handleInputChange('start_time')} />
                   <Input type="time" value={formData.end_time} onChange={handleInputChange('end_time')} />
               </div>
               <DialogFooter>
                   <Button onClick={handleEditCourse} disabled={saving}>Guardar</Button>
               </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* 3. ELIMINAR (TU MODAL ORIGINAL) */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
             <DialogContent><DialogHeader><DialogTitle>Eliminar Curso</DialogTitle></DialogHeader><p>¿Estás seguro?</p>
             <DialogFooter><Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDeleteCourse}>Eliminar</Button></DialogFooter></DialogContent>
        </Dialog>

        {/* 4. ASIGNACIÓN MASIVA (TU MODAL ORIGINAL) */}
        <Dialog open={showBulkTeacherModal} onOpenChange={setShowBulkTeacherModal}>
           <DialogContent><DialogHeader><DialogTitle>Asignar Profesor Masivo</DialogTitle></DialogHeader>
           <Select value={bulkTeacherId} onValueChange={setBulkTeacherId}><SelectTrigger><SelectValue placeholder="Profesor"/></SelectTrigger><SelectContent>{teachers.map(t=><SelectItem key={t.id} value={t.id}>{t.first_name}</SelectItem>)}</SelectContent></Select>
           <DialogFooter><Button onClick={async()=>{setSaving(true);for(const id of selectedIds)await supabase.from('courses').update({teacher_id:bulkTeacherId}).eq('id',id);setShowBulkTeacherModal(false);fetchCourses();setSaving(false);}}>Asignar</Button></DialogFooter></DialogContent>
        </Dialog>

        <Dialog open={showBulkScheduleModal} onOpenChange={setShowBulkScheduleModal}>
            <DialogContent><DialogHeader><DialogTitle>Asignar Horario Masivo</DialogTitle></DialogHeader>
            <div className="space-y-2">{daysOfWeekList.map(day=><div key={day.key} className="flex gap-2"><input type="checkbox" onChange={e=>{if(e.target.checked)setBulkSchedule(p=>[...p,{day:day.key}]);else setBulkSchedule(p=>p.filter(x=>x.day!==day.key))}}/>{day.label}</div>)}</div>
            <DialogFooter><Button onClick={async()=>{setSaving(true);for(const id of selectedIds)await supabase.from('courses').update({schedule:JSON.stringify(bulkSchedule)}).eq('id',id);setShowBulkScheduleModal(false);fetchCourses();setSaving(false);}}>Asignar</Button></DialogFooter></DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};

export default AdminCourseManagement;