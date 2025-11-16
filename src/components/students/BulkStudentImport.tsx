import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/ui/file-upload';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';

interface VirtualClassroom {
  id: string;
  name: string;
  grade: string;
  section: string;
  academic_year: string;
  education_level: string;
}

interface StudentData {
  document_type: string;
  document_number: string;
  student_code: string;
  paternal_surname: string;
  maternal_surname: string;
  first_name: string;
  gender: string;
  birth_date: string;
}

interface BulkStudentImportProps {
  classroom: VirtualClassroom;
  onImportComplete: () => void;
}

export function BulkStudentImport({ classroom, onImportComplete }: BulkStudentImportProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [studentsToImport, setStudentsToImport] = useState<StudentData[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'importing' | 'completed'>('idle');

  const processExcelFile = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      const students: StudentData[] = jsonData.map((row: any) => ({
        document_type: row['TIPO DE DOCUMENTO'] || '',
        document_number: String(row['NÚMERO DE DOCUMENTO'] || ''),
        student_code: String(row['CÓDIGO DEL ESTUDIANTE'] || ''),
        paternal_surname: row['APELLIDO PATERNO'] || '',
        maternal_surname: row['APELLIDO MATERNO'] || '',
        first_name: row['NOMBRES'] || '',
        gender: row['SEXO'] || '',
        birth_date: row['FECHA DE NACIMIENTO'] ? formatExcelDate(row['FECHA DE NACIMIENTO']) : '',
      })).filter(student => student.document_number && student.student_code);

      setStudentsToImport(students);
      setImportStatus('preview');

      toast({
        title: "Archivo procesado",
        description: `Se encontraron ${students.length} estudiantes en el archivo`,
      });
    } catch (error) {
      console.error('Error processing Excel:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo Excel",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatExcelDate = (excelDate: any): string => {
    if (typeof excelDate === 'string') return excelDate;
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return '';
  };

  const handleImport = async () => {
    setImportStatus('importing');
    
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id')
        .eq('classroom_id', classroom.id);

      if (courseError) throw courseError;

      const courseIds = courseData?.map(c => c.id) || [];

      const { data, error } = await supabase.functions.invoke('crud-estudiantes', {
        body: {
          students: studentsToImport,
          classroomId: classroom.id,
          courseIds: courseIds,
        },
      });

      if (error) throw error;

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${studentsToImport.length} estudiantes correctamente`,
      });

      setImportStatus('completed');
      setStudentsToImport([]);
      onImportComplete();
    } catch (error) {
      console.error('Error importing students:', error);
      toast({
        title: "Error",
        description: "No se pudieron importar los estudiantes",
        variant: "destructive",
      });
      setImportStatus('preview');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importación Masiva de Estudiantes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Aula Virtual: {classroom.name} - {classroom.grade}{classroom.section}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {importStatus === 'idle' && (
          <>
            <div className="text-sm text-muted-foreground mb-2">
              El archivo Excel debe contener las siguientes columnas:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>TIPO DE DOCUMENTO</li>
                <li>NÚMERO DE DOCUMENTO</li>
                <li>CÓDIGO DEL ESTUDIANTE</li>
                <li>APELLIDO PATERNO</li>
                <li>APELLIDO MATERNO</li>
                <li>NOMBRES</li>
                <li>SEXO</li>
                <li>FECHA DE NACIMIENTO</li>
              </ul>
            </div>
            <FileUpload
              onFileSelect={processExcelFile}
              accept=".xlsx,.xls"
              multiple={false}
              maxSize={5}
              disabled={isProcessing}
            />
          </>
        )}

        {importStatus === 'preview' && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Vista previa</h4>
              <p className="text-sm text-muted-foreground">
                {studentsToImport.length} estudiantes listos para importar
              </p>
              <div className="mt-2 max-h-40 overflow-y-auto">
                {studentsToImport.slice(0, 5).map((student, idx) => (
                  <div key={idx} className="text-xs py-1">
                    {student.student_code} - {student.paternal_surname} {student.maternal_surname}, {student.first_name}
                  </div>
                ))}
                {studentsToImport.length > 5 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ... y {studentsToImport.length - 5} más
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImport} className="flex-1">
                Importar Estudiantes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImportStatus('idle');
                  setStudentsToImport([]);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {importStatus === 'importing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Importando estudiantes...</p>
          </div>
        )}

        {importStatus === 'completed' && (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
            <p className="text-sm font-medium">Importación completada exitosamente</p>
            <Button
              variant="outline"
              onClick={() => setImportStatus('idle')}
              className="mt-4"
            >
              Importar más estudiantes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
