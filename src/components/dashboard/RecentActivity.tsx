import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const activities = [
  {
    id: 1,
    title: "Tarea de Matemáticas entregada",
    subject: "Álgebra II",
    time: "Hace 2 horas",
    status: "completed",
    icon: CheckCircle,
  },
  {
    id: 2,
    title: "Nueva clase de Historia",
    subject: "Historia Mundial",
    time: "Hace 4 horas", 
    status: "new",
    icon: Clock,
  },
  {
    id: 3,
    title: "Examen de Química próximo",
    subject: "Química Orgánica",
    time: "Mañana 10:00 AM",
    status: "pending",
    icon: AlertCircle,
  },
  {
    id: 4,
    title: "Proyecto de Inglés calificado",
    subject: "English Literature",
    time: "Hace 1 día",
    status: "completed",
    icon: CheckCircle,
  },
];

export function RecentActivity() {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { 
          variant: "secondary" as const, 
          label: "Completado",
          iconColor: "text-secondary"
        };
      case "pending":
        return { 
          variant: "destructive" as const, 
          label: "Pendiente",
          iconColor: "text-destructive"
        };
      case "new":
        return { 
          variant: "default" as const, 
          label: "Nuevo",
          iconColor: "text-accent"
        };
      default:
        return { 
          variant: "outline" as const, 
          label: "Desconocido",
          iconColor: "text-muted-foreground"
        };
    }
  };

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon;
            const statusConfig = getStatusConfig(activity.status);
            
            return (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`mt-0.5 ${statusConfig.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.time}
                  </p>
                </div>
                <Badge variant={statusConfig.variant} className="text-xs">
                  {statusConfig.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}