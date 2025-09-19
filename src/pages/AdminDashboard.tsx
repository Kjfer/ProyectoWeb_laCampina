import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BookOpen, 
  FileText, 
  BarChart3, 
  UserPlus,
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalCourses: number;
  totalAssignments: number;
  activeUsers: number;
}

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalCourses: 0,
    totalAssignments: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAdminStats();
    }
  }, [profile]);

  const fetchAdminStats = async () => {
    try {
      // Fetch user counts by role
      const { data: usersData } = await supabase
        .from('profiles')
        .select('role, is_active');

      const { data: coursesData } = await supabase
        .from('courses')
        .select('id', { count: 'exact', head: true });

      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('id', { count: 'exact', head: true });

      if (usersData) {
        const totalUsers = usersData.length;
        const totalStudents = usersData.filter(u => u.role === 'student').length;
        const totalTeachers = usersData.filter(u => u.role === 'teacher').length;
        const totalParents = usersData.filter(u => u.role === 'parent').length;
        const activeUsers = usersData.filter(u => u.is_active).length;

        setStats({
          totalUsers,
          totalStudents,
          totalTeachers,
          totalParents,
          totalCourses: coursesData?.length || 0,
          totalAssignments: assignmentsData?.length || 0,
          activeUsers
        });
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas del sistema",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not admin
  if (profile?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Acceso Denegado
            </h3>
            <p className="text-muted-foreground">
              No tienes permisos para acceder al panel de administración.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestión y supervisión del sistema</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} activos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.totalStudents / stats.totalUsers) * 100)}% del total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Docentes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.totalTeachers / stats.totalUsers) * 100)}% del total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAssignments} tareas creadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nuevos usuarios hoy</span>
                    <Badge variant="secondary">5</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tareas enviadas</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cursos activos</span>
                    <Badge variant="secondary">{stats.totalCourses}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tasa de participación</span>
                    <Badge variant="secondary">85%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Satisfacción promedio</span>
                    <Badge variant="secondary">4.2/5</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Usuarios activos</span>
                    <Badge variant="secondary">{Math.round((stats.activeUsers / stats.totalUsers) * 100)}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestión de Usuarios</CardTitle>
              <Button className="bg-gradient-primary shadow-glow">
                <UserPlus className="w-4 h-4 mr-2" />
                Nuevo Usuario
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad de gestión de usuarios en desarrollo.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle>Gestión de Cursos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad de gestión de cursos en desarrollo.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Reportes del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad de reportes en desarrollo.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;