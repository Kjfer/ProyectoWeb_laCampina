import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResourceFormProps {
  sectionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResourceForm({ sectionId, onClose, onSuccess }: ResourceFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'material' as const,
    resource_url: '',
    is_published: false
  });

  const resourceTypes = [
    { value: 'material', label: 'Material de Estudio' },
    { value: 'document', label: 'Documento' },
    { value: 'video', label: 'Video' },
    { value: 'link', label: 'Enlace Web' },
    { value: 'assignment', label: 'Tarea' },
    { value: 'exam', label: 'Examen' }
  ];

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Recurso</DialogTitle>
          <DialogDescription>
            Crea un nuevo recurso para esta semana del curso.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="resource_type">Tipo de Recurso</Label>
            <Select
              value={formData.resource_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, resource_type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resourceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource_url">URL del Recurso</Label>
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Recurso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}