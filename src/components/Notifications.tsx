import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationAssignment {
  id: string;
  title: string;
  due_date: string;
}

interface Notification {
  id: string;
  assignment_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  assignments?: NotificationAssignment;
}

export function Notifications() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
    }
  }, [profile]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          assignments (
            id,
            title,
            due_date
          )
        `)
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalize assignments to always be a single object
      const normalizedData = (data || []).map((notif: any) => ({
        ...notif,
        assignments: Array.isArray(notif.assignments) 
          ? notif.assignments[0] 
          : notif.assignments
      }));

      setNotifications(normalizedData);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );

      toast.success('Notificación marcada como leída');
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast.error('Error al actualizar notificación');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

      if (unreadIds.length === 0) {
        toast.info('No hay notificaciones sin leer');
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast.error('Error al actualizar notificaciones');
    }
  };

  const getNotificationIcon = (type: string) => {
    return type === 'overdue' ? (
      <AlertCircle className="h-5 w-5 text-destructive" />
    ) : (
      <Bell className="h-5 w-5 text-warning" />
    );
  };

  const getNotificationBadge = (type: string) => {
    return type === 'overdue' ? (
      <Badge variant="destructive">Vencida</Badge>
    ) : (
      <Badge className="bg-warning text-warning-foreground">Pendiente</Badge>
    );
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando notificaciones...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Notificaciones</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} sin leer</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Marcar todas como leídas
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tienes notificaciones</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.is_read
                    ? 'bg-background'
                    : 'bg-accent/50 border-accent'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getNotificationBadge(notification.type)}
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                       <p className="text-sm">{notification.message}</p>
                      {notification.assignments && (
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            Fecha de entrega:{' '}
                            {new Date(
                              notification.assignments.due_date
                            ).toLocaleDateString('es-ES')}
                          </p>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => {
                              markAsRead(notification.id);
                              navigate('/assignments');
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ver tarea
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
