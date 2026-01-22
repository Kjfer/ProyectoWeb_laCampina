import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface Course {
  id: string;
  name: string;
  code: string;
}

interface AttendanceRecord {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  recorded_at: string | null;
}

interface AttendanceReport {
  course: Course;
  date: string;
  statistics: {
    total_students: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    not_recorded: number;
  };
  all_students: AttendanceRecord[];
  absent_students: AttendanceRecord[];
}

const AdminAttendanceReport = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingDates, setLoadingDates] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, code')
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error cargando cursos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los cursos',
        variant: 'destructive',
      });
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchClassDates = async (courseId: string) => {
    setLoadingDates(true);
    setAvailableDates([]);
    setSelectedDate('');
    setReport(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const SUPABASE_URL = "https://bnbtmubibnupttnnhijr.supabase.co";
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-course-class-dates?course_id=${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error cargando fechas');
      }

      const data = await response.json();
      setAvailableDates(data.dates || []);

      if (data.dates && data.dates.length === 0) {
        toast({
          title: 'Sin clases disponibles',
          description: 'Este curso no tiene clases con asistencia registrada',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error cargando fechas:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las fechas de clase',
        variant: 'destructive',
      });
    } finally {
      setLoadingDates(false);
    }
  };

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    if (courseId) {
      fetchClassDates(courseId);
    } else {
      setAvailableDates([]);
      setSelectedDate('');
      setReport(null);
    }
  };

  const generateReport = async () => {
    if (!selectedCourse || !selectedDate) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor selecciona un curso y una fecha de clase',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const SUPABASE_URL = "https://bnbtmubibnupttnnhijr.supabase.co";
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-attendance-report?course_id=${selectedCourse}&date=${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generando reporte');
      }

      const data = await response.json();
      setReport(data);

      toast({
        title: 'Reporte generado',
        description: 'El reporte de asistencia se generó correctamente',
      });
    } catch (error) {
      console.error('Error generando reporte:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo generar el reporte',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!report) return;

    // Preparar datos para Excel
    const excelData = report.all_students.map(student => ({
      'Nombre': student.first_name,
      'Apellido': student.last_name,
      'Email': student.email,
      'Teléfono': student.phone || 'No registrado',
      'Estado': getStatusLabel(student.status),
      'Notas': student.notes || '',
      'Registrado': student.recorded_at ? format(new Date(student.recorded_at), 'dd/MM/yyyy HH:mm', { locale: es }) : 'No registrado'
    }));

    // Crear hoja de estadísticas
    const statsData = [
      ['REPORTE DE ASISTENCIA'],
      [''],
      ['Curso:', report.course.name],
      ['Código:', report.course.code],
      ['Fecha:', format(new Date(report.date), 'dd/MM/yyyy', { locale: es })],
      [''],
      ['ESTADÍSTICAS'],
      ['Total de estudiantes:', report.statistics.total_students],
      ['Presentes:', report.statistics.present],
      ['Ausentes:', report.statistics.absent],
      ['Tardíos:', report.statistics.late],
      ['Excusados:', report.statistics.excused],
      ['Sin registrar:', report.statistics.not_recorded],
      [''],
      ['DETALLE DE ASISTENCIA']
    ];

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Hoja de resumen
    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, 'Resumen');

    // Hoja de todos los estudiantes
    const wsAll = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, wsAll, 'Todos los Estudiantes');

    // Hoja de estudiantes ausentes
    const absentData = report.absent_students.map(student => ({
      'Nombre': student.first_name,
      'Apellido': student.last_name,
      'Email': student.email,
      'Teléfono': student.phone || 'No registrado',
      'Estado': getStatusLabel(student.status),
      'Notas': student.notes || ''
    }));
    const wsAbsent = XLSX.utils.json_to_sheet(absentData);
    XLSX.utils.book_append_sheet(wb, wsAbsent, 'Estudiantes Ausentes');

    // Generar nombre de archivo
    const fileName = `Asistencia_${report.course.code}_${format(new Date(report.date), 'yyyy-MM-dd')}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, fileName);

    toast({
      title: 'Exportación exitosa',
      description: 'El reporte se ha descargado en formato Excel',
    });
  };

  const getStatusLabel = (status: string): string => {
    const labels: { [key: string]: string } = {
      present: 'Presente',
      absent: 'Ausente',
      late: 'Tardío',
      excused: 'Excusado',
      not_recorded: 'Sin registrar'
    };
    return labels[status] || status;
  };

  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'present':
        return 'default';
      case 'absent':
        return 'destructive';
      case 'late':
        return 'secondary';
      case 'excused':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Acceso Denegado</CardTitle>
              <CardDescription>
                No tienes permisos para acceder a esta funcionalidad
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reporte de Asistencia</h1>
          <p className="mt-2 text-gray-600">
            Genera reportes de asistencia por curso y clase específica, con exportación a Excel
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seleccionar Parámetros</CardTitle>
            <CardDescription>
              Selecciona un curso y una fecha de clase para generar el reporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Selector de Curso */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Curso</label>
                <Select 
                  value={selectedCourse} 
                  onValueChange={handleCourseChange}
                  disabled={loadingCourses}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar curso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Fecha de Clase */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Clase</label>
                <Select 
                  value={selectedDate} 
                  onValueChange={setSelectedDate}
                  disabled={!selectedCourse || loadingDates || availableDates.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingDates 
                        ? "Cargando fechas..." 
                        : availableDates.length === 0 && selectedCourse
                        ? "Sin clases disponibles"
                        : "Seleccionar fecha de clase..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map((date) => (
                      <SelectItem key={date} value={date}>
                        {format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy - EEEE', { locale: es })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCourse && availableDates.length === 0 && !loadingDates && (
                  <p className="text-xs text-gray-500">
                    Solo se muestran clases pasadas con asistencia registrada
                  </p>
                )}
              </div>

              {/* Botón Generar */}
              <div className="space-y-2">
                <label className="text-sm font-medium invisible">Acción</label>
                <Button 
                  onClick={generateReport} 
                  disabled={loading || !selectedCourse || !selectedDate}
                  className="w-full"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? 'Generando...' : 'Generar Reporte'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reporte */}
        {report && (
          <>
            {/* Estadísticas */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{report.course.name}</CardTitle>
                  <CardDescription>
                    {report.course.code} - {format(new Date(report.date), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                  </CardDescription>
                </div>
                <Button onClick={exportToExcel} variant="outline">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar a Excel
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {report.statistics.total_students}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {report.statistics.present}
                    </div>
                    <div className="text-sm text-green-600">Presentes</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {report.statistics.absent}
                    </div>
                    <div className="text-sm text-red-600">Ausentes</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {report.statistics.late}
                    </div>
                    <div className="text-sm text-yellow-600">Tardíos</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {report.statistics.excused}
                    </div>
                    <div className="text-sm text-blue-600">Excusados</div>
                  </div>
                  <div className="text-center p-4 bg-gray-100 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {report.statistics.not_recorded}
                    </div>
                    <div className="text-sm text-gray-600">Sin registrar</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de estudiantes ausentes */}
            {report.absent_students.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-red-600">
                    Estudiantes Ausentes ({report.absent_students.length})
                  </CardTitle>
                  <CardDescription>
                    Lista de estudiantes que no asistieron a clase
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.absent_students.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium">
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.phone || 'No registrado'}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(student.status)}>
                              {getStatusLabel(student.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {student.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Tabla completa de asistencia */}
            <Card>
              <CardHeader>
                <CardTitle>Registro Completo de Asistencia</CardTitle>
                <CardDescription>
                  Todos los estudiantes matriculados en el curso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.all_students.map((student) => (
                      <TableRow key={student.student_id}>
                        <TableCell className="font-medium">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.phone || 'No registrado'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(student.status)}>
                            {getStatusLabel(student.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {student.notes || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {student.recorded_at 
                            ? format(new Date(student.recorded_at), 'dd/MM/yyyy HH:mm', { locale: es })
                            : 'No registrado'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {!report && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Download className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center">
                Selecciona un curso y una fecha de clase para generar el reporte de asistencia
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAttendanceReport;
