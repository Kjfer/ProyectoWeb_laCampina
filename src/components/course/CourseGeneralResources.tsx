import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Video, Link as LinkIcon, FileText, Plus, Trash2, ExternalLink, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// --- 1. COMPONENTE VISUAL: ICONO DE WHATSAPP ---
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface Resource {
  id: string;
  title: string;
  type: 'whatsapp' | 'video' | 'link' | 'file';
  content: string;
  description: string;
}

interface Props {
  courseId: string;
  canEdit: boolean;
}

export const CourseGeneralResources = ({ courseId, canEdit }: Props) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estado para saber si estamos editando (si es null, estamos creando)
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    type: 'link',
    title: '',
    content: '',
    description: ''
  });

  useEffect(() => {
    fetchResources();
  }, [courseId]);

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('course_general_resources')
      .select('*')
      .eq('modulo_id', courseId)
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    else setResources(data as any || []);
    setLoading(false);
  };

  // --- 2. FUNCIÓN PARA ABRIR MODAL EN MODO "CREAR" ---
  const handleOpenCreate = () => {
    setEditingId(null); // Reseteamos ID
    setFormData({ type: 'link', title: '', content: '', description: '' }); // Limpiamos form
    setIsDialogOpen(true);
  };

  // --- 3. FUNCIÓN PARA ABRIR MODAL EN MODO "EDITAR" ---
  const handleOpenEdit = (res: Resource) => {
    setEditingId(res.id); // Guardamos el ID que estamos editando
    setFormData({
      type: res.type, // Ojo: Asegurarse que el tipo coincida con los valores del Select
      title: res.title,
      content: res.content,
      description: res.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Título y Enlace son obligatorios');
      return;
    }

    let error;

    if (editingId) {
      // --- MODO ACTUALIZAR ---
      const { error: updateError } = await supabase
        .from('course_general_resources')
        .update({
          title: formData.title,
          type: formData.type,
          content: formData.content,
          description: formData.description
        })
        .eq('id', editingId);
      error = updateError;
    } else {
      // --- MODO CREAR ---
      const { error: insertError } = await supabase
        .from('course_general_resources')
        .insert({
          modulo_id: courseId,
          title: formData.title,
          type: formData.type,
          content: formData.content,
          description: formData.description
        });
      error = insertError;
    }

    if (error) {
      console.error(error);
      toast.error('Error al guardar');
    } else {
      toast.success(editingId ? 'Recurso actualizado' : 'Recurso agregado');
      setIsDialogOpen(false);
      fetchResources();
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('¿Eliminar este recurso?')) return;
    const { error } = await supabase.from('course_general_resources').delete().eq('id', id);
    if (!error) fetchResources();
  };

  // Función para dar estilo según el tipo
  const getResourceStyle = (type: string) => {
    switch (type) {
      case 'whatsapp': 
        // Usamos el componente personalizado para WhatsApp
        return { icon: WhatsAppIcon, color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
      case 'video': 
        return { icon: Video, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' };
      case 'file': 
        return { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
      default: 
        return { icon: LinkIcon, color: 'text-blue-600', bg: 'bg-white border-gray-200' };
    }
  };

  if (loading) return null;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-700">Enlaces y Recursos</h3>
        {canEdit && (
          <Button onClick={handleOpenCreate} size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Agregar Enlace
          </Button>
        )}
      </div>

      {resources.length === 0 && canEdit && (
        <div className="text-sm text-gray-400 italic border border-dashed p-4 rounded-lg text-center">
          No has agregado enlaces importantes (WhatsApp, Zoom, Drive) todavía.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((res) => {
          const style = getResourceStyle(res.type);
          const Icon = style.icon;

          return (
            <Card key={res.id} className={`p-4 border shadow-sm transition-all hover:shadow-md ${style.bg} relative group`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full bg-white shadow-sm ${style.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate" title={res.title}>{res.title}</h4>
                  {res.description && <p className="text-sm text-gray-500 line-clamp-2 mt-1">{res.description}</p>}
                  
                  <div className="mt-3">
                    <a 
                      href={res.content} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                    >
                      Abrir enlace <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                
                {/* BOTONES DE ACCIÓN (Editar y Eliminar) */}
                {canEdit && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50" 
                      onClick={() => handleOpenEdit(res)} // <-- Abre el modal con datos
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50" 
                      onClick={() => handleDelete(res.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Recurso' : 'Agregar Nuevo Recurso'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Enlace</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v: any) => setFormData({...formData, type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">📱 Grupo de WhatsApp</SelectItem>
                  <SelectItem value="video">🎥 Videoconferencia (Zoom/Meet)</SelectItem>
                  <SelectItem value="file">📁 Carpeta Drive / Sílabo</SelectItem>
                  <SelectItem value="link">🔗 Otro Enlace Web</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                placeholder="Ej: Grupo de WhatsApp" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>URL (Pegar link aquí)</Label>
              <Input 
                placeholder="https://..." 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción (Opcional)</Label>
              <Textarea 
                placeholder="Detalles adicionales..." 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>{editingId ? 'Guardar Cambios' : 'Crear Recurso'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
