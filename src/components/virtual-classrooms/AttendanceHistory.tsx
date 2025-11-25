import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, FileCheck, Calendar, Download, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'late' | 'absent' | 'justified';
  notes: string | null;
  student?: Student;
}

interface AttendanceHistoryProps {
  classroomId: string;
}

export function AttendanceHistory({ classroomId }: AttendanceHistoryProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedStudent, setSelectedStudent] = useState<string>('all');

  useEffect(() => {
    fetchStudents();
  }, [classroomId]);

  useEffect(() => {
    if (students.length > 0) {
      fetchAttendanceRecords();
    }
  }, [selectedMonth, selectedStudent, students]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      // Get students enrolled in courses of this classroom
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          student:profiles!course_enrollments_student_id_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          course:courses!course_enrollments_course_id_fkey(
            classroom_id
          )
        `);

      if (error) throw error;

      // Filter by classroom and extract unique students
      const uniqueStudents = data
        ?.filter(enrollment => enrollment.course?.classroom_id === classroomId)
        ?.map(enrollment => enrollment.student)
        .filter((student, index, self) => 
          student && self.findIndex(s => s?.id === student?.id) === index
        ) || [];

      setStudents(uniqueStudents.filter(Boolean) as Student[]);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      let query = supabase
        .from('attendance')
        .select(`
          *,
          student:profiles!attendance_student_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('classroom_id', classroomId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (selectedStudent !== 'all') {
        query = query.eq('student_id', selectedStudent);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Error al cargar el historial de asistencia');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'justified':
        return <FileCheck className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusLabel = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return 'Presente';
      case 'late':
        return 'Tardanza';
      case 'absent':
        return 'Ausente';
      case 'justified':
        return 'Justificado';
    }
  };

  const getStatusBadgeVariant = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return 'default';
      case 'late':
        return 'secondary';
      case 'absent':
        return 'destructive';
      case 'justified':
        return 'outline';
    }
  };

  const calculateStats = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const justified = attendanceRecords.filter(r => r.status === 'justified').length;
    const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

    return { total, present, late, absent, justified, attendanceRate };
  };

  const stats = calculateStats();

  const handleExportToCSV = () => {
    const headers = ['Fecha', 'Estudiante', 'Email', 'Estado', 'Observaciones'];
    const rows = attendanceRecords.map(record => [
      format(new Date(record.date), 'dd/MM/yyyy'),
      `${record.student?.first_name} ${record.student?.last_name}`,
      record.student?.email || '',
      getStatusLabel(record.status),
      record.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `asistencia_${format(selectedMonth, 'yyyy-MM')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Historial exportado exitosamente');
  };

  // Get unique dates from records
  const uniqueDates = Array.from(new Set(attendanceRecords.map(r => r.date))).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historial de Asistencia
              </CardTitle>
              <CardDescription>
                Registro histórico de asistencias del aula virtual
              </CardDescription>
            </div>
            <Button onClick={handleExportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Mes</label>
              <Select
                value={format(selectedMonth, 'yyyy-MM')}
                onValueChange={(value) => {
                  const [year, month] = value.split('-');
                  setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    return date;
                  }).map(date => (
                    <SelectItem key={format(date, 'yyyy-MM')} value={format(date, 'yyyy-MM')}>
                      {format(date, 'MMMM yyyy', { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Estudiante</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estudiantes</SelectItem>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presentes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tardanzas</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausentes</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Justificados</CardTitle>
            <FileCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.justified}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Asistencia</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.attendanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Records by Date */}
      <Card>
        <CardHeader>
          <CardTitle>Registros por Fecha</CardTitle>
          <CardDescription>
            Mostrando {attendanceRecords.length} registros para {format(selectedMonth, 'MMMM yyyy', { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : uniqueDates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay registros de asistencia para este período</p>
            </div>
          ) : (
            <div className="space-y-6">
              {uniqueDates.map(date => {
                const dateRecords = attendanceRecords.filter(r => r.date === date);
                const dateStats = {
                  present: dateRecords.filter(r => r.status === 'present').length,
                  late: dateRecords.filter(r => r.status === 'late').length,
                  absent: dateRecords.filter(r => r.status === 'absent').length,
                  justified: dateRecords.filter(r => r.status === 'justified').length,
                };

                return (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">
                        {format(new Date(date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                      </h3>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-green-50">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                          {dateStats.present}
                        </Badge>
                        <Badge variant="outline" className="bg-yellow-50">
                          <Clock className="h-3 w-3 mr-1 text-yellow-600" />
                          {dateStats.late}
                        </Badge>
                        <Badge variant="outline" className="bg-red-50">
                          <XCircle className="h-3 w-3 mr-1 text-red-600" />
                          {dateStats.absent}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50">
                          <FileCheck className="h-3 w-3 mr-1 text-blue-600" />
                          {dateStats.justified}
                        </Badge>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Estudiante</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="w-[150px]">Estado</TableHead>
                          <TableHead>Observaciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dateRecords.map((record, index) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              {record.student?.first_name} {record.student?.last_name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {record.student?.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(record.status)}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(record.status)}
                                  {getStatusLabel(record.status)}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {record.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
