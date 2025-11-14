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
import { FileText, Video, ExternalLink, ClipboardList, GraduationCap, BookOpen, Calendar } from 'lucide-react';

interface WeeklyResource {
  id: string;
  title: string;
  description?: string;
  resource_type: 'material' | 'exam' | 'link' | 'assignment' | 'video' | 'document';
  resource_url?: string;
  file_path?: string;
  is_published: boolean;
  assignment_deadline?: string;
  max_score?: number;
  allows_student_submissions?: boolean;
}

interface ResourceEditFormProps {
  resource: WeeklyResource;
  sectionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResourceEditForm({ resource, sectionId, onClose, onSuccess }: ResourceEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: resource.title,
    description: resource.description || '',
    resource_type: resource.resource_type,
    resource_url: resource.resource_url || '',
    file_path: resource.file_path || '',
    is_published: resource.is_published,
    assignment_deadline: resource.assignment_deadline ? new Date(resource.assignment_deadline).toISOString().slice(0, 16) : '',
    max_score: resource.max_score || 100,
    allows_student_submissions: resource.allows_student_submissions || false
  });

  const resourceTypes = [
    { value: 'material', label: 'Material de Estudio', icon: BookOpen },
    { value: 'document', label: 'Archivo', icon: FileText },
    { value: 'video', label: 'Video/Audio', icon: Video },
    { value: 'link', label: 'Enlace Web', icon: ExternalLink },
    { value: 'assignment', label: 'Tarea', icon: ClipboardList },
    { value: 'exam', label: 'Evaluación', icon: GraduationCap }
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
      let deadlineISO = null;
      if (formData.assignment_deadline) {
        deadlineISO = new Date(formData.assignment_deadline).toISOString();
      }

      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        resource_type: formData.resource_type,
        resource_url: formData.resource_url.trim() || null,
        file_path: formData.file_path || null,
        is_published: formData.is_published,
        assignment_deadline: deadlineISO,
        max_score: (formData.resource_type === 'assignment' || formData.resource_type === 'exam') ? formData.max_score : null,
        allows_student_submissions: (formData.resource_type === 'assignment' || formData.resource_type === 'exam') ? formData.allows_student_submissions : false
      };

      const { error } = await supabase
        .from('course_weekly_resources')
        .update(updateData)
        .eq('id', resource.id);

      if (error) throw error;

      toast.success('Recurso actualizado exitosamente');
      onSuccess();
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error('Error al actualizar el recurso');
    } finally {
      setLoading(false);
    }
  };

  const isAssignmentType = formData.resource_type === 'assignment' || formData.resource_type === 'exam';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Recurso</DialogTitle>
          <DialogDescription>
            Modifica los detalles de este recurso.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Recurso</Label>
            <div className="grid grid-cols-2 gap-2">
              {resourceTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, resource_type: type.value as any }))}
                    className={`p-3 border rounded-lg flex items-center gap-2 hover:bg-accent transition-colors ${
                      formData.resource_type === type.value ? 'border-primary bg-accent' : ''
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Título del recurso"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe este recurso..."
              rows={3}
            />
          </div>

          {formData.resource_type === 'link' && (
            <div className="space-y-2">
              <Label htmlFor="resource_url">URL del Enlace</Label>
              <Input
                id="resource_url"
                type="url"
                value={formData.resource_url}
                onChange={(e) => setFormData(prev => ({ ...prev, resource_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          )}

          {formData.resource_type !== 'link' && (
            <div className="space-y-2">
              <Label>Archivo</Label>
              <FileUpload
                onFileSelect={handleFileUpload}
                accept={formData.resource_type === 'video' ? 'video/*,audio/*' : '*'}
                multiple={false}
                disabled={uploading}
              />
              {formData.file_path && (
                <p className="text-xs text-muted-foreground">
                  Archivo actual: {formData.file_path.split('/').pop()}
                </p>
              )}
            </div>
          )}

          {isAssignmentType && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignment_deadline">Fecha de Entrega</Label>
                  <Input
                    id="assignment_deadline"
                    type="datetime-local"
                    value={formData.assignment_deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignment_deadline: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_score">Puntuación Máxima</Label>
                  <Input
                    id="max_score"
                    type="number"
                    min="0"
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
            </>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="is_published"
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
            />
            <Label htmlFor="is_published">Publicar recurso</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
