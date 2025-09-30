import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Link2, 
  ClipboardList, 
  Video, 
  FileImage, 
  Download, 
  ExternalLink, 
  Calendar,
  Clock,
  Target
} from 'lucide-react';

interface WeeklyResource {
  id: string;
  title: string;
  description?: string;
  resource_type: 'material' | 'exam' | 'link' | 'assignment' | 'video' | 'document';
  resource_url?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  is_published: boolean;
  position: number;
  allows_student_submissions?: boolean;
  assignment_deadline?: string;
  max_score?: number;
  settings?: any;
}

interface ResourceDetailModalProps {
  resource: WeeklyResource;
  isOpen: boolean;
  onClose: () => void;
}

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'material':
    case 'document':
      return <FileText className="h-6 w-6" />;
    case 'exam':
    case 'assignment':
      return <ClipboardList className="h-6 w-6" />;
    case 'link':
      return <Link2 className="h-6 w-6" />;
    case 'video':
      return <Video className="h-6 w-6" />;
    default:
      return <FileImage className="h-6 w-6" />;
  }
};

const getResourceTypeLabel = (type: string) => {
  switch (type) {
    case 'material':
      return 'Material de Estudio';
    case 'exam':
      return 'Examen';
    case 'link':
      return 'Enlace Web';
    case 'assignment':
      return 'Tarea/Actividad';
    case 'video':
      return 'Video';
    case 'document':
      return 'Documento';
    default:
      return 'Recurso';
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return null;
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export function ResourceDetailModal({ resource, isOpen, onClose }: ResourceDetailModalProps) {
  const handleDownload = () => {
    if (resource.resource_url) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = resource.resource_url;
      link.download = resource.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenLink = () => {
    if (resource.resource_url) {
      window.open(resource.resource_url, '_blank');
    }
  };

  const isDownloadable = resource.file_path || (resource.resource_type !== 'link' && resource.resource_url);
  const isExternalLink = resource.resource_type === 'link' || (!resource.file_path && resource.resource_url);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted">
              {getResourceIcon(resource.resource_type)}
            </div>
            <div className="flex-1 space-y-2">
              <DialogTitle className="text-xl font-semibold">
                {resource.title}
              </DialogTitle>
              <Badge variant="outline" className="w-fit">
                {getResourceTypeLabel(resource.resource_type)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          {resource.description && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Descripción
              </h3>
              <p className="text-sm leading-relaxed">
                {resource.description}
              </p>
            </div>
          )}

          <Separator />

          {/* File Information */}
          {(resource.file_size || resource.mime_type) && (
            <>
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Información del Archivo
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {resource.file_size && (
                    <div>
                      <span className="text-muted-foreground">Tamaño:</span>
                      <p className="font-medium">{formatFileSize(resource.file_size)}</p>
                    </div>
                  )}
                  {resource.mime_type && (
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p className="font-medium">{resource.mime_type}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Assignment Details */}
          {resource.resource_type === 'assignment' && (
            <>
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Detalles de la Tarea
                </h3>
                <div className="grid gap-4 text-sm">
                  {resource.assignment_deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Fecha límite:</span>
                      <p className="font-medium">
                        {new Date(resource.assignment_deadline).toLocaleString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {resource.max_score && (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Puntuación máxima:</span>
                      <p className="font-medium">{resource.max_score} puntos</p>
                    </div>
                  )}
                  {resource.allows_student_submissions && (
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-primary font-medium">
                        Permite envío de entregas
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {isDownloadable && (
              <Button 
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
            )}
            
            {isExternalLink && (
              <Button 
                onClick={handleOpenLink}
                variant={isDownloadable ? "outline" : "default"}
                className={isDownloadable ? "" : "flex-1"}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Enlace
              </Button>
            )}
            
            {resource.resource_type === 'assignment' && resource.allows_student_submissions && (
              <Button 
                variant="secondary"
                className="flex-1"
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Enviar Tarea
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}