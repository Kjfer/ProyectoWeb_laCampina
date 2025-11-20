import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, GraduationCap, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VirtualClassroom {
  id: string;
  name: string;
  grade: string;
  section: string;
  education_level: string;
  academic_year: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  paternal_surname: string;
  maternal_surname: string;
  student_code: string;
  email: string;
}

interface AttendanceRecord {
  student_id: string;
  present: number;
  absent: number;
  late: number;
  justified: number;
  total: number;
  attendance_rate: number;
}

interface GradeRecord {
  student_id: string;
  ad_count: number;
  a_count: number;
  b_count: number;
  c_count: number;
  total_graded: number;
  average_score: number;
}

export default function TutorDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classroom, setClassroom] = useState<VirtualClassroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [gradeData, setGradeData] = useState<GradeRecord[]>([]);

  useEffect(() => {
    if (profile?.role === 'tutor') {
      fetchTutorData();
    }
  }, [profile]);

  const fetchTutorData = async () => {
    try {
      setLoading(true);

      // Fetch assigned classroom
      const { data: classroomData, error: classroomError } = await supabase
        .from('virtual_classrooms')
        .select('*')
        .eq('tutor_id', profile?.id)
        .single();

      if (classroomError) {
        if (classroomError.code === 'PGRST116') {
          toast.error('No tienes un aula virtual asignada');
          setLoading(false);
          return;
        }
        throw classroomError;
      }

      setClassroom(classroomData);

      // Fetch students enrolled in classroom courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('classroom_id', classroomData.id);

      if (coursesError) throw coursesError;

      const courseIds = coursesData.map(c => c.id);

      if (courseIds.length > 0) {
        // Fetch students
        const { data: studentsData, error: studentsError } = await supabase
          .from('course_enrollments')
          .select('student_id, profiles!inner(*)')
          .in('course_id', courseIds);

        if (studentsError) throw studentsError;

        // Remove duplicates
        const uniqueStudents = Array.from(
          new Map(studentsData.map(item => [item.student_id, item.profiles])).values()
        ) as Student[];

        setStudents(uniqueStudents);

        // Fetch attendance data
        const studentIds = uniqueStudents.map(s => s.id);
        const { data: attendanceRaw, error: attendanceError } = await supabase
          .from('attendance')
          .select('student_id, status')
          .in('student_id', studentIds)
          .in('course_id', courseIds);

        if (attendanceError) throw attendanceError;

        // Process attendance data
        const attendanceMap = new Map<string, AttendanceRecord>();
        studentIds.forEach(studentId => {
          attendanceMap.set(studentId, {
            student_id: studentId,
            present: 0,
            absent: 0,
            late: 0,
            justified: 0,
            total: 0,
            attendance_rate: 0
          });
        });

        attendanceRaw?.forEach(record => {
          const current = attendanceMap.get(record.student_id)!;
          current.total++;
          if (record.status === 'present') current.present++;
          else if (record.status === 'absent') current.absent++;
          else if (record.status === 'late') current.late++;
          else if (record.status === 'justified') current.justified++;
        });

        attendanceMap.forEach((record, studentId) => {
          if (record.total > 0) {
            record.attendance_rate = (record.present / record.total) * 100;
          }
        });

        setAttendanceData(Array.from(attendanceMap.values()));

        // Fetch grades data
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('assignment_submissions')
          .select('student_id, score, assignment_id, assignments!inner(course_id)')
          .in('student_id', studentIds)
          .not('score', 'is', null);

        if (submissionsError) throw submissionsError;

        // Filter by course IDs
        const filteredSubmissions = submissionsData.filter(sub => 
          courseIds.includes((sub.assignments as any).course_id)
        );

        // Process grades data
        const gradeMap = new Map<string, GradeRecord>();
        studentIds.forEach(studentId => {
          gradeMap.set(studentId, {
            student_id: studentId,
            ad_count: 0,
            a_count: 0,
            b_count: 0,
            c_count: 0,
            total_graded: 0,
            average_score: 0
          });
        });

        let totalScore = 0;
        filteredSubmissions.forEach(sub => {
          const current = gradeMap.get(sub.student_id)!;
          current.total_graded++;
          const score = Number(sub.score);
          totalScore += score;

          if (score >= 18) current.ad_count++;
          else if (score >= 14) current.a_count++;
          else if (score >= 11) current.b_count++;
          else current.c_count++;
        });

        gradeMap.forEach((record) => {
          if (record.total_graded > 0) {
            const studentSubmissions = filteredSubmissions.filter(s => s.student_id === record.student_id);
            const sum = studentSubmissions.reduce((acc, s) => acc + Number(s.score), 0);
            record.average_score = sum / record.total_graded;
          }
        });

        setGradeData(Array.from(gradeMap.values()));
      }

    } catch (error) {
      console.error('Error fetching tutor data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getGradeLetter = (score: number): string => {
    if (score >= 18) return 'AD';
    if (score >= 14) return 'A';
    if (score >= 11) return 'B';
    return 'C';
  };

  const getAttendanceStatus = (rate: number): { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' } => {
    if (rate >= 90) return { label: 'Excelente', variant: 'default' };
    if (rate >= 75) return { label: 'Buena', variant: 'secondary' };
    if (rate >= 60) return { label: 'Regular', variant: 'outline' };
    return { label: 'Crítica', variant: 'destructive' };
  };

  if (profile?.role !== 'tutor') {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para acceder a este dashboard. Solo tutores pueden ver esta página.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!classroom) {
    return (
      <DashboardLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes un aula virtual asignada. Contacta al administrador para que te asigne un aula.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const overallAttendanceRate = attendanceData.length > 0
    ? attendanceData.reduce((acc, r) => acc + r.attendance_rate, 0) / attendanceData.length
    : 0;

  const overallAverageScore = gradeData.length > 0
    ? gradeData.reduce((acc, r) => acc + r.average_score, 0) / gradeData.length
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Tutoría</h1>
          <p className="text-muted-foreground">
            {classroom.name} - {classroom.grade} {classroom.section} ({classroom.education_level})
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
              <p className="text-xs text-muted-foreground">
                En el aula virtual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallAttendanceRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Del aula virtual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallAverageScore.toFixed(1)} - {getGradeLetter(overallAverageScore)}
              </div>
              <p className="text-xs text-muted-foreground">
                De tareas calificadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Año Académico</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classroom.academic_year}</div>
              <p className="text-xs text-muted-foreground">
                Actual
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Student Details */}
        <Tabs defaultValue="grades" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grades">Calificaciones</TabsTrigger>
            <TabsTrigger value="attendance">Asistencia</TabsTrigger>
          </TabsList>

          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Desempeño Académico por Estudiante</CardTitle>
                <CardDescription>
                  Calificaciones de tareas entregadas y evaluadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map(student => {
                    const grades = gradeData.find(g => g.student_id === student.id);
                    if (!grades || grades.total_graded === 0) {
                      return (
                        <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {student.paternal_surname} {student.maternal_surname}, {student.first_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{student.student_code}</p>
                          </div>
                          <Badge variant="outline">Sin calificaciones</Badge>
                        </div>
                      );
                    }

                    return (
                      <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex-1">
                          <p className="font-medium">
                            {student.paternal_surname} {student.maternal_surname}, {student.first_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{student.student_code}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="text-center px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded">
                            <div className="text-xs text-muted-foreground">AD</div>
                            <div className="font-bold text-green-700 dark:text-green-400">{grades.ad_count}</div>
                          </div>
                          <div className="text-center px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded">
                            <div className="text-xs text-muted-foreground">A</div>
                            <div className="font-bold text-blue-700 dark:text-blue-400">{grades.a_count}</div>
                          </div>
                          <div className="text-center px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                            <div className="text-xs text-muted-foreground">B</div>
                            <div className="font-bold text-yellow-700 dark:text-yellow-400">{grades.b_count}</div>
                          </div>
                          <div className="text-center px-3 py-1 bg-red-100 dark:bg-red-900/20 rounded">
                            <div className="text-xs text-muted-foreground">C</div>
                            <div className="font-bold text-red-700 dark:text-red-400">{grades.c_count}</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <Badge variant="default">
                            {grades.average_score.toFixed(1)} - {getGradeLetter(grades.average_score)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {grades.total_graded} tareas
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Asistencia por Estudiante</CardTitle>
                <CardDescription>
                  Registro de asistencia en todos los cursos del aula
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map(student => {
                    const attendance = attendanceData.find(a => a.student_id === student.id);
                    if (!attendance || attendance.total === 0) {
                      return (
                        <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {student.paternal_surname} {student.maternal_surname}, {student.first_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{student.student_code}</p>
                          </div>
                          <Badge variant="outline">Sin registros</Badge>
                        </div>
                      );
                    }

                    const status = getAttendanceStatus(attendance.attendance_rate);

                    return (
                      <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex-1">
                          <p className="font-medium">
                            {student.paternal_surname} {student.maternal_surname}, {student.first_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{student.student_code}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="text-center px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded">
                            <div className="text-xs text-muted-foreground">Presente</div>
                            <div className="font-bold text-green-700 dark:text-green-400">{attendance.present}</div>
                          </div>
                          <div className="text-center px-3 py-1 bg-red-100 dark:bg-red-900/20 rounded">
                            <div className="text-xs text-muted-foreground">Falta</div>
                            <div className="font-bold text-red-700 dark:text-red-400">{attendance.absent}</div>
                          </div>
                          <div className="text-center px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                            <div className="text-xs text-muted-foreground">Tarde</div>
                            <div className="font-bold text-yellow-700 dark:text-yellow-400">{attendance.late}</div>
                          </div>
                          <div className="text-center px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded">
                            <div className="text-xs text-muted-foreground">Justif.</div>
                            <div className="font-bold text-blue-700 dark:text-blue-400">{attendance.justified}</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <Badge variant={status.variant}>
                            {attendance.attendance_rate.toFixed(1)}% - {status.label}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {attendance.total} clases
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
