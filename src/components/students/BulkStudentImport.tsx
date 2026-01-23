import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/ui/file-upload';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, CheckCircle2, BookOpen } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string;
  grade?: string;
  section?: string;
  academic_year?: string;
}

interface StudentData {
  document_type: string;
  document_number: string;
  student_code: string;
  paternal_surname: string;
  maternal_surname: string;
  first_name: string;
  email: string;
  phone?: string;
  gender: string;
  birth_date: string;
}

interface BulkStudentImportProps {
  classroom?: Course;
  courses?: Course[];
  onImportComplete?: () => void;
  onSuccess?: () => void;
}

export function BulkStudentImport({ classroom, courses, onImportComplete, onSuccess }: BulkStudentImportProps): JSX.Element {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [studentsToImport, setStudentsToImport] = useState<StudentData[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'importing' | 'completed'>('idle');
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Determinar el curso activo (ya sea el prop classroom o el seleccionado)
  const activeCourse = classroom || (courses && selectedCourseId ? courses.find(c => c.id === selectedCourseId) : null);
  const showCourseSelector = !classroom && courses && courses.length > 0;

  // Auto-scroll to latest log
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [importLogs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setImportLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => {
    setImportLogs([]);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'TIPO DE DOCUMENTO': 'DNI',
        'NÚMERO DE DOCUMENTO': '12345678',
        'CÓDIGO DEL ESTUDIANTE': 'EST001',
        'APELLIDO PATERNO': 'García',
        'APELLIDO MATERNO': 'López',
        'NOMBRES': 'Juan Carlos',
        'EMAIL': 'juan.garcia@correo.com',
        'TELÉFONO': '987654321',
        'SEXO': 'M',
        'FECHA DE NACIMIENTO': '2010-05-15'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_estudiantes.xlsx');

    toast({
      title: "Plantilla descargada",
      description: "Usa este formato para importar estudiantes",
    });
  };

  const processExcelFile = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Deshacer celdas combinadas para procesamiento correcto
      if (firstSheet['!merges']) {
        firstSheet['!merges'].forEach((merge: any) => {
          const startCell = XLSX.utils.encode_cell(merge.s);
          const cellValue = firstSheet[startCell]?.v;
          
          // Aplicar el valor de la celda combinada a todas las celdas del rango
          for (let row = merge.s.r; row <= merge.e.r; row++) {
            for (let col = merge.s.c; col <= merge.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              if (!firstSheet[cellAddress]) {
                firstSheet[cellAddress] = { v: cellValue, t: 's' };
              }
            }
          }
        });
      }

      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
        defval: '',
        raw: false 
      });

      const students: StudentData[] = jsonData.map((row: any) => ({
        document_type: String(row['TIPO DE DOCUMENTO'] || '').trim(),
        document_number: String(row['NÚMERO DE DOCUMENTO'] || '').trim(),
        student_code: String(row['CÓDIGO DEL ESTUDIANTE'] || '').trim(),
        paternal_surname: String(row['APELLIDO PATERNO'] || '').trim(),
        maternal_surname: String(row['APELLIDO MATERNO'] || '').trim(),
        first_name: String(row['NOMBRES'] || '').trim(),
        email: String(row['EMAIL'] || '').trim(),
        phone: row['TELÉFONO'] ? String(row['TELÉFONO']).trim() : undefined,
        gender: String(row['SEXO'] || '').trim().toUpperCase(),
        birth_date: row['FECHA DE NACIMIENTO'] ? formatExcelDate(row['FECHA DE NACIMIENTO']) : '',
      })).filter(student => student.document_number && student.student_code && student.first_name && student.email);

      if (students.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron estudiantes válidos. Verifica que el formato sea correcto.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      setStudentsToImport(students);
      setImportStatus('preview');

      toast({
        title: "Archivo procesado",
        description: `Se encontraron ${students.length} estudiantes válidos`,
      });
    } catch (error) {
      console.error('Error processing Excel:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo Excel. Verifica que uses la plantilla correcta.",
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
    if (!activeCourse) {
      toast({
        title: "Error",
        description: "Debes seleccionar un curso",
        variant: "destructive",
      });
      return;
    }

    setImportStatus('importing');
    clearLogs();
    
    try {
      addLog(`🚀 Iniciando importación de ${studentsToImport.length} estudiantes`);
      addLog(`📚 Curso: ${activeCourse.name} (${activeCourse.code})`);
      addLog(`⏳ Procesando estudiantes en el servidor...`);

      const { data, error } = await supabase.functions.invoke('crud-estudiantes', {
        body: {
          students: studentsToImport,
          courseId: activeCourse.id,
          courseName: activeCourse.name,
          courseCode: activeCourse.code,
        },
      });

      if (error) throw error;

      // Mostrar información detallada de la importación
      const summary = data?.summary || {
        total: studentsToImport.length,
        new: 0,
        existing: 0,
        errors: 0
      };

      addLog(`✅ Procesamiento completado`);
      addLog(`📊 Resultados:`);
      addLog(`   • ${summary.new} estudiantes nuevos creados`);
      addLog(`   • ${summary.existing} estudiantes existentes matriculados`);
      if (summary.errors > 0) {
        addLog(`   ⚠️ ${summary.errors} errores encontrados`);
      }
      addLog(`🎉 Importación finalizada exitosamente`);

      let description = '';
      if (summary.new > 0 && summary.existing > 0) {
        description = `${summary.new} estudiantes nuevos creados, ${summary.existing} estudiantes existentes matriculados`;
      } else if (summary.new > 0) {
        description = `${summary.new} estudiantes nuevos creados y matriculados al curso`;
      } else if (summary.existing > 0) {
        description = `${summary.existing} estudiantes existentes matriculados al curso`;
      }

      if (summary.errors > 0) {
        description += `. ${summary.errors} errores encontrados`;
      }

      toast({
        title: "Importación completada",
        description: description || data?.message || `${studentsToImport.length} estudiantes procesados`,
      });

      setImportStatus('completed');
      setTimeout(() => {
        setStudentsToImport([]);
        if (onImportComplete) onImportComplete();
        if (onSuccess) onSuccess();
      }, 3000);
    } catch (error) {
      console.error('Error importing students:', error);
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      toast({
        title: "Error",
        description: "No se pudieron importar los estudiantes",
        variant: "destructive",
      });
      setImportStatus('preview');
    }
  };

  return (
    <div className="space-y-4">
      {showCourseSelector && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Seleccionar Curso Destino
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="course-select">Curso</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger id="course-select">
                <SelectValue placeholder="Selecciona un curso para importar estudiantes" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} ({course.code})
                    {course.grade && course.section && ` - ${course.grade}${course.section}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importación Masiva de Estudiantes
          </CardTitle>
          {activeCourse && (
            <p className="text-sm text-muted-foreground">
              Curso: {activeCourse.name} ({activeCourse.code})
              {activeCourse.grade && activeCourse.section && ` - ${activeCourse.grade}${activeCourse.section}`}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeCourse ? (
            <div className="text-center py-8 text-muted-foreground">
              Por favor, selecciona un curso antes de importar estudiantes
            </div>
          ) : (
            <>
              {importStatus === 'idle' && (
                <>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Formato requerido:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>TIPO DE DOCUMENTO (DNI, CE, etc.)</li>
                    <li>NÚMERO DE DOCUMENTO</li>
                    <li>CÓDIGO DEL ESTUDIANTE</li>
                    <li>APELLIDO PATERNO</li>
                    <li>APELLIDO MATERNO</li>
                    <li>NOMBRES</li>
                    <li>EMAIL (correo del estudiante)</li>
                    <li>TELÉFONO (opcional)</li>
                    <li>SEXO (M/F)</li>
                    <li>FECHA DE NACIMIENTO (YYYY-MM-DD)</li>
                  </ul>
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      ℹ️ Credenciales de acceso
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      El EMAIL será usado para iniciar sesión y el NÚMERO DE DOCUMENTO será la contraseña inicial.
                    </p>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      ℹ️ Estudiantes duplicados
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      Si un estudiante ya existe (mismo DNI o código), será reconocido y asociado automáticamente al aula virtual seleccionada sin crear un duplicado.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="shrink-0"
                >
                  Descargar Plantilla
                </Button>
              </div>
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
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Procesando importación...</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">Por favor espera mientras se procesan los estudiantes</p>
              </div>
            </div>
            
            <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {importLogs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-words">
                    {log}
                  </div>
                ))}
                {importLogs.length === 0 && (
                  <div className="text-slate-500 italic">Esperando logs del servidor...</div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {importStatus === 'completed' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Importación completada exitosamente</p>
                <p className="text-sm text-green-700 dark:text-green-300">Todos los estudiantes han sido procesados</p>
              </div>
            </div>
            
            <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {importLogs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-words">
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                setImportStatus('idle');
                clearLogs();
              }}
              className="w-full"
            >
              Importar más estudiantes
            </Button>
          </div>
        )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
