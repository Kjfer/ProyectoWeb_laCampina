import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, Calendar, Clock, Download, ArrowLeft, User, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const GRADE_VALUES = {
  'AD': 20,
  'A': 17,
  'B': 14,
  'C': 11
} as const;

const getLetterGrade = (score: number | null): string => {
  if (score === null) return '';
  if (score >= 18) return 'AD';
  if (score >= 15) return 'A';
  if (score >= 11) return 'B';
  return 'C';
};

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  course: {
    id: string;
    name: string;
    code: string;
  };
}

interface Submission {
  id: string;
  student_id: string;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

const AssignmentReview = () => {
  const { assignmentId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      navigate('/assignments');
      return;
    }
    fetchAssignmentData();
  }, [assignmentId, profile]);

  const fetchAssignmentData = async () => {
    if (!assignmentId) return;

    try {
      setLoading(true);

      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          course:courses (
            id,
            name,
            code
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Fetch submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          student_id,
          content,
          file_path,
          file_name,
          file_size,
          mime_type,
          score,
          feedback,
          submitted_at,
          graded_at,
          student:profiles!assignment_submissions_student_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      console.log('Assignment submissions data:', submissionsData);

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);

    } catch (error) {
      console.error('Error fetching assignment data:', error);
      toast.error('Error al cargar la información de la tarea');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    console.log('Selected submission:', submission);
    console.log('Submission content:', submission.content);
    setScore(getLetterGrade(submission.score));
    setFeedback(submission.feedback || '');
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;

    if (!score) {
      toast.error('Debes seleccionar una calificación');
      return;
    }

    const numericScore = GRADE_VALUES[score as keyof typeof GRADE_VALUES];

    try {
      setGrading(true);

      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          score: numericScore,
          feedback: feedback.trim() || null,
          graded_at: new Date().toISOString()
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast.success('Calificación guardada exitosamente');
      fetchAssignmentData();
      setSelectedSubmission(null);
      setScore('');
      setFeedback('');

    } catch (error) {
      console.error('Error grading submission:', error);
      toast.error('Error al guardar la calificación');
    } finally {
      setGrading(false);
    }
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!assignment) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tarea no encontrada</h3>
              <Button onClick={() => navigate('/assignments')}>
                Volver a Tareas
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const gradedCount = submissions.filter(s => s.score !== null).length;
  const pendingCount = submissions.length - gradedCount;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/assignments')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{assignment.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{assignment.course.code}</Badge>
              <span className="text-sm text-muted-foreground">{assignment.course.name}</span>
            </div>
          </div>
        </div>

        {/* Assignment Info */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de entrega</p>
                  <p className="text-sm font-medium">
                    {format(new Date(assignment.due_date), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Entregas</p>
                  <p className="text-sm font-medium">{submissions.length} estudiantes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p className="text-sm font-medium">
                    {gradedCount} calificadas, {pendingCount} pendientes
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle>Entregas de Estudiantes</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay entregas aún</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((submission) => (
                      <button
                        key={submission.id}
                        onClick={() => handleSelectSubmission(submission)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          selectedSubmission?.id === submission.id
                            ? 'border-primary bg-accent'
                            : 'border-border hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {submission.student.first_name[0]}{submission.student.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {submission.student.first_name} {submission.student.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(submission.submitted_at), "d MMM, HH:mm", { locale: es })}
                            </p>
                        {submission.score !== null ? (
                          <Badge variant="default" className="text-xs mt-1">
                            {getLetterGrade(submission.score)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Sin calificar
                          </Badge>
                        )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Submission Detail & Grading */}
          <div className="lg:col-span-2">
            {selectedSubmission ? (
              <Card className="bg-gradient-card shadow-card border-0">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>
                        {selectedSubmission.student.first_name} {selectedSubmission.student.last_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedSubmission.student.email}
                      </p>
                    </div>
                    <Badge variant={selectedSubmission.score !== null ? "default" : "secondary"}>
                      {selectedSubmission.score !== null ? 'Calificada' : 'Pendiente'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Submission Content */}
                  <div>
                    <Label className="text-base font-semibold">Contenido de la entrega</Label>
                    <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {selectedSubmission.content || 'Sin contenido de texto'}
                      </p>
                    </div>
                  </div>

                  {/* File Attachment */}
                  {selectedSubmission.file_path && selectedSubmission.file_name && (
                    <div>
                      <Label className="text-base font-semibold">Archivo adjunto</Label>
                      <div className="mt-2 flex items-center gap-3 p-3 border rounded-lg">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm flex-1">{selectedSubmission.file_name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadFile(selectedSubmission.file_path!, selectedSubmission.file_name!)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Grading Section */}
                  <div className="space-y-4 border-t pt-6">
                    <Label className="text-base font-semibold">Calificación</Label>
                    
                    <div>
                      <Label htmlFor="score">Calificación</Label>
                      <Select value={score} onValueChange={setScore}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecciona una calificación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AD">AD - Logro Destacado</SelectItem>
                          <SelectItem value="A">A - Logro Esperado</SelectItem>
                          <SelectItem value="B">B - En Proceso</SelectItem>
                          <SelectItem value="C">C - En Inicio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="feedback">Retroalimentación</Label>
                      <Textarea
                        id="feedback"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Escribe comentarios para el estudiante..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    {selectedSubmission.graded_at && (
                      <p className="text-xs text-muted-foreground">
                        Última calificación: {format(new Date(selectedSubmission.graded_at), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                      </p>
                    )}

                    <Button
                      onClick={handleGradeSubmission}
                      disabled={grading || !score}
                      className="w-full bg-gradient-primary shadow-glow"
                    >
                      {grading ? 'Guardando...' : 'Guardar Calificación'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-12 text-center">
                  <User className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Selecciona una entrega
                  </h3>
                  <p className="text-muted-foreground">
                    Selecciona un estudiante de la lista para ver su entrega y calificarla
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssignmentReview;
