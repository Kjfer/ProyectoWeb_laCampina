import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, FileText, Link2, ClipboardList, Video, FileImage } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ResourceForm } from './ResourceForm';

interface WeeklyResource {
  id: string;
  title: string;
  description: string;
  resource_type: 'material' | 'exam' | 'link' | 'assignment' | 'video' | 'document';
  resource_url?: string;
  is_published: boolean;
  position: number;
  settings: any;
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

  const handleResourceClick = (resource: WeeklyResource) => {
    if (resource.resource_url) {
      window.open(resource.resource_url, '_blank');
    }
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
              {/* Add Resource Button for Teachers/Admins */}
              {canEdit && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResourceForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Recurso
                  </Button>
                </div>
              )}

              {/* Resources List */}
              {section.resources && section.resources.length > 0 ? (
                <div className="grid gap-3">
                  {section.resources
                    .sort((a, b) => a.position - b.position)
                    .map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleResourceClick(resource)}
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getResourceIcon(resource.resource_type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{resource.title}</h4>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground">{resource.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getResourceTypeLabel(resource.resource_type)}
                          </Badge>
                          {!resource.is_published && canEdit && (
                            <Badge variant="secondary" className="text-xs">
                              Borrador
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay recursos disponibles en esta semana</p>
                  {canEdit && (
                    <p className="text-sm">Haz clic en "Agregar Recurso" para comenzar</p>
                  )}
                </div>
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
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}