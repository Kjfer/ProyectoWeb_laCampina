import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useExamMonitor } from '@/hooks/useExamMonitor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  position: number;
}

interface ExamData {
  id: string;
  title: string;
  description: string;
  start_time: string;
  duration_minutes: number;
  max_score: number;
  course_id: string;
  quiz_id: string;
}

const ExamTaking = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showClosedDialog, setShowClosedDialog] = useState(false);

  const { abandonCount, maxAbandonAttempts } = useExamMonitor({
    examId: examId || '',
    isActive: true,
    onExamClosed: () => {
      setShowClosedDialog(true);
      setTimeout(() => {
        navigate('/exams');
      }, 3000);
    },
    userId: profile?.id || '',
  });

  useEffect(() => {
    fetchExamData();
  }, [examId, profile]);

  useEffect(() => {
    if (exam) {
      const startTime = new Date(exam.start_time);
      const endTime = new Date(startTime.getTime() + exam.duration_minutes * 60000);
      
      const timer = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, endTime.getTime() - now.getTime());
        setTimeRemaining(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          handleSubmit(true);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [exam]);

  const fetchExamData = async () => {
    if (!examId || !profile?.id) return;

    try {
      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      // Find associated quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id')
        .eq('course_id', examData.course_id)
        .eq('title', examData.title)
        .single();

      if (quizError) throw quizError;

      setExam({ ...examData, quiz_id: quizData.id });

      // Check if student is enrolled
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('course_id', examData.course_id)
        .eq('student_id', profile.id)
        .single();

      if (!enrollment) {
        toast.error('No estás inscrito en este curso');
        navigate('/exams');
        return;
      }

      // Check if already submitted
      const { data: submission } = await supabase
        .from('quiz_submissions')
        .select('id')
        .eq('quiz_id', quizData.id)
        .eq('student_id', profile.id)
        .single();

      if (submission) {
        toast.error('Ya has completado este examen');
        navigate('/exams');
        return;
      }

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizData.id)
        .order('position', { ascending: true });

      if (questionsError) throw questionsError;

      setQuestions((questionsData || []) as Question[]);
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('Error al cargar el examen');
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      setShowSubmitDialog(true);
      return;
    }

    await submitExam();
  };

  const submitExam = async () => {
    if (!exam || !profile?.id) return;

    try {
      setSubmitting(true);

      // Calculate score and prepare answers
      let totalScore = 0;
      const answersData: Record<string, any> = {};

      questions.forEach(question => {
        const studentAnswer = answers[question.id] || '';
        let isCorrect = false;
        let pointsEarned = 0;
        let requiresGrading = false;

        if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
          isCorrect = studentAnswer === question.correct_answer;
          pointsEarned = isCorrect ? question.points : 0;
        } else {
          requiresGrading = true;
        }

        totalScore += pointsEarned;

        answersData[question.id] = {
          answer: studentAnswer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          requires_grading: requiresGrading,
          question_type: question.question_type
        };
      });

      // Submit to database
      const { error } = await supabase
        .from('quiz_submissions')
        .insert({
          quiz_id: exam.quiz_id,
          student_id: profile.id,
          answers: answersData,
          score: totalScore,
          attempt_number: 1
        });

      if (error) throw error;

      toast.success('Examen enviado exitosamente');
      navigate('/exams');
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Error al enviar el examen');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const answered = Object.keys(answers).filter(k => answers[k]?.trim()).length;
    return (answered / questions.length) * 100;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) return null;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header with timer */}
        <Card className="bg-gradient-card shadow-card border-0 sticky top-4 z-10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{exam.title}</CardTitle>
                <p className="text-muted-foreground mt-1">{exam.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2 text-lg font-bold text-primary">
                    <Clock className="w-5 h-5" />
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-xs text-muted-foreground">Tiempo restante</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progreso</span>
                <span>{Object.keys(answers).filter(k => answers[k]?.trim()).length} / {questions.length} respondidas</span>
              </div>
              <Progress value={getProgress()} />
            </div>
            {abandonCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mt-4">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">
                  Has salido {abandonCount} vez(es). Quedan {maxAbandonAttempts - abandonCount} intentos.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.id} className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg">
                  Pregunta {index + 1} ({question.points} {question.points === 1 ? 'punto' : 'puntos'})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">{question.question_text}</p>

                {question.question_type === 'multiple_choice' && question.options && (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                  >
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`q${question.id}-opt${optIndex}`} />
                        <Label htmlFor={`q${question.id}-opt${optIndex}`} className="cursor-pointer">
                          {String.fromCharCode(65 + optIndex)}. {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.question_type === 'true_false' && (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id={`q${question.id}-true`} />
                      <Label htmlFor={`q${question.id}-true`} className="cursor-pointer">Verdadero</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id={`q${question.id}-false`} />
                      <Label htmlFor={`q${question.id}-false`} className="cursor-pointer">Falso</Label>
                    </div>
                  </RadioGroup>
                )}

                {question.question_type === 'short_answer' && (
                  <Textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    rows={3}
                  />
                )}

                {question.question_type === 'essay' && (
                  <Textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Escribe tu ensayo aquí..."
                    rows={8}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit button */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full bg-gradient-primary shadow-glow"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Enviando...' : 'Enviar Examen'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar examen?</AlertDialogTitle>
            <AlertDialogDescription>
              Has respondido {Object.keys(answers).filter(k => answers[k]?.trim()).length} de {questions.length} preguntas.
              {Object.keys(answers).filter(k => answers[k]?.trim()).length < questions.length && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Aún tienes preguntas sin responder.
                </span>
              )}
              <br />
              ¿Estás seguro de que quieres enviar el examen? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={submitExam} disabled={submitting}>
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-closed dialog */}
      <AlertDialog open={showClosedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Examen cerrado automáticamente</AlertDialogTitle>
            <AlertDialogDescription>
              El examen se ha cerrado porque excediste el número máximo de salidas permitidas.
              Serás redirigido a la página de exámenes.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ExamTaking;
