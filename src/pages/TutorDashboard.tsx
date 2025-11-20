import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Users, GraduationCap, Calendar, AlertCircle, Eye, Search, BookOpen, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTutorDashboard } from '@/hooks/queries/useTutorData';
import { StudentDetailDialog } from '@/components/tutor/StudentDetailDialog';
import { StatCard } from '@/components/tutor/StatCard';
import { AttendanceBarChart } from '@/components/tutor/AttendanceBarChart';
import { GradeDistributionChart } from '@/components/tutor/GradeDistributionChart';
import { StudentsAtRiskTable } from '@/components/tutor/StudentsAtRiskTable';
import { CoursePerformanceTable } from '@/components/tutor/CoursePerformanceTable';

export default function TutorDashboard() {
  const { profile } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: tutorData, isLoading: loading, error } = useTutorDashboard(profile?.id);

  const classroom = tutorData?.classroom || null;
  const students = tutorData?.students || [];
  const courses = tutorData?.courses || [];
  const attendanceData = tutorData?.attendanceData || [];
  const gradeData = tutorData?.gradeData || [];

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

  // Calculate students at risk
  const studentsAtRisk = students
    .map(student => {
      const attendance = attendanceData.find(a => a.student_id === student.id);
      const grades = gradeData.find(g => g.student_id === student.id);
      
      const attendanceRate = attendance?.attendance_rate || 0;
      const averageScore = grades?.average_score || 0;
      
      const riskFactors: string[] = [];
      if (attendanceRate < 75) riskFactors.push('Asistencia baja');
      if (averageScore > 0 && averageScore < 11) riskFactors.push('Bajo rendimiento');
      if (attendanceRate < 60) riskFactors.push('Asistencia crítica');
      
      return {
        student,
        attendanceRate,
        averageScore,
        riskFactors
      };
    })
    .filter(item => item.riskFactors.length > 0);

  // Calculate course performance
  const coursePerformance = courses.map(course => {
    const courseAttendance = attendanceData.filter(a => {
      // We need to check if this attendance belongs to this course
      // Since we're aggregating, we'll calculate average across all courses for now
      return true;
    });
    
    const courseGrades = gradeData.filter(g => g.total_graded > 0);
    
    const avgAttendance = courseAttendance.length > 0
      ? courseAttendance.reduce((acc, a) => acc + a.attendance_rate, 0) / courseAttendance.length
      : 0;
      
    const avgScore = courseGrades.length > 0
      ? courseGrades.reduce((acc, g) => acc + g.average_score, 0) / courseGrades.length
      : 0;
    
    return {
      courseName: course.name,
      attendanceRate: avgAttendance,
      averageScore: avgScore,
      studentCount: students.length
    };
  });

  // Prepare attendance chart data
  const attendanceChartData = courses.map(course => ({
    course: course.name,
    attendanceRate: coursePerformance.find(cp => cp.courseName === course.name)?.attendanceRate || 0
  }));

  // Prepare grade distribution data
  const totalGradeDistribution = gradeData.reduce(
    (acc, g) => ({
      ad: acc.ad + g.ad_count,
      a: acc.a + g.a_count,
      b: acc.b + g.b_count,
      c: acc.c + g.c_count
    }),
    { ad: 0, a: 0, b: 0, c: 0 }
  );

  // Filter students by search
  const filteredStudents = students.filter(student => {
    const fullName = `${student.paternal_surname} ${student.maternal_surname} ${student.first_name} ${student.student_code}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const studentsWithGoodPerformance = students.filter(student => {
    const attendance = attendanceData.find(a => a.student_id === student.id);
    const grades = gradeData.find(g => g.student_id === student.id);
    return (attendance?.attendance_rate || 0) >= 90 && (grades?.average_score || 0) >= 14;
  }).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Tutoría</h1>
          <p className="text-muted-foreground">
            {classroom.name} - {classroom.grade} {classroom.section} ({classroom.education_level})
          </p>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Estudiantes"
            value={students.length}
            icon={Users}
            description="En el aula virtual"
          />
          
          <StatCard
            title="Asistencia Promedio"
            value={`${overallAttendanceRate.toFixed(1)}%`}
            icon={Calendar}
            description="Del aula virtual"
            trend={overallAttendanceRate >= 85 ? 'up' : overallAttendanceRate >= 75 ? 'neutral' : 'down'}
            trendValue={overallAttendanceRate >= 85 ? 'Excelente' : overallAttendanceRate >= 75 ? 'Buena' : 'Requiere atención'}
          />
          
          <StatCard
            title="Promedio General"
            value={`${overallAverageScore.toFixed(1)} - ${getGradeLetter(overallAverageScore)}`}
            icon={GraduationCap}
            description="De tareas calificadas"
            trend={overallAverageScore >= 14 ? 'up' : overallAverageScore >= 11 ? 'neutral' : 'down'}
            trendValue={overallAverageScore >= 14 ? 'Sobresaliente' : overallAverageScore >= 11 ? 'Satisfactorio' : 'Necesita mejorar'}
          />
          
          <StatCard
            title="Estudiantes Destacados"
            value={studentsWithGoodPerformance}
            icon={Target}
            description="Con +90% asistencia y +14 promedio"
            trend={studentsWithGoodPerformance > students.length * 0.5 ? 'up' : 'neutral'}
            trendValue={`${((studentsWithGoodPerformance / students.length) * 100).toFixed(0)}% del aula`}
          />
        </div>

        {/* Visualizations */}
        <div className="grid gap-4 md:grid-cols-2">
          <AttendanceBarChart data={attendanceChartData} />
          <GradeDistributionChart data={totalGradeDistribution} />
        </div>

        {/* Students at Risk */}
        <StudentsAtRiskTable 
          students={studentsAtRisk}
          onViewDetails={setSelectedStudent}
        />

        {/* Course Performance */}
        {coursePerformance.length > 0 && (
          <CoursePerformanceTable courses={coursePerformance} />
        )}

        {/* Student Details with Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detalles por Estudiante</CardTitle>
                <CardDescription>Busca y revisa el desempeño individual</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar estudiante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

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
                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron estudiantes que coincidan con la búsqueda
                    </div>
                  )}
                  {filteredStudents.map(student => {
                    const grades = gradeData.find(g => g.student_id === student.id);
                    if (!grades || grades.total_graded === 0) {
                      return (
                        <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                          <div className="flex-1">
                            <p className="font-medium">
                              {student.paternal_surname} {student.maternal_surname}, {student.first_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{student.student_code}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Sin calificaciones</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedStudent(student)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={student.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg gap-4">
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
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <Badge variant="default">
                              {grades.average_score.toFixed(1)} - {getGradeLetter(grades.average_score)}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {grades.total_graded} tareas
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedStudent(student)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron estudiantes que coincidan con la búsqueda
                    </div>
                  )}
                  {filteredStudents.map(student => {
                    const attendance = attendanceData.find(a => a.student_id === student.id);
                    if (!attendance || attendance.total === 0) {
                      return (
                        <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                          <div className="flex-1">
                            <p className="font-medium">
                              {student.paternal_surname} {student.maternal_surname}, {student.first_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{student.student_code}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Sin registros</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedStudent(student)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    const status = getAttendanceStatus(attendance.attendance_rate);

                    return (
                      <div key={student.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg gap-4">
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
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <Badge variant={status.variant}>
                              {attendance.attendance_rate.toFixed(1)}% - {status.label}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {attendance.total} clases
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedStudent(student)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <StudentDetailDialog
          student={selectedStudent}
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          classroomId={classroom?.id || ''}
        />
      </div>
    </DashboardLayout>
  );
}
