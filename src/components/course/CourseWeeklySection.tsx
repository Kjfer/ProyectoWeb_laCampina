import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, FileText, Link2, ClipboardList, Video, FileImage } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ResourceForm } from './ResourceForm';
import { ResourceDetailModal } from './ResourceDetailModal';

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

interface WeeklySection {
  id: string;
  week_number: number;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_published: boolean;
  resources?: WeeklyResource[];
}

interface CourseWeeklySectionProps {
  section: WeeklySection;
  courseId: string;
  canEdit: boolean;
  onUpdateSection?: (section: WeeklySection) => void;
}

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'material':
    case 'document':
      return <FileText className="h-4 w-4" />;
    case 'exam':
    case 'assignment':
      return <ClipboardList className="h-4 w-4" />;
    case 'link':
      return <Link2 className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    default:
      return <FileImage className="h-4 w-4" />;
  }
};

const getResourceTypeLabel = (type: string) => {
  switch (type) {
    case 'material':
      return 'Material';
    case 'exam':
      return 'Examen';
    case 'link':
      return 'Enlace';
    case 'assignment':
      return 'Tarea';
    case 'video':
      return 'Video';
    case 'document':
      return 'Documento';
    default:
      return 'Recurso';
  }
};

export function CourseWeeklySection({ section, courseId, canEdit, onUpdateSection }: CourseWeeklySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [selectedResource, setSelectedResource] = useState<WeeklyResource | null>(null);

  const handleResourceClick = (resource: WeeklyResource) => {
    setSelectedResource(resource);
  };

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div>
                  <CardTitle className="text-lg">
                    Semana {section.week_number}: {section.title}
                  </CardTitle>
                  {section.description && (
                    <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {section.start_date && section.end_date && (
                  <Badge variant="outline" className="text-xs">
                    {new Date(section.start_date).toLocaleDateString()} - {new Date(section.end_date).toLocaleDateString()}
                  </Badge>
                )}
                <Badge variant={section.is_published ? "default" : "secondary"}>
                  {section.is_published ? "Publicado" : "Borrador"}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-4">
              <div className="min-h-[350px] space-y-3">
                {section.resources && section.resources.length > 0 ? (
                  section.resources
                    .filter(resource => canEdit || resource.is_published)
                    .sort((a, b) => a.position - b.position)
                    .map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleResourceClick(resource)}
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getResourceIcon(resource.resource_type)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <h4 className="font-medium text-base">{resource.title}</h4>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground">{resource.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {getResourceTypeLabel(resource.resource_type)}
                            </Badge>
                            {!resource.is_published && canEdit && (
                              <Badge variant="secondary" className="text-xs">
                                Borrador
                              </Badge>
                            )}
                            {resource.resource_type === 'assignment' && resource.assignment_deadline && (
                              <Badge variant="outline" className="text-xs">
                                Entrega: {new Date(resource.assignment_deadline).toLocaleDateString('es', { 
                                  day: 'numeric', 
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Badge>
                            )}
                            {resource.max_score && (
                              <Badge variant="outline" className="text-xs">
                                {resource.max_score} pts
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No hay recursos en esta semana</p>
                    <p className="text-sm">Agrega materiales, videos, tareas y más para tus estudiantes</p>
                  </div>
                )}
              </div>
              
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => setShowResourceForm(true)}
                  className="w-full h-12 text-base"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Recurso
                </Button>
              )}

              {/* Resource Form Modal */}
              {showResourceForm && (
                <ResourceForm
                  sectionId={section.id}
                  onClose={() => setShowResourceForm(false)}
                  onSuccess={() => {
                    setShowResourceForm(false);
                    // Refresh the section data
                    onUpdateSection?.(section);
                  }}
                />
              )}

              {/* Resource Detail Modal */}
              {selectedResource && (
                <ResourceDetailModal
                  resource={selectedResource}
                  isOpen={!!selectedResource}
                  onClose={() => setSelectedResource(null)}
                />
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}