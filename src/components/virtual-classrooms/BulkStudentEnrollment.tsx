import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Users, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}

interface Course {
  id: string;
  name: string;
  code: string;
}

interface BulkStudentEnrollmentProps {
  classroomId: string;
  courses: Course[];
  onUpdate: () => void;
}

export function BulkStudentEnrollment({ classroomId, courses, onUpdate }: BulkStudentEnrollmentProps) {
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isDialogOpen) {
      fetchAvailableStudents();
    }
  }, [isDialogOpen, classroomId]);

  const fetchAvailableStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, is_active')
        .eq('role', 'student')
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setAvailableStudents(data || []);
    } catch (error) {
      console.error('Error fetching available students:', error);
      toast.error('Error al cargar estudiantes disponibles');
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    const filteredStudents = availableStudents.filter(student =>
      `${student.first_name} ${student.last_name} ${student.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleBulkEnroll = async () => {
    if (!selectedCourse || selectedStudents.length === 0) {
      toast.error('Selecciona un curso y al menos un estudiante');
      return;
    }

    setLoading(true);
    try {
      // Check for existing enrollments
      const { data: existingEnrollments } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('course_id', selectedCourse)
        .in('student_id', selectedStudents);

      const alreadyEnrolledIds = existingEnrollments?.map(e => e.student_id) || [];
      const newEnrollments = selectedStudents.filter(id => !alreadyEnrolledIds.includes(id));

      if (newEnrollments.length === 0) {
        toast.error('Todos los estudiantes seleccionados ya están inscritos en este curso');
        return;
      }

      // Insert new enrollments
      const enrollmentData = newEnrollments.map(studentId => ({
        student_id: studentId,
        course_id: selectedCourse
      }));

      const { error } = await supabase
        .from('course_enrollments')
        .insert(enrollmentData);

      if (error) throw error;

      const skippedCount = selectedStudents.length - newEnrollments.length;
      let message = `${newEnrollments.length} estudiantes inscritos exitosamente`;
      if (skippedCount > 0) {
        message += `. ${skippedCount} ya estaban inscritos`;
      }

      toast.success(message);
      setIsDialogOpen(false);
      setSelectedStudents([]);
      setSelectedCourse('');
      setSearchTerm('');
      onUpdate();
    } catch (error) {
      console.error('Error enrolling students:', error);
      toast.error('Error al inscribir estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = availableStudents.filter(student =>
    `${student.first_name} ${student.last_name} ${student.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const allFilteredSelected = filteredStudents.length > 0 && 
    filteredStudents.every(student => selectedStudents.includes(student.id));

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Inscripción Masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inscripción Masiva de Estudiantes</DialogTitle>
          <DialogDescription>
            Selecciona un curso y los estudiantes que deseas inscribir de manera masiva
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Course Selection */}
          <div>
            <Label htmlFor="course">Curso</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
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

          {/* Search and Select All */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar Estudiantes</Label>
            <Input
              id="search"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredStudents.length === 0}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {allFilteredSelected ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedStudents.length} de {filteredStudents.length} seleccionados
              </span>
            </div>
          </div>

          {/* Students List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Estudiantes Disponibles ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {filteredStudents.length > 0 ? (
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded">
                      <Checkbox
                        id={student.id}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleStudentToggle(student.id)}
                      />
                      <label htmlFor={student.id} className="flex-1 cursor-pointer">
                        <div>
                          <p className="font-medium">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes disponibles'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkEnroll}
              disabled={!selectedCourse || selectedStudents.length === 0 || loading}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? 'Inscribiendo...' : `Inscribir ${selectedStudents.length} Estudiantes`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}