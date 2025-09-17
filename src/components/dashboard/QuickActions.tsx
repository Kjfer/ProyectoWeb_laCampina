import { BookOpen, FileText, MessageSquare, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
  {
    title: "Nuevo Curso",
    description: "Explorar cursos disponibles",
    icon: BookOpen,
    color: "primary" as const,
  },
  {
    title: "Subir Tarea",
    description: "Entregar assignment pendiente",
    icon: FileText,
    color: "secondary" as const,
  },
  {
    title: "Mensajes",
    description: "Chatear con profesores",
    icon: MessageSquare,
    color: "accent" as const,
  },
  {
    title: "Clase Virtual",
    description: "Unirse a sesión en vivo",
    icon: Video,
    color: "primary" as const,
  },
];

export function QuickActions() {
  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Acciones Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const colorClasses = {
              primary: "bg-gradient-primary hover:shadow-glow text-primary-foreground",
              secondary: "bg-gradient-secondary hover:shadow-soft text-secondary-foreground",
              accent: "bg-accent hover:shadow-soft text-accent-foreground"
            };

            return (
              <Button
                key={action.title}
                variant="outline"
                className={`h-auto p-4 flex flex-col gap-2 border-0 ${colorClasses[action.color]} transition-all duration-300`}
              >
                <Icon className="w-5 h-5" />
                <div className="text-center">
                  <div className="text-sm font-medium">{action.title}</div>
                  <div className="text-xs opacity-90">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}