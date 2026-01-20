import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Award, Send, Loader2, Search, CheckCircle2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Course {
  id: string;
  name: string;
  code: string;
  program: {
    name: string;
    code: string;
  } | null;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  paternal_surname: string;
  maternal_surname: string;
  email: string;
  student_code: string;
}

interface CertificateLog {
  id: string;
  student_id: string;
  sent_at: string;
  status: 'sent' | 'failed';
  error_message: string | null;
}

const AdminCertificates = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [certificateLogs, setCertificateLogs] = useState<CertificateLog[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [webhookUrl, setWebhookUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCourses();
    // Cargar URL del webhook desde localStorage si existe
    const savedWebhook = localStorage.getItem('n8n_webhook_url');
    if (savedWebhook) {
      setWebhookUrl(savedWebhook);
    }
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchEnrolledStudents(selectedCourse);
      fetchCertificateLogs(selectedCourse);
    } else {
      setStudents([]);
      setCertificateLogs([]);
      setSelectedStudents(new Set());
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          code,
          program:program_id (
            name,
            code
          )
        `)
        .eq('is_active', true)
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

  const fetchEnrolledStudents = async (courseId: string) => {
    setLoadingStudents(true);
    setSelectedStudents(new Set());
    
    try {
      // Obtener estudiantes matriculados en el curso
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('course_id', courseId);

      if (enrollError) throw enrollError;

      const studentIds = enrollments?.map(e => e.student_id) || [];

      if (studentIds.length === 0) {
        setStudents([]);
        toast({
          title: 'Sin estudiantes',
          description: 'Este curso no tiene estudiantes matriculados',
        });
        return;
      }

      // Obtener datos de los estudiantes
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, paternal_surname, maternal_surname, email, student_code')
        .in('id', studentIds)
        .order('paternal_surname');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error cargando estudiantes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los estudiantes',
        variant: 'destructive',
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchCertificateLogs = async (courseId: string) => {
    try {
      // Usar any temporalmente hasta que se generen los tipos
      const { data, error } = await (supabase as any)
        .from('certificate_logs')
        .select('id, student_id, sent_at, status, error_message')
        .eq('course_id', courseId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setCertificateLogs((data || []) as CertificateLog[]);
    } catch (error) {
      console.error('Error cargando logs de certificados:', error);
      // No mostrar toast para no interrumpir, es información adicional
    }
  };

  const toggleStudent = (studentId: string) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const selectAll = () => {
    setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedStudents(new Set());
  };

  const handleSendCertificates = async () => {
    if (!selectedCourse) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un curso',
        variant: 'destructive',
      });
      return;
    }

    if (selectedStudents.size === 0) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar al menos un estudiante',
        variant: 'destructive',
      });
      return;
    }

    if (!webhookUrl) {
      toast({
        title: 'Error',
        description: 'Debes ingresar la URL del webhook de n8n',
        variant: 'destructive',
      });
      return;
    }

    // Guardar webhook URL en localStorage
    localStorage.setItem('n8n_webhook_url', webhookUrl);

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const SUPABASE_URL = "https://bnbtmubibnupttnnhijr.supabase.co";
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/send-certificates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            course_id: selectedCourse,
            student_ids: Array.from(selectedStudents),
            n8n_webhook_url: webhookUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error enviando certificados');
      }

      const result = await response.json();
      
      toast({
        title: 'Éxito',
        description: result.message,
      });

      // Limpiar selección
      setSelectedStudents(new Set());
      
      // Recargar logs de certificados
      await fetchCertificateLogs(selectedCourse);
    } catch (error: any) {
      console.error('Error enviando certificados:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron enviar los certificados',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getStudentFullName = (student: Student) => {
    if (student.paternal_surname && student.maternal_surname) {
      return `${student.paternal_surname} ${student.maternal_surname}, ${student.first_name}`;
    }
    return `${student.last_name || ''}, ${student.first_name}`.trim();
  };

  // Obtener el estado del certificado para un estudiante
  const getCertificateStatus = (studentId: string): 'sent' | 'failed' | 'pending' => {
    const log = certificateLogs.find(log => log.student_id === studentId);
    if (!log) return 'pending';
    return log.status as 'sent' | 'failed';
  };

  // Renderizar ícono de estado del certificado
  const renderCertificateStatus = (studentId: string) => {
    const status = getCertificateStatus(studentId);
    const log = certificateLogs.find(log => log.student_id === studentId);

    if (status === 'sent') {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-xs">Enviado</span>
        </div>
      );
    } else if (status === 'failed') {
      return (
        <div className="flex items-center gap-2 text-red-600" title={log?.error_message || 'Error desconocido'}>
          <XCircle className="h-4 w-4" />
          <span className="text-xs">Fallido</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="h-4 w-4" />
          <span className="text-xs">Pendiente</span>
        </div>
      );
    }
  };

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const fullName = getStudentFullName(student).toLowerCase();
    const code = student.student_code?.toLowerCase() || '';
    const email = student.email.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || code.includes(search) || email.includes(search);
  });

  const selectedCourseData = courses.find(c => c.id === selectedCourse);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Certificados</h1>
            <p className="text-muted-foreground mt-1">
              Envía certificados a estudiantes mediante n8n
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de configuración */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
              <CardDescription>
                Selecciona el curso y configura el webhook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selección de curso */}
              <div className="space-y-2">
                <Label htmlFor="course">Curso</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Selecciona un curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCourseData?.program && (
                  <p className="text-xs text-muted-foreground">
                    Programa: {selectedCourseData.program.name}
                  </p>
                )}
              </div>

              {/* URL del webhook */}
              <div className="space-y-2">
                <Label htmlFor="webhook">URL Webhook n8n</Label>
                <Input
                  id="webhook"
                  type="url"
                  placeholder="https://n8n.example.com/webhook/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  La URL del webhook de n8n donde se enviarán los datos
                </p>
              </div>

              {/* Botón de envío */}
              <Button
                onClick={handleSendCertificates}
                disabled={sending || selectedStudents.size === 0 || !selectedCourse || !webhookUrl}
                className="w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar {selectedStudents.size} Certificado{selectedStudents.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>

              {/* Estadísticas */}
              {selectedCourse && (
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total estudiantes:</span>
                    <span className="font-medium">{students.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Seleccionados:</span>
                    <span className="font-medium text-primary">{selectedStudents.size}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de estudiantes */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Estudiantes</CardTitle>
                  <CardDescription>
                    Selecciona los estudiantes que recibirán certificados
                  </CardDescription>
                </div>
                {students.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                      disabled={selectedStudents.size === filteredStudents.length}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Seleccionar todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      disabled={selectedStudents.size === 0}
                    >
                      Limpiar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCourse ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona un curso para ver los estudiantes</p>
                </div>
              ) : loadingStudents ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">Cargando estudiantes...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No hay estudiantes matriculados en este curso</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Búsqueda */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, código o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Tabla de estudiantes */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map(student => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedStudents.has(student.id)}
                                onCheckedChange={() => toggleStudent(student.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {student.student_code || '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getStudentFullName(student)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {student.email}
                            </TableCell>
                            <TableCell>
                              {renderCertificateStatus(student.id)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {filteredStudents.length === 0 && searchTerm && (
                    <p className="text-center text-muted-foreground py-4">
                      No se encontraron estudiantes que coincidan con "{searchTerm}"
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Información adicional */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              ¿Cómo funciona?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              El sistema enviará los siguientes datos al webhook de n8n para cada estudiante seleccionado:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li><strong>student_name</strong>: Nombre completo del estudiante</li>
              <li><strong>student_email</strong>: Email de registro del estudiante</li>
              <li><strong>course_name</strong>: Nombre del curso</li>
              <li><strong>course_code</strong>: Código del curso</li>
              <li><strong>program_name</strong>: Nombre del programa académico</li>
              <li><strong>academic_year</strong>: Año académico</li>
              <li><strong>semester</strong>: Semestre</li>
            </ul>
            <p className="text-sm text-muted-foreground pt-2">
              Asegúrate de que tu workflow de n8n esté configurado para recibir estos datos.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminCertificates;
