import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Loader2, Edit, Trash2, Calendar, Clock, Package, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchAllTeachers } from '@/utils/teacherUtils';
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
  program_id?: string;
  teacher?: Teacher;
  academic_year: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
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
  program_id: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  additional_teachers: string[];
}

const AdminCourseManagement = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Estados de edición/borrado
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  // Mensaje de ayuda fechas
  const [durationMsg, setDurationMsg] = useState("");

  // ESTADO NUEVO: Número de Módulo (para generar M1, M2, etc.)
  const [moduleNumber, setModuleNumber] = useState(1);

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

  // Selección masiva y filtros
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkTeacherModal, setShowBulkTeacherModal] = useState(false);
  const [showBulkScheduleModal, setShowBulkScheduleModal] = useState(false);
  const [bulkTeacherId, setBulkTeacherId] = useState<string>('');
  const [bulkSchedule, setBulkSchedule] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('all');

  // Edición rápida
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [quickEditChanges, setQuickEditChanges] = useState<{ [id: string]: Partial<Course> }>({});

  useEffect(() => {
    fetchData();
  }, []);

  // --- AUTOMATIZACIÓN DE CÓDIGO (EL CEREBRO) ---
  useEffect(() => {
    // Solo ejecutamos si el modal de creación está abierto
    if (!isCreateModalOpen) return;

    // 1. Obtener Programa seleccionado
    const selectedProgram = programs.find(p => p.id === formData.program_id);
    const progCode = selectedProgram?.code || 'GEN'; // Si no hay, usa GEN

    // 2. Obtener Mes de la Fecha de Inicio
    let monthCode = 'ENE';
    let yearCode = '2026';
    
    if (formData.start_date) {
        // Truco: Agregamos T12:00:00 para evitar problemas de zona horaria que restan un día
        const dateObj = new Date(formData.start_date + 'T12:00:00');
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        monthCode = months[dateObj.getMonth()];
        yearCode = dateObj.getFullYear().toString();
    }

    // 3. Generar Código: PROG-M#-MES-AÑO
    const autoCode = `${progCode}-M${moduleNumber}-${monthCode}-${yearCode}`;

    // 4. Generar Nombre Sugerido (Opcional)
    const autoName = selectedProgram ? `${selectedProgram.name} - Módulo ${moduleNumber}` : formData.name;

    // Actualizamos el estado solo si cambió algo para evitar loops infinitos
    setFormData(prev => {
        if (prev.code === autoCode && prev.name === autoName) return prev;
        return { 
            ...prev, 
            code: autoCode,
            name: (prev.name === '' || prev.name.includes('Módulo')) ? autoName : prev.name, // Solo sobrescribe si está vacío o parece autogenerado
            academic_year: yearCode
        };
    });

  }, [formData.program_id, formData.start_date, moduleNumber, programs, isCreateModalOpen]);


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

  const fetchPrograms = async () => {
    const { data } = await supabase.from('programs').select('*').eq('is_active', true);
    if (data) setPrograms(data);
  };

  // --- MANEJADORES DE FECHAS (LÓGICA ACTUALIZADA) ---

  // 1. Calculadora auxiliar
  const calculateDurationMsg = (start: string, end: string) => {
    if (!start || !end) return "";
    const s = new Date(start);
    const e = new Date(end);
    
    // Diferencia en días
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "⚠️ La fecha fin es anterior al inicio";

    // Semanas (redondeado)
    const exactWeeks = Math.round(diffDays / 7);
    return `📅 Hay: ${exactWeeks} semanas (${diffDays} días)`;
  };

  // 2. Cuando cambia INICIO (Sugiere +28 días)
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    
    if (!newStart) {
        setFormData(prev => ({ ...prev, start_date: '' }));
        setDurationMsg("");
        return;
    }

    // Calculamos Fin Sugerido (4 semanas)
    const startObj = new Date(newStart + 'T12:00:00');
    const endObj = new Date(startObj);
    endObj.setDate(startObj.getDate() + 28); 
    const suggestedEnd = endObj.toISOString().split('T')[0];

    setFormData(prev => ({ ...prev, start_date: newStart, end_date: suggestedEnd }));
    setDurationMsg(calculateDurationMsg(newStart, suggestedEnd));
  };

  // 3. Cuando cambia FIN (Recalcula duración real)
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    setFormData(prev => ({ ...prev, end_date: newEnd }));
    
    // Si ya hay inicio, recalculamos el mensaje
    if (formData.start_date && newEnd) {
        setDurationMsg(calculateDurationMsg(formData.start_date, newEnd));
    }
 };


  // --- Otros Manejadores ---

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
    setModuleNumber(1); // Resetear módulo a 1
    setSelectedDays([]);
    setDurationMsg("");
  }, []);

  const handleCreateCourse = async () => {
    // 1. Validaciones
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
      // 2. INSERTAR EL CURSO y pedir que nos devuelva el ID (.select().single())
      const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            code: formData.code,
            teacher_id: formData.teacher_id, // Guarda en la tabla simple
            program_id: formData.program_id || null,
            academic_year: formData.academic_year,
            semester: '2026-I',
            start_date: formData.start_date,
            end_date: formData.end_date,
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            number_of_modules: moduleNumber,
            schedule: selectedDays, 
            is_active: true,
            additional_teachers: formData.additional_teachers
          },
        ])
        .select() // IMPORTANTE: Pedimos los datos de vuelta
        .single(); // Para tener el objeto y no un array

      if (courseError) throw courseError;

      // 3. INSERTAR LA VINCULACIÓN EN course_teachers (La parte que faltaba)
      if (newCourse) {
         // Preparamos la lista de profes a insertar
         const teacherRelations = [];
         
         // A) El profesor titular
         teacherRelations.push({
            course_id: newCourse.id,
            teacher_id: formData.teacher_id,
            is_primary: true
         });

         // B) Profesores adicionales (si los hay)
         if (formData.additional_teachers && formData.additional_teachers.length > 0) {
             formData.additional_teachers.forEach((tId: string) => {
                 if (tId !== formData.teacher_id) { // Evitar duplicados
                     teacherRelations.push({
                        course_id: newCourse.id,
                        teacher_id: tId,
                        is_primary: false
                     });
                 }
             });
         }

         // Insertamos todos de golpe
         const { error: relationError } = await supabase
            .from('course_teachers')
            .insert(teacherRelations);
         
         if (relationError) {
             console.error("Error vinculando profesores:", relationError);
             toast({ title: "Advertencia", description: "Curso creado pero hubo error vinculando profesores.", variant: "warning" });
         } else {
             toast({ title: "Curso creado", description: "Apertura y profesores vinculados correctamente." });
         }
      }

      // 4. Limpieza final
      setIsCreateModalOpen(false);
      resetForm();
      fetchCourses();

    } catch (error: any) {
      console.error('Error:', error);
      toast({ title: "Error", description: error.message || "Error al crear el curso", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    
    // 1. Recuperar los días del horario
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

    // 2. Recuperar el N° de Módulo (Usamos 'as any' porque no está en tu interfaz Course explícitamente)
    const modNum = (course as any).number_of_modules || 1;
    setModuleNumber(modNum);

    // 3. Llenar el formulario con TODOS los datos
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
          start_time: formData.start_time,
          end_time: formData.end_time,
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

  // --- Helpers ---
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
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Gestión Académica</h1>
          <p className="text-gray-600">Administra el catálogo y las aperturas.</p>
          
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

        <Tabs defaultValue="courses" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="courses">Ediciones (Cursos)</TabsTrigger>
                <TabsTrigger value="programs">Catálogo (Programas)</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="space-y-6">
                
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
                            fetchPrograms();
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

            <TabsContent value="programs">
                <AdminProgramManagement />
            </TabsContent>
        </Tabs>

        {/* --- MODALES --- */}

        {/* 1. CREAR CURSO (MEJORADO CON AUTOMATIZACIÓN) */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Abrir Nueva Edición (Curso)</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
                
                {/* SECCIÓN 1: DEFINICIÓN BASE */}
                <div className="bg-gray-50 p-4 rounded border mb-4">
                    <div className="grid grid-cols-12 gap-4">
                        {/* PROGRAMA */}
                        <div className="col-span-8 space-y-2">
                            <Label>Catálogo </Label>
                            <Select 
                                value={formData.program_id} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, program_id: val }))}
                            >
                                <SelectTrigger><SelectValue placeholder="Seleccionar Programa..." /></SelectTrigger>
                                <SelectContent>
                                    {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* MÓDULO (NUEVO CAMPO) */}
                        <div className="col-span-4 space-y-2">
                            <Label>N° Módulo</Label>
                            <Input 
                                type="number" 
                                min="1" 
                                value={moduleNumber} 
                                onChange={(e) => setModuleNumber(parseInt(e.target.value) || 1)} 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <Label>Año Académico</Label>
                            <Input value={formData.academic_year} readOnly className="bg-gray-100" />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: IDENTIFICACIÓN (CON AUTO-CÓDIGO) */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nombre Edición</Label>
                        <Input value={formData.name} onChange={handleInputChange('name')} />
                    </div>
                    <div className="space-y-2 relative">
                        <Label className="flex justify-between">
                            Código 
                            <span className="text-xs text-blue-600 flex items-center gap-1"><Lock className="w-3 h-3"/> </span>
                        </Label>
                        <Input 
                            value={formData.code} 
                            readOnly 
                            className="bg-gray-100 text-gray-600 cursor-not-allowed font-mono"
                        />
                    </div>
                </div>

                {/* SECCIÓN 3: TIEMPO */}
                <div className="bg-blue-50 p-4 rounded border border-blue-100 space-y-3">
                    <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2"><Calendar className="h-4 w-4"/> Tiempo</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label className="text-blue-900">Inicio</Label><Input type="date" value={formData.start_date} onChange={handleStartDateChange} className="bg-white"/></div>
                        <div><Label className="text-blue-900">Fin</Label><Input type="date" value={formData.end_date} onChange={handleEndDateChange} className="bg-white"/></div>
                    </div>
                    {durationMsg && <p className="text-xs text-blue-700 font-medium animate-pulse">{durationMsg}</p>}
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

        {/* 2. EDITAR CURSO (DISEÑO MEJORADO: FOOTER FIJO) */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          {/* Cambiamos overflow-y-auto por flex flex-col para controlar el scroll interno */}
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
            
            {/* CABECERA FIJA */}
            <div className="p-6 pb-2">
                <DialogHeader>
                    <DialogTitle>Editar Curso: {editingCourse?.code}</DialogTitle>
                </DialogHeader>
            </div>
            
            {/* CUERPO CON SCROLL (El formulario va aquí) */}
            <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
                
                {/* SECCIÓN 1: PROGRAMA Y MÓDULO */}
                <div className="bg-gray-50 p-4 rounded border">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-8 space-y-2">
                            <Label>Catálogo</Label>
                            <Select 
                                value={formData.program_id} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, program_id: val }))}
                            >
                                <SelectTrigger><SelectValue placeholder="Seleccionar Programa..." /></SelectTrigger>
                                <SelectContent>
                                    {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-4 space-y-2">
                            <Label>N° Módulo</Label>
                            <Input 
                                type="number" 
                                min="1" 
                                value={moduleNumber} 
                                onChange={(e) => setModuleNumber(parseInt(e.target.value) || 1)} 
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: IDENTIFICACIÓN */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nombre Edición</Label>
                        <Input value={formData.name} onChange={handleInputChange('name')} />
                    </div>
                    <div className="space-y-2">
                        <Label>Código (No editable)</Label>
                        <Input 
                            value={formData.code} 
                            readOnly 
                            className="bg-gray-100 text-gray-500 font-mono cursor-not-allowed" 
                        />
                    </div>
                </div>

                {/* SECCIÓN 3: TIEMPO */}
                <div className="bg-blue-50 p-4 rounded border border-blue-100 space-y-3">
                    <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2"><Calendar className="h-4 w-4"/> Tiempo</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label className="text-blue-900">Inicio</Label><Input type="date" value={formData.start_date} onChange={handleStartDateChange} className="bg-white"/></div>
                        <div><Label className="text-blue-900">Fin</Label><Input type="date" value={formData.end_date} onChange={handleEndDateChange} className="bg-white"/></div>
                    </div>
                    {durationMsg && <p className="text-xs text-blue-700 font-medium">{durationMsg}</p>}
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label className="text-blue-900">Hora Inicio</Label><Input type="time" value={formData.start_time} onChange={handleInputChange('start_time')} className="bg-white"/></div>
                        <div><Label className="text-blue-900">Hora Fin</Label><Input type="time" value={formData.end_time} onChange={handleInputChange('end_time')} className="bg-white"/></div>
                    </div>
                </div>

                {/* SECCIÓN 4: PROFESOR Y DÍAS */}
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
                                <Badge 
                                    key={day.key} 
                                    variant={selectedDays.includes(day.key) ? 'default' : 'outline'} 
                                    className="cursor-pointer select-none hover:bg-blue-100" 
                                    onClick={() => toggleDaySelection(day.key)}
                                >
                                    {day.label.slice(0,3)}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Espacio extra al final para que no se pegue */}
                <div className="h-4"></div>
            </div>

            {/* FOOTER FIJO (Siempre visible al fondo) */}
            <div className="p-6 pt-2 border-t bg-gray-50/50 rounded-b-lg">
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleEditCourse} disabled={saving} className="bg-blue-600 text-white">Guardar Cambios</Button>
                </DialogFooter>
            </div>

          </DialogContent>
        </Dialog>
        
        {/* 3. ELIMINAR */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
             <DialogContent><DialogHeader><DialogTitle>Eliminar Curso</DialogTitle></DialogHeader><p>¿Estás seguro?</p>
             <DialogFooter><Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDeleteCourse}>Eliminar</Button></DialogFooter></DialogContent>
        </Dialog>

        {/* 4. ASIGNACIÓN MASIVA */}
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