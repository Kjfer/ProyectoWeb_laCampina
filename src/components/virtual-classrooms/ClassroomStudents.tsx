import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Users, Mail, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BulkStudentEnrollment } from './BulkStudentEnrollment';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  is_active: boolean;
}

interface Course {
  id: string;
  name: string;
  code: string;
}

interface ClassroomStudentsProps {
  classroomId: string;
  canManage: boolean;
  onUpdate: () => void;
}

export function ClassroomStudents({ classroomId, canManage, onUpdate }: ClassroomStudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchAvailableStudents();
  }, [classroomId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('classroom_id', classroomId)
        .eq('is_active', true);

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

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
            email,
            avatar_url,
            is_active
          ),
          course:courses!course_enrollments_course_id_fkey(
            classroom_id
          )
        `)
        .eq('course.classroom_id', classroomId);

      if (error) throw error;

      // Extract unique students
      const uniqueStudents = data
        ?.map(enrollment => enrollment.student)
        .filter((student, index, self) => 
          student && self.findIndex(s => s?.id === student?.id) === index
        ) || [];

      setStudents(uniqueStudents.filter(Boolean) as Student[]);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error al cargar los estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, is_active')
        .eq('role', 'student')
        .eq('is_active', true);

      if (error) throw error;
      setAvailableStudents(data || []);
    } catch (error) {
      console.error('Error fetching available students:', error);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudentId) {
      toast.error('Por favor selecciona un estudiante');
      return;
    }

    if (courses.length === 0) {
      toast.error('No hay cursos disponibles en esta aula virtual');
      return;
    }

    try {
      // Check if student is already enrolled in any course of this classroom
      const { data: existingEnrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', selectedStudentId)
        .in('course_id', courses.map(c => c.id));

      // Get courses where student is not enrolled yet
      const enrolledCourseIds = existingEnrollments?.map(e => e.course_id) || [];
      const coursesToEnroll = courses.filter(course => !enrolledCourseIds.includes(course.id));

      if (coursesToEnroll.length === 0) {
        toast.error('El estudiante ya está inscrito en todos los cursos de esta aula virtual');
        return;
      }

      // Enroll student in all available courses of this virtual classroom
      const enrollmentData = coursesToEnroll.map(course => ({
        student_id: selectedStudentId,
        course_id: course.id,
        enrolled_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('course_enrollments')
        .insert(enrollmentData);

      if (error) throw error;

      const enrolledCount = coursesToEnroll.length;
      const skippedCount = courses.length - enrolledCount;
      
      let message = `Estudiante agregado exitosamente al aula virtual`;
      if (enrolledCount > 0) {
        message += ` (inscrito en ${enrolledCount} curso${enrolledCount !== 1 ? 's' : ''})`;
      }
      if (skippedCount > 0) {
        message += `. Ya estaba inscrito en ${skippedCount} curso${skippedCount !== 1 ? 's' : ''}`;
      }

      toast.success(message);
      setIsAddDialogOpen(false);
      setSelectedStudentId('');
      fetchStudents();
      onUpdate();
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Error al agregar el estudiante');
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Estudiantes</h2>
          <p className="text-muted-foreground">
            Gestiona los estudiantes de esta aula virtual
          </p>
        </div>
        
        {canManage && courses.length > 0 && (
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Agregar Estudiante
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Estudiante al Aula Virtual</DialogTitle>
                <DialogDescription>
                  Selecciona un estudiante para inscribirlo en todos los cursos de esta aula virtual
                </DialogDescription>
              </DialogHeader>
              
              {courses.length === 0 ? (
                <div className="py-4">
                  <p className="text-sm text-muted-foreground text-center">
                    No hay cursos disponibles en esta aula virtual. 
                    Primero debes crear cursos para poder agregar estudiantes.
                  </p>
                  <div className="flex justify-end mt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <div>
                    <Label htmlFor="student">Estudiante</Label>
                    <Select 
                      value={selectedStudentId} 
                      onValueChange={setSelectedStudentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estudiante" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.first_name} {student.last_name} - {student.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Cursos incluidos ({courses.length}):</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground mt-1">
                      {courses.slice(0, 3).map(course => (
                        <li key={course.id}>• {course.name} ({course.code})</li>
                      ))}
                      {courses.length > 3 && (
                        <li>• ... y {courses.length - 3} curso{courses.length - 3 !== 1 ? 's' : ''} más</li>
                      )}
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Agregar al Aula Virtual</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
          
          <BulkStudentEnrollment 
            classroomId={classroomId}
            courses={courses}
            onUpdate={onUpdate}
          />
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-32"></div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : students.length > 0 ? (
          students.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={student.avatar_url} />
                    <AvatarFallback>
                      {getInitials(student.first_name, student.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {student.first_name} {student.last_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {student.email}
                    </CardDescription>
                  </div>
                  <Badge variant={student.is_active ? "default" : "secondary"}>
                    {student.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay estudiantes</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {courses.length === 0 
                    ? "Primero debes crear cursos para poder agregar estudiantes" 
                    : "No hay estudiantes inscritos en los cursos de esta aula virtual"}
                </p>
                {canManage && courses.length > 0 && (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Agregar Primer Estudiante
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}