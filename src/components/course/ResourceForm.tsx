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
import { FileText, Video, ExternalLink, ClipboardList, GraduationCap, BookOpen } from 'lucide-react';

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
    is_published: false
  });

  const resourceTypes = [
    { value: 'material', label: 'Material de Estudio', icon: BookOpen },
    { value: 'document', label: 'Documento', icon: FileText },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'link', label: 'Enlace Web', icon: ExternalLink },
    { value: 'assignment', label: 'Tarea', icon: ClipboardList },
    { value: 'exam', label: 'Examen', icon: GraduationCap }
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
          position: 0
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
          <DialogTitle>Agregar Nuevo Recurso</DialogTitle>
          <DialogDescription>
            Crea un nuevo recurso para esta semana del curso.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Tipo de Recurso *</Label>
            <div className="grid grid-cols-2 gap-2">
              {resourceTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.resource_type === type.value ? "default" : "outline"}
                    className="h-16 flex flex-col gap-1"
                    onClick={() => setFormData(prev => ({ ...prev, resource_type: type.value as any }))}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
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
            <Label>Subir Archivo Local</Label>
            <FileUpload
              onFileSelect={handleFileUpload}
              accept={formData.resource_type === 'video' ? 'video/*' : undefined}
            />
            {uploading && (
              <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
            )}
            {formData.file_path && (
              <p className="text-sm text-muted-foreground">
                ✓ Archivo subido: {formData.file_path.split('/').pop()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource_url">O URL del Recurso</Label>
            <Input
              id="resource_url"
              type="url"
              value={formData.resource_url}
              onChange={(e) => setFormData(prev => ({ ...prev, resource_url: e.target.value }))}
              placeholder="https://ejemplo.com/archivo.pdf"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_published"
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
            />
            <Label htmlFor="is_published">Publicar inmediatamente</Label>
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