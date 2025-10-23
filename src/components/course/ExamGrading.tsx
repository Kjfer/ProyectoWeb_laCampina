import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExamGradingProps {
  submissionId: string;
  studentName: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  correct_answer: string | null;
  options: string[] | null;
}

interface SubmissionData {
  id: string;
  student_id: string;
  quiz_id: string;
  answers: Record<string, any>;
  score: number;
  submitted_at: string;
}

export function ExamGrading({ submissionId, studentName, onClose, onUpdate }: ExamGradingProps) {
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [grades, setGrades] = useState<Record<string, { score: number; feedback: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubmissionData();
  }, [submissionId]);

  const fetchSubmissionData = async () => {
    try {
      // Get submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (submissionError) throw submissionError;
      setSubmission(submissionData as SubmissionData);

      // Get questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', submissionData.quiz_id)
        .order('position', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions((questionsData || []) as Question[]);

      // Initialize grades from existing data
      const answers = submissionData.answers as Record<string, any>;
      const initialGrades: Record<string, { score: number; feedback: string }> = {};
      
      Object.keys(answers).forEach(questionId => {
        const answer = answers[questionId];
        if (answer.requires_grading) {
          initialGrades[questionId] = {
            score: answer.points_earned || 0,
            feedback: answer.feedback || ''
          };
        }
      });
      
      setGrades(initialGrades);
    } catch (error) {
      console.error('Error fetching submission:', error);
      toast.error('Error al cargar la respuesta');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (questionId: string, field: 'score' | 'feedback', value: number | string) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!submission) return;

    try {
      setSaving(true);

      // Update answers with grades
      const updatedAnswers = { ...(submission.answers as Record<string, any>) };
      let totalScore = 0;

      Object.keys(updatedAnswers).forEach(questionId => {
        const answer = updatedAnswers[questionId];
        
        if (answer.requires_grading && grades[questionId]) {
          answer.points_earned = grades[questionId].score;
          answer.feedback = grades[questionId].feedback;
        }
        
        totalScore += answer.points_earned || 0;
      });

      // Update submission
      const { error } = await supabase
        .from('quiz_submissions')
        .update({
          answers: updatedAnswers,
          score: totalScore
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Calificación guardada exitosamente');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast.error('Error al guardar la calificación');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !submission) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="animate-pulse space-y-4 p-6">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const answers = submission.answers as Record<string, any>;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calificar Examen - {studentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Entregado el {format(new Date(submission.submitted_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {questions.map((question, index) => {
            const answer = answers[question.id];
            if (!answer) return null;

            const isAutoGraded = question.question_type === 'multiple_choice' || question.question_type === 'true_false';

            return (
              <Card key={question.id} className="bg-gradient-card shadow-card border-0">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        Pregunta {index + 1} ({question.points} {question.points === 1 ? 'punto' : 'puntos'})
                      </CardTitle>
                      <p className="text-sm text-foreground mt-2">{question.question_text}</p>
                    </div>
                    {isAutoGraded && (
                      <Badge variant={answer.is_correct ? 'default' : 'destructive'} className="ml-2">
                        {answer.is_correct ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Correcta
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Incorrecta
                          </>
                        )}
                      </Badge>
                    )}
                    {!isAutoGraded && (
                      <Badge variant="secondary" className="ml-2">
                        <Clock className="w-3 h-3 mr-1" />
                        Requiere calificación
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Respuesta del estudiante:</Label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{answer.answer || 'Sin respuesta'}</p>
                    </div>
                  </div>

                  {question.correct_answer && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Respuesta correcta/esperada:</Label>
                      <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
                        <p className="text-sm">{question.correct_answer}</p>
                      </div>
                    </div>
                  )}

                  {isAutoGraded ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">
                        Puntos obtenidos: {answer.points_earned} / {question.points}
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
                      <div className="space-y-2">
                        <Label htmlFor={`score-${question.id}`}>Puntos obtenidos *</Label>
                        <Input
                          id={`score-${question.id}`}
                          type="number"
                          min="0"
                          max={question.points}
                          step="0.5"
                          value={grades[question.id]?.score || 0}
                          onChange={(e) => handleGradeChange(question.id, 'score', parseFloat(e.target.value) || 0)}
                          placeholder={`Máx: ${question.points}`}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`feedback-${question.id}`}>Retroalimentación (opcional)</Label>
                        <Textarea
                          id={`feedback-${question.id}`}
                          value={grades[question.id]?.feedback || ''}
                          onChange={(e) => handleGradeChange(question.id, 'feedback', e.target.value)}
                          placeholder="Comentarios para el estudiante..."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            Calificación actual: <span className="font-bold text-foreground text-lg">{submission.score.toFixed(1)} pts</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary shadow-glow">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Calificación'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
