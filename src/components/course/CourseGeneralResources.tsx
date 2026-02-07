import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Video, Link as LinkIcon, FileText, Plus, Trash2, ExternalLink, Pencil, Briefcase, Loader2, CheckCircle, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PortfolioConfigDialog } from './PortfolioConfigDialog';
import { useNavigate } from 'react-router-dom';
import { PortfolioSubmissionDialog } from './PortfolioSubmissionDialog';

// --- 1. COMPONENTE VISUAL: ICONO DE WHATSAPP (MANTENIDO) ---
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
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
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPortfolioDialogOpen, setIsPortfolioDialogOpen] = useState(false);
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'link',
    title: '',
    content: '',
    description: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, [courseId]);

  // --- CARGA DE DATOS (OPTIMIZADA) ---
  const fetchInitialData = async () => {
    setLoading(true);
    setUserSubmission(null); // Limpiamos para evitar datos fantasmas
    try {
      await Promise.all([fetchResources(), fetchPortfolio()]);
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    // 1. Obtener el ID real de la edición
    const { data: moduloData } = await supabase
      .from('modulos')
      .select('course_id')
      .eq('id', courseId)
      .single();

    if (moduloData?.course_id) {
      // 2. Buscar el portafolio
      const { data: portfolioData } = await supabase
        .from('edition_portfolios')
        .select('*')
        .eq('edition_id', moduloData.course_id)
        .maybeSingle();

      if (portfolioData) {
        setPortfolio(portfolioData);

        // 3. Si es alumno, buscar su entrega inmediatamente
        if (!canEdit) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: subData } = await supabase
              .from('edition_portfolio_submissions')
              .select('*')
              .eq('portfolio_id', portfolioData.id)
              .eq('student_id', session.user.id)
              .maybeSingle();
            
            setUserSubmission(subData);
          }
        }
      }
    }
  };

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('course_general_resources')
      .select('*')
      .eq('modulo_id', courseId)
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    else setResources(data as any || []);
  };

  // --- LÓGICA DE RECURSOS (LINKS/VIDEOS) MANTENIDA IGUAL ---
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ type: 'link', title: '', content: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (res: Resource) => {
    setEditingId(res.id);
    setFormData({
      type: res.type,
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
    if (!error) {
      toast.success('Recurso eliminado');
      fetchResources();
    }
  };

  const getResourceStyle = (type: string) => {
    switch (type) {
      case 'whatsapp': 
        return { icon: WhatsAppIcon, color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
      case 'video': 
        return { icon: Video, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' };
      case 'file': 
        return { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
      default: 
        return { icon: LinkIcon, color: 'text-blue-600', bg: 'bg-white border-gray-200' };
    }
  };

  if (loading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="mb-6 space-y-4">
      {/* SECCIÓN DESTACADA: PORTAFOLIO FINAL (Si existe) */}
      {portfolio && (
        <Card className="mb-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white border-none shadow-lg overflow-hidden transition-all hover:scale-[1.005]">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-bold text-xl">{portfolio.title}</h3>
                <p className="text-blue-100 text-sm opacity-90 line-clamp-1">
                  {portfolio.description || 'Entrega final para certificación del módulo'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* ACCIONES PROFESOR */}
              {canEdit && (
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md"
                  onClick={() => navigate(`/admin/portfolios/${portfolio.id}/review`)}
                >
                  Revisar Entregas
                </Button>
              )}

              {/* ACCIONES ALUMNO - LÓGICA MEJORADA */}
              {!canEdit && (
                <>
                  {!userSubmission ? (
                    // Estado 1: No entregado
                    <Button 
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md"
                      onClick={() => setIsSubmissionDialogOpen(true)}
                    >
                      Entregar Portafolio
                    </Button>
                  ) : userSubmission.status !== 'graded' ? (
                    // Estado 2: Entregado pero no calificado (PENDIENTE)
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500 text-white border-none py-2 px-3 flex gap-1 items-center shadow-sm">
                        <Loader2 className="h-3 w-3 animate-spin" /> En revisión
                      </Badge>
                      <Button 
                        variant="secondary"
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                        onClick={() => setIsSubmissionDialogOpen(true)}
                      >
                        Reemplazar PDF
                      </Button>
                    </div>
                  ) : null /* Si está calificado, se muestra la tarjeta abajo */ }
                </>
              )}
              
              <Button 
                variant="secondary" 
                size="sm"
                className="font-bold bg-white text-blue-800 hover:bg-blue-50"
                asChild
              >
                <a href={portfolio.template_file_path} target="_blank" rel="noreferrer">
                  Ver Plantilla
                </a>
              </Button>

              {canEdit && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsPortfolioDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- TARJETA DE RESULTADOS (SOLO SI YA FUE CALIFICADO) --- */}
      {!canEdit && userSubmission && userSubmission.status === 'graded' && (
        <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200 shadow-md animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h4 className="text-green-700 font-bold uppercase tracking-wide text-xs mb-1">¡Calificación Disponible!</h4>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-5xl font-black text-gray-800">{userSubmission.grade}</span>
                <Badge className="bg-green-600 text-white px-3 py-1 text-base">Aprobado</Badge>
              </div>
            </div>

            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-8 shadow-lg hover:shadow-xl transition-all"
              onClick={() => {
                const { data } = supabase.storage.from('student-submissions').getPublicUrl(userSubmission.file_path);
                // Truco del timestamp para romper la caché y ver el dibujo nuevo
                window.open(`${data.publicUrl}?t=${new Date().getTime()}`, '_blank');
              }}
            >
              <FileCheck className="mr-2 h-6 w-6" /> Ver Correcciones del Profesor
            </Button>
          </div>

          {userSubmission.feedback && (
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Comentarios del docente:</p>
              <p className="text-gray-700 italic">"{userSubmission.feedback}"</p>
            </div>
          )}
        </div>
      )}

      {/* --- LISTA DE RECURSOS (MANTENIDA) --- */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-700">Enlaces y Recursos</h3>
        <div className="flex gap-2">
          {canEdit && !portfolio && (
            <Button 
              onClick={() => setIsPortfolioDialogOpen(true)} 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md"
            >
              <Plus className="h-4 w-4" /> Configurar Portafolio
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleOpenCreate} size="sm" variant="outline" className="gap-2 border-gray-300">
              <Plus className="h-4 w-4" /> Agregar Enlace
            </Button>
          )}
        </div>
      </div>

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
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline transition-all"
                    >
                      Abrir enlace <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                
                {canEdit && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-white" 
                      onClick={() => handleOpenEdit(res)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-white" 
                      onClick={() => handleDelete(res.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* --- MODALES --- */}
      {/* Modal Recursos Generales */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">
              {editingId ? 'Editar Recurso' : 'Nuevo Enlace / Recurso'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Enlace</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v: any) => setFormData({...formData, type: v})}
              >
                <SelectTrigger className="w-full">
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
              <Label className="text-sm font-medium">Título</Label>
              <Input 
                placeholder="Ej: Acceso a clases grabadas" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">URL del enlace</Label>
              <Input 
                placeholder="https://..." 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Descripción (Opcional)</Label>
              <Textarea 
                placeholder="Indica para qué sirve este enlace..." 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editingId ? 'Guardar Cambios' : 'Crear Recurso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Configuración Portafolio */}
      <PortfolioConfigDialog 
        editionId={portfolio?.edition_id || courseId} 
        isOpen={isPortfolioDialogOpen}
        onClose={() => setIsPortfolioDialogOpen(false)}
        onSuccess={fetchInitialData} 
        initialData={portfolio} 
      />

      {/* Modal Entrega Alumno */}
      {portfolio && (
        <PortfolioSubmissionDialog 
          portfolioId={portfolio.id}
          isOpen={isSubmissionDialogOpen}
          onClose={() => setIsSubmissionDialogOpen(false)}
          onSuccess={fetchInitialData} // Recargará para mostrar la tarjeta de nota
        />
      )}
    </div>
  );
};