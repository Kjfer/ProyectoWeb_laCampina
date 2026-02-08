import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Video, Link as LinkIcon, FileText, Plus, Trash2, ExternalLink, Pencil, Briefcase, Loader2, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PortfolioConfigDialog } from './PortfolioConfigDialog';
import { useNavigate } from 'react-router-dom';
import { PortfolioSubmissionDialog } from './PortfolioSubmissionDialog';
import { useAuth } from '@/hooks/useAuth';

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

export const CourseGeneralResources = ({ courseId, canEdit }: { courseId: string; canEdit: boolean }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPortfolioDialogOpen, setIsPortfolioDialogOpen] = useState(false);
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);

  const [formData, setFormData] = useState({ type: 'link', title: '', content: '', description: '' });

  useEffect(() => {
    fetchInitialData();
  }, [courseId, profile?.id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchResources(), fetchPortfolio()]);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    const { data: moduloData } = await supabase.from('modulos').select('course_id').eq('id', courseId).single();
    if (moduloData?.course_id) {
      const { data: portfolioData } = await supabase.from('edition_portfolios').select('*').eq('edition_id', moduloData.course_id).maybeSingle();
      if (portfolioData) {
        setPortfolio(portfolioData);
        if (profile?.id && !canEdit) {
          const { data: subData } = await supabase.from('edition_portfolio_submissions').select('*').eq('portfolio_id', portfolioData.id).eq('student_id', profile.id).maybeSingle();
          setUserSubmission(subData);
        }
      }
    }
  };

  const fetchResources = async () => {
    const { data } = await supabase.from('course_general_resources').select('*').eq('modulo_id', courseId).order('created_at', { ascending: true });
    setResources(data as any || []);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) { toast.error('Obligatorios'); return; }
    const { error } = editingId 
      ? await supabase.from('course_general_resources').update(formData).eq('id', editingId)
      : await supabase.from('course_general_resources').insert([{ modulo_id: courseId, ...formData }]);
    if (error) toast.error('Error');
    else { setIsDialogOpen(false); fetchResources(); }
  };

  const getResourceStyle = (type: string) => {
    switch (type) {
      case 'whatsapp': return { icon: WhatsAppIcon, color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
      case 'video': return { icon: Video, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' };
      case 'file': return { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
      default: return { icon: LinkIcon, color: 'text-blue-600', bg: 'bg-white border-gray-200' };
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="mb-6 space-y-4">
      {portfolio && (
        <Card className="mb-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white border-none shadow-lg">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl"><Briefcase className="h-8 w-8" /></div>
              <div><h3 className="font-bold text-xl">{portfolio.title}</h3><p className="text-blue-100 text-sm italic">{portfolio.description}</p></div>
            </div>
            <div className="flex flex-wrap gap-3">
              {canEdit ? (
                <Button className="bg-green-600" onClick={() => navigate(`/admin/portfolios/${portfolio.id}/review`)}>Revisar Entregas</Button>
              ) : (
                <>
                  {(!userSubmission || userSubmission.status !== 'graded') && (
                    <Button className={userSubmission ? "bg-green-600" : "bg-orange-500"} onClick={() => setIsSubmissionDialogOpen(true)}>
                      {userSubmission ? '📂 Ver / Editar Entrega' : '📤 Entregar Portafolio'}
                    </Button>
                  )}
                  {userSubmission && userSubmission.status !== 'graded' && <Badge className="bg-yellow-500"><Loader2 className="h-3 w-3 animate-spin mr-1" /> En revisión</Badge>}
                  {userSubmission && userSubmission.status === 'graded' && <Button className="bg-green-600" onClick={() => document.getElementById('res-nota')?.scrollIntoView({behavior:'smooth'})}>✅ Ver Nota</Button>}
                </>
              )}
              <Button variant="secondary" asChild><a href={portfolio.template_file_path} target="_blank">Ver Plantilla</a></Button>
              {canEdit && <Button variant="ghost" onClick={() => setIsPortfolioDialogOpen(true)}><Pencil className="h-4 w-4" /></Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {!canEdit && userSubmission && userSubmission.status === 'graded' && (
        <div id="res-nota" className="mb-6 p-6 bg-white rounded-xl border-2 border-green-200 shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-green-700 font-bold text-xs uppercase">Calificación Final</p>
              <div className="flex items-center gap-3"><span className="text-5xl font-black">{userSubmission.grade}</span><Badge className="bg-green-600">Aprobado</Badge></div>
            </div>
            <Button className="bg-blue-600 font-bold" onClick={() => window.open(`${supabase.storage.from('student-submissions').getPublicUrl(userSubmission.file_path).data.publicUrl}?t=${new Date().getTime()}`, '_blank')}>
              <FileCheck className="mr-2" /> Ver Revision de Portafolio
            </Button>
          </div>
          {userSubmission.feedback && <div className="mt-4 p-3 bg-gray-50 rounded border italic text-gray-600">"{userSubmission.feedback}"</div>}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Enlaces y Recursos</h3>
        {canEdit && <Button onClick={() => setIsDialogOpen(true)} size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Agregar</Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((res) => {
          const style = getResourceStyle(res.type);
          const Icon = style.icon;
          return (
            <Card key={res.id} className={`p-4 border ${style.bg} group relative`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full bg-white ${style.color}`}><Icon className="h-6 w-6" /></div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{res.title}</h4>
                  <a href={res.content} target="_blank" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2">Abrir <ExternalLink className="h-3 w-3" /></a>
                </div>
                {canEdit && <Button variant="ghost" size="icon" className="text-red-500 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(res.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </Card>
          );
        })}
      </div>

      <PortfolioConfigDialog editionId={portfolio?.edition_id || courseId} isOpen={isPortfolioDialogOpen} onClose={() => setIsPortfolioDialogOpen(false)} onSuccess={fetchInitialData} initialData={portfolio} />
      {portfolio && <PortfolioSubmissionDialog portfolioId={portfolio.id} isOpen={isSubmissionDialogOpen} onClose={() => setIsSubmissionDialogOpen(false)} onSuccess={fetchInitialData} />}
    </div>
  );
};