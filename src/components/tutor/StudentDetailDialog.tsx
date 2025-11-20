import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Phone, Calendar, BookOpen, CheckCircle, XCircle, Clock, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  paternal_surname: string;
  maternal_surname: string;
  student_code: string;
  email: string;
  phone?: string;
  document_number?: string;
  birth_date?: string;
}

interface CourseGrade {
  course_name: string;
  course_code: string;
  assignment_title: string;
  score: number;
  max_score: number;
  submitted_at: string;
  graded_at: string;
  feedback?: string;
}

interface CourseAttendance {
  course_name: string;
  course_code: string;
  date: string;
  status: string;
  notes?: string;
}

interface StudentDetailDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroomId: string;
}

export function StudentDetailDialog({ student, open, onOpenChange, classroomId }: StudentDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState<CourseGrade[]>([]);
  const [attendance, setAttendance] = useState<CourseAttendance[]>([]);

  useEffect(() => {
    if (student && open) {
      fetchStudentDetails();
    }
  }, [student, open]);

  const fetchStudentDetails = async () => {
    if (!student) return;

    try {
      setLoading(true);

      // Get courses from this classroom
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('classroom_id', classroomId);

      if (coursesError) throw coursesError;

      const courseIds = coursesData.map(c => c.id);

      // Fetch grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('assignment_submissions')
        .select(`
          score,
          submitted_at,
          graded_at,
          feedback,
          assignment_id,
          assignments!inner(
            title,
            max_score,
            course_id,
            courses!inner(
              name,
              code
            )
          )
        `)
        .eq('student_id', student.id)
        .in('assignments.course_id', courseIds)
        .not('score', 'is', null)
        .order('graded_at', { ascending: false });

      if (gradesError) throw gradesError;

      const formattedGrades: CourseGrade[] = gradesData.map(g => ({
        course_name: (g.assignments as any).courses.name,
        course_code: (g.assignments as any).courses.code,
        assignment_title: (g.assignments as any).title,
        score: Number(g.score),
        max_score: Number((g.assignments as any).max_score),
        submitted_at: g.submitted_at || '',
        graded_at: g.graded_at || '',
        feedback: g.feedback || undefined
      }));

      setGrades(formattedGrades);

      // Fetch attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          date,
          status,
          notes,
          course_id,
          courses!inner(
            name,
            code
          )
        `)
        .eq('student_id', student.id)
        .in('course_id', courseIds)
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      const formattedAttendance: CourseAttendance[] = attendanceData.map(a => ({
        course_name: (a.courses as any).name,
        course_code: (a.courses as any).code,
        date: a.date,
        status: a.status || 'present',
        notes: a.notes || undefined
      }));

      setAttendance(formattedAttendance);

    } catch (error) {
      console.error('Error fetching student details:', error);
      toast.error('Error al cargar los detalles del estudiante');
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

  const getGradeBadgeVariant = (score: number): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (score >= 18) return 'default';
    if (score >= 14) return 'secondary';
    if (score >= 11) return 'outline';
    return 'destructive';
  };

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'justified':
        return <FileCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getAttendanceLabel = (status: string): string => {
    switch (status) {
      case 'present':
        return 'Presente';
      case 'absent':
        return 'Ausente';
      case 'late':
        return 'Tardanza';
      case 'justified':
        return 'Justificado';
      default:
        return 'Presente';
    }
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {student.paternal_surname} {student.maternal_surname}, {student.first_name}
          </DialogTitle>
          <DialogDescription>
            Información detallada del estudiante y su desempeño académico
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.email}</span>
                </div>
                {student.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{student.phone}</span>
                  </div>
                )}
                {student.birth_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Fecha de nacimiento: {format(new Date(student.birth_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                )}
                {student.document_number && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">DNI: {student.document_number}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Código: {student.student_code}</span>
                </div>
              </CardContent>
            </Card>

            {/* Academic Details */}
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            ) : (
              <Tabs defaultValue="grades" className="space-y-4">
                <TabsList className="w-full">
                  <TabsTrigger value="grades" className="flex-1">
                    Calificaciones ({grades.length})
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="flex-1">
                    Asistencia ({attendance.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="grades" className="space-y-4">
                  {grades.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No hay calificaciones registradas
                      </CardContent>
                    </Card>
                  ) : (
                    grades.map((grade, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{grade.assignment_title}</CardTitle>
                              <CardDescription>
                                {grade.course_name} ({grade.course_code})
                              </CardDescription>
                            </div>
                            <Badge variant={getGradeBadgeVariant(grade.score)}>
                              {grade.score} - {getGradeLetter(grade.score)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Puntuación</span>
                            <span className="font-medium">{grade.score} / {grade.max_score}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Calificado</span>
                            <span>{format(new Date(grade.graded_at), 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                          {grade.feedback && (
                            <div className="pt-2 border-t">
                              <p className="text-sm font-medium mb-1">Retroalimentación:</p>
                              <p className="text-sm text-muted-foreground">{grade.feedback}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                  {attendance.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No hay registros de asistencia
                      </CardContent>
                    </Card>
                  ) : (
                    attendance.map((record, index) => (
                      <Card key={index}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getAttendanceIcon(record.status)}
                                <span className="font-medium">{getAttendanceLabel(record.status)}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {record.course_name} ({record.course_code})
                              </p>
                              {record.notes && (
                                <p className="text-sm text-muted-foreground italic">{record.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{format(new Date(record.date), 'dd/MM/yyyy')}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
