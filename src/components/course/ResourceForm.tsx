import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FileUpload } from '@/components/ui/file-upload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Video, ExternalLink, ClipboardList, GraduationCap, BookOpen, Upload, Calendar, Settings } from 'lucide-react';

interface ResourceFormProps {
  sectionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResourceForm({ sectionId, onClose, onSuccess }: ResourceFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'material' as 'material' | 'document' | 'video' | 'link' | 'assignment' | 'exam',
    resource_url: '',
    file_path: '',
    is_published: false,
    assignment_deadline: '',
    max_score: 100,
    allows_student_submissions: false
  });

  const resourceTypes = [
    { value: 'material', label: 'Material de Estudio', icon: BookOpen, description: 'Contenido educativo como PDFs, presentaciones' },
    { value: 'document', label: 'Archivo', icon: FileText, description: 'Documentos, hojas de trabajo, referencias' },
    { value: 'video', label: 'Video/Audio', icon: Video, description: 'Contenido multimedia educativo' },
    { value: 'link', label: 'Enlace Web', icon: ExternalLink, description: 'Enlaces a recursos externos' },
    { value: 'assignment', label: 'Tarea', icon: ClipboardList, description: 'Actividad para entrega de estudiantes' },
    { value: 'exam', label: 'Evaluación', icon: GraduationCap, description: 'Exámenes y cuestionarios' }
  ];

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const bucketName = formData.resource_type === 'video' ? 'course-videos' : 'course-documents';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(`${sectionId}/${fileName}`, file);

      if (error) throw error;

      setFormData(prev => ({ 
        ...prev, 
        file_path: data.path,
        title: prev.title || file.name.replace(/\.[^/.]+$/, "")
      }));
      
      toast.success('Archivo subido exitosamente');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('course_weekly_resources')
        .insert({
          section_id: sectionId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          resource_type: formData.resource_type,
          resource_url: formData.resource_url.trim() || null,
          file_path: formData.file_path || null,
          is_published: formData.is_published,
          position: 0,
          assignment_deadline: formData.assignment_deadline || null,
          max_score: (formData.resource_type === 'assignment' || formData.resource_type === 'exam') ? formData.max_score : null,
          allows_student_submissions: (formData.resource_type === 'assignment' || formData.resource_type === 'exam') ? formData.allows_student_submissions : false
        });

      if (error) throw error;

      toast.success('Recurso creado exitosamente');
      onSuccess();
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error('Error al crear el recurso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Agregar Nuevo Recurso
          </DialogTitle>
          <DialogDescription>
            Sube archivos o crea actividades para tus estudiantes. Inspirado en Moodle para una experiencia familiar.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Tipo de Recurso *</Label>
            <div className="grid grid-cols-3 gap-2">
              {resourceTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.resource_type === type.value ? "default" : "outline"}
                    className="h-20 flex flex-col gap-1 p-2"
                    onClick={() => setFormData(prev => ({ ...prev, resource_type: type.value as any }))}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs text-center leading-tight">{type.label}</span>
                  </Button>
                );
              })}
            </div>
            {/* Descripción contextual del tipo seleccionado */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              {formData.resource_type === 'material' && (
                <p><strong>Material de Estudio:</strong> Documentos, presentaciones o recursos educativos para consulta.</p>
              )}
              {formData.resource_type === 'document' && (
                <p><strong>Documento:</strong> Archivos PDF, Word, Excel u otros documentos descargables.</p>
              )}
              {formData.resource_type === 'video' && (
                <p><strong>Video:</strong> Contenido multimedia para clases o explicaciones.</p>
              )}
              {formData.resource_type === 'link' && (
                <p><strong>Enlace Web:</strong> Enlaces a sitios web externos o recursos online.</p>
              )}
              {formData.resource_type === 'assignment' && (
                <p><strong>Tarea:</strong> Actividad con entrega de archivos y calificación.</p>
              )}
              {formData.resource_type === 'exam' && (
                <p><strong>Examen:</strong> Evaluación con fecha límite y puntuación.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Nombre del recurso"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción opcional del recurso"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>📁 Subir Archivo</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-4">
              <FileUpload
                onFileSelect={handleFileUpload}
                accept={
                  formData.resource_type === 'video' ? 'video/*' : 
                  formData.resource_type === 'document' ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx' : 
                  undefined
                }
              />
              {uploading && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Subiendo archivo...
                </div>
              )}
              {formData.file_path && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <FileText className="h-4 w-4" />
                  ✓ Archivo subido: {formData.file_path.split('/').pop()}
                </div>
              )}
            </div>
          </div>


          {/* Configuraciones especiales para tareas y exámenes */}
          {(formData.resource_type === 'assignment' || formData.resource_type === 'exam') && (
            <div className="space-y-4 border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <Label className="font-medium">Configuración de Actividad</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignment_deadline">Fecha límite</Label>
                  <Input
                    id="assignment_deadline"
                    type="datetime-local"
                    value={formData.assignment_deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignment_deadline: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_score">Puntuación máxima</Label>
                  <Input
                    id="max_score"
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.max_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_score: parseInt(e.target.value) || 100 }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="allows_submissions"
                  checked={formData.allows_student_submissions}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allows_student_submissions: checked }))}
                />
                <Label htmlFor="allows_submissions">Permitir entregas de estudiantes</Label>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
              <Label htmlFor="is_published">Hacer visible para estudiantes</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Si no está marcado, solo tú podrás ver este recurso hasta que lo publiques
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? 'Creando...' : 'Crear Recurso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}