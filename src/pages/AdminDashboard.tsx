import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Users, BookOpen, FileText, Activity, GraduationCap, UserCheck } from 'lucide-react';
import AdminCourseManagement from './AdminCourseManagement';
import SimpleCourseManagement from './SimpleCourseManagement';
import AdminStudentManagement from './AdminStudentManagement';
import TestForm from './TestForm';

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
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
              <p className="mt-2 text-gray-600">No tienes permisos para acceder al panel de administración.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="mt-2 text-gray-600">
          Gestiona usuarios, cursos y contenido de La Campiña
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            title: "Total Usuarios",
            value: stats.totalUsers,
            icon: Users,
            description: "Usuarios registrados en el sistema",
            color: "text-blue-600"
          },
          {
            title: "Estudiantes",
            value: stats.totalStudents,
            icon: GraduationCap,
            description: "Estudiantes activos",
            color: "text-green-600"
          },
          {
            title: "Profesores",
            value: stats.totalTeachers,
            icon: UserCheck,
            description: "Profesores registrados",
            color: "text-purple-600"
          },
          {
            title: "Cursos",
            value: stats.totalCourses,
            icon: BookOpen,
            description: "Cursos disponibles",
            color: "text-indigo-600"
          }
        ].map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <IconComponent className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs de gestión */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="test">Prueba</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="students">Estudiantes</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>
                  Últimas acciones en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Usuario</Badge>
                      <span className="text-sm">Nuevo estudiante registrado</span>
                    </div>
                    <span className="text-xs text-gray-500">Hace 2 horas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Curso</Badge>
                      <span className="text-sm">Curso actualizado</span>
                    </div>
                    <span className="text-xs text-gray-500">Hace 5 horas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Tarea</Badge>
                      <span className="text-sm">Nueva tarea asignada</span>
                    </div>
                    <span className="text-xs text-gray-500">Hace 1 día</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>
                  Tareas administrativas comunes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Crear nuevo usuario
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Crear nuevo curso
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Generar reporte
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={fetchAdminStats}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Actualizar estadísticas
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="test">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Formulario de Prueba</h2>
            <p className="text-gray-600">
              Este es un formulario simple para probar si el problema de input persiste
            </p>
            <TestForm />
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <SimpleCourseManagement />
        </TabsContent>

        <TabsContent value="students">
          <AdminStudentManagement />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reportes del Sistema</CardTitle>
              <CardDescription>
                Genera reportes detallados sobre el uso de la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  Reporte de Usuarios
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <BookOpen className="h-6 w-6 mb-2" />
                  Reporte de Cursos
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  Reporte de Tareas
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Activity className="h-6 w-6 mb-2" />
                  Reporte de Actividad
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;