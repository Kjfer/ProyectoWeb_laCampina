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
  const [selectedCourseId, setSelectedCourseId] = useState('');

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
    
    if (!selectedStudentId || !selectedCourseId) {
      toast.error('Por favor selecciona un estudiante y un curso');
      return;
    }

    try {
      // Check if student is already enrolled in the course
      const { data: existing } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('student_id', selectedStudentId)
        .eq('course_id', selectedCourseId)
        .single();

      if (existing) {
        toast.error('El estudiante ya está inscrito en este curso');
        return;
      }

      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          student_id: selectedStudentId,
          course_id: selectedCourseId
        });

      if (error) throw error;

      toast.success('Estudiante agregado exitosamente');
      setIsAddDialogOpen(false);
      setSelectedStudentId('');
      setSelectedCourseId('');
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Agregar Estudiante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Estudiante</DialogTitle>
                <DialogDescription>
                  Selecciona un estudiante y el curso al que deseas inscribirlo
                </DialogDescription>
              </DialogHeader>
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

                <div>
                  <Label htmlFor="course">Curso</Label>
                  <Select 
                    value={selectedCourseId} 
                    onValueChange={setSelectedCourseId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name} ({course.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Agregar Estudiante</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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