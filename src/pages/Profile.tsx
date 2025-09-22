import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Camera, Mail, Phone, Calendar, Shield } from "lucide-react";

const profileFormSchema = z.object({
  first_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  last_name: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
  avatar_url: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Profile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
      avatar_url: profile?.avatar_url || "",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          avatar_url: data.avatar_url,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido actualizada correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Docente';
      case 'student': return 'Estudiante';
      case 'parent': return 'Padre de Familia';
      default: return 'Usuario';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground';
      case 'teacher': return 'bg-primary text-primary-foreground';
      case 'student': return 'bg-secondary text-secondary-foreground';
      case 'parent': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center">Cargando perfil...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-6 bg-gradient-to-br from-background to-muted/30 min-h-screen">
            {/* Header del Perfil */}
            <div className="flex items-center gap-4 mb-8">
              <Avatar className="h-20 w-20 border-4 border-primary/20">
                <AvatarImage src={profile.avatar_url} alt="Avatar" />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-semibold">
                  {getInitials(profile.first_name, profile.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">
                  {profile.first_name} {profile.last_name}
                </h1>
                <p className="text-muted-foreground text-lg">{profile.email}</p>
                <Badge className={`mt-2 ${getRoleColor(profile.role)}`}>
                  <Shield className="w-4 h-4 mr-1" />
                  {getRoleLabel(profile.role)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Información del Perfil */}
              <div className="lg:col-span-1">
                <Card className="bg-gradient-card border-border/50 shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Información Personal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                    </div>
                    
                    {profile.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Teléfono</p>
                          <p className="font-medium">{profile.phone}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Miembro desde</p>
                        <p className="font-medium">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'No disponible'}
                        </p>
                      </div>
                    </div>

                    <Separator />
                    
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Estado de la cuenta</p>
                      <Badge variant={profile.is_active ? "default" : "destructive"}>
                        {profile.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Formulario de Edición */}
              <div className="lg:col-span-2">
                <Card className="bg-gradient-card border-border/50 shadow-card">
                  <CardHeader>
                    <CardTitle>Editar Perfil</CardTitle>
                    <CardDescription>
                      Actualiza tu información personal. Los cambios se guardarán automáticamente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="first_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Tu nombre" 
                                    {...field}
                                    className="bg-background/60 border-border/50 focus:border-primary"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="last_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Apellido</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Tu apellido" 
                                    {...field}
                                    className="bg-background/60 border-border/50 focus:border-primary"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono (Opcional)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Tu número de teléfono" 
                                  {...field}
                                  className="bg-background/60 border-border/50 focus:border-primary"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="avatar_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL del Avatar (Opcional)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://ejemplo.com/mi-avatar.jpg" 
                                  {...field}
                                  className="bg-background/60 border-border/50 focus:border-primary"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                        >
                          {isLoading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
    </DashboardLayout>
  );
}