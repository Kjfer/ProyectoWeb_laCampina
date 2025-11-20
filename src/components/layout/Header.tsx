import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bell, Search, User, Settings, LogOut } from "lucide-react"
import { Notifications } from "@/components/Notifications";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

export function Header() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión.",
        variant: "destructive",
      });
    }
  };

  // Fetch unread notifications count
  const fetchUnreadCount = async () => {
    try {
      if (!profile) return;
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount((data || []).length);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    if (!profile) return;
    fetchUnreadCount();

    // Setup realtime subscription for notifications for this user
    const channel = supabase.channel(`notifications_user_${profile.id}`);

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
      // new notification: increment
      setUnreadCount((c) => c + 1);
    });

    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
      // on update (e.g., marked as read) refetch to be safe
      fetchUnreadCount();
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Docente';
      case 'student': return 'Estudiante';
      case 'parent': return 'Padre de Familia';
      case 'tutor': return 'Tutor';
      default: return 'Usuario';
    }
  };

  return (
    <header className="border-b border-border/50 bg-gradient-card/80 backdrop-blur-sm">
      <div className="flex h-16 items-center px-6 gap-4">
        <SidebarTrigger className="hover:bg-primary/10" />
        
        {/* Search */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar cursos, tareas..."
              className="pl-10 bg-background/60 border-border/50 focus:border-primary"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-primary/10">
                  <Bell className="w-5 h-5" />
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] flex items-center justify-center px-1 text-xs"
                    aria-label={`${unreadCount} notificaciones sin leer`}
                  >
                    {unreadCount}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-96 p-0" align="end">
                <div className="max-h-80 overflow-auto">
                  <Notifications />
                </div>
                <DropdownMenuItem asChild>
                  <a href="/profile?tab=notifications" className="w-full text-center text-sm underline">Ver más</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-primary/10">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url} alt="Usuario" />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {profile ? getInitials(profile.first_name, profile.last_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-gradient-card border-border/50" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {profile ? `${profile.first_name} ${profile.last_name}` : 'Usuario'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email}
                  </p>
                  <Badge variant="secondary" className="text-xs w-fit">{profile ? getRoleLabel(profile.role) : 'Usuario'}</Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="hover:bg-primary/10 cursor-pointer" asChild>
                <a href="/profile" className="flex items-center w-full">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-primary/10 cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                className="hover:bg-destructive/10 text-destructive cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}