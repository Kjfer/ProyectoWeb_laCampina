import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Eye, 
  FileText, 
  Calendar,
  User,
  GraduationCap,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AssignmentSubmission {
  id: string;
  content?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  score?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AssignmentSubmissionManagerProps {
  resourceId: string;
  assignmentTitle: string;
  maxScore?: number;
}

export function AssignmentSubmissionManager({ 
  resourceId, 
  assignmentTitle, 
  maxScore = 100 
}: AssignmentSubmissionManagerProps) {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingSubmission, setGradingSubmission] = useState<string | null>(null);
  const [gradeValues, setGradeValues] = useState<{[key: string]: { score: number; feedback: string }}>({});

  useEffect(() => {
    if (profile?.role === 'teacher' || profile?.role === 'admin') {
      fetchSubmissions();
    }
  }, [resourceId, profile]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);

      // First find the assignment by title
      const { data: assignment } = await supabase
        .from('assignments')
        .select('id')
        .eq('title', assignmentTitle)
        .maybeSingle();

      if (!assignment) {
        setSubmissions([]);
        return;
      }

      // Get all submissions for this assignment
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          content,
          file_path,
          file_name,
          file_size,
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
        .eq('assignment_id', assignment.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Error al cargar las entregas');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSubmission = async (submission: AssignmentSubmission) => {
    if (!submission.file_path) return;

    try {
      const { data, error } = await supabase.functions.invoke('download-file', {
        body: {
          bucket: 'student-submissions',
          filePath: submission.file_path,
          fileName: submission.file_name
        }
      });

      if (error) throw error;

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = data.fileName || submission.file_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const handleGradeSubmission = async (submissionId: string) => {
    const gradeData = gradeValues[submissionId];
    if (!gradeData || gradeData.score < 0 || gradeData.score > maxScore) {
      toast.error(`La calificación debe estar entre 0 y ${maxScore}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          score: gradeData.score,
          feedback: gradeData.feedback.trim() || null,
          graded_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Calificación guardada exitosamente');
      setGradingSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Error grading submission:', error);
      toast.error('Error al calificar la entrega');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Entregas de Estudiantes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {submissions.length} entrega{submissions.length !== 1 ? 's' : ''} recibida{submissions.length !== 1 ? 's' : ''}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {submissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay entregas todavía</p>
            <p className="text-sm">Las entregas de los estudiantes aparecerán aquí</p>
          </div>
        ) : (
          submissions.map((submission) => (
            <Card key={submission.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Student Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {submission.student.first_name} {submission.student.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{submission.student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={submission.score !== null ? "default" : "secondary"}>
                        {submission.score !== null ? 'Calificada' : 'Pendiente'}
                      </Badge>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(submission.submitted_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </div>
                  </div>

                  {/* Submission Content */}
                  {submission.content && (
                    <div className="bg-muted p-3 rounded-lg">
                      <Label className="text-xs font-medium text-muted-foreground">Contenido:</Label>
                      <p className="text-sm mt-1">{submission.content}</p>
                    </div>
                  )}

                  {/* File Attachment */}
                  {submission.file_name && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadSubmission(submission)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {submission.file_name}
                      </Button>
                      {submission.file_size && (
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(submission.file_size)})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Current Grade */}
                  {submission.score !== null && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">
                          Calificación: {submission.score} / {maxScore}
                        </span>
                      </div>
                      {submission.feedback && (
                        <p className="text-sm text-green-700">{submission.feedback}</p>
                      )}
                      {submission.graded_at && (
                        <p className="text-xs text-green-600 mt-2">
                          Calificado el: {format(new Date(submission.graded_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Grading Section */}
                  {gradingSubmission === submission.id ? (
                    <div className="border-t pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`score-${submission.id}`}>
                            Calificación (0-{maxScore})
                          </Label>
                          <Input
                            id={`score-${submission.id}`}
                            type="number"
                            min="0"
                            max={maxScore}
                            value={gradeValues[submission.id]?.score || submission.score || ''}
                            onChange={(e) => setGradeValues(prev => ({
                              ...prev,
                              [submission.id]: {
                                ...prev[submission.id],
                                score: parseFloat(e.target.value) || 0
                              }
                            }))}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`feedback-${submission.id}`}>
                          Comentarios (opcional)
                        </Label>
                        <Textarea
                          id={`feedback-${submission.id}`}
                          value={gradeValues[submission.id]?.feedback || submission.feedback || ''}
                          onChange={(e) => setGradeValues(prev => ({
                            ...prev,
                            [submission.id]: {
                              ...prev[submission.id],
                              feedback: e.target.value
                            }
                          }))}
                          placeholder="Escribe comentarios sobre la entrega..."
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleGradeSubmission(submission.id)}
                          size="sm"
                        >
                          Guardar Calificación
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setGradingSubmission(null)}
                          size="sm"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGradingSubmission(submission.id);
                          setGradeValues(prev => ({
                            ...prev,
                            [submission.id]: {
                              score: submission.score || 0,
                              feedback: submission.feedback || ''
                            }
                          }));
                        }}
                      >
                        {submission.score !== null ? 'Editar Calificación' : 'Calificar'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}