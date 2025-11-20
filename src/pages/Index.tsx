import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StudentCourses } from "@/components/dashboard/StudentCourses";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BookOpen, FileText, GraduationCap, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStudentDashboardStats } from "@/hooks/queries/useDashboardData";
import heroImage from "@/assets/hero-education.jpg";

const Index = () => {
  const { profile } = useAuth();
  const { data: stats, isLoading: loadingStats } = useStudentDashboardStats(profile?.id);

  const getWelcomeMessage = () => {
    const name = profile ? profile.first_name : 'Usuario';
    switch (profile?.role) {
      case 'teacher':
        return `¡Bienvenido, Prof. ${name}!`;
      case 'admin':
        return `¡Bienvenido, ${name}!`;
      case 'parent':
        return `¡Bienvenido, ${name}!`;
      default:
        return `¡Bienvenido, ${name}!`;
    }
  };

  const getSubtitle = () => {
    switch (profile?.role) {
      case 'teacher':
        return 'Portal Docente - IE La Campiña';
      case 'admin':
        return 'Panel de Administración - IE La Campiña';
      case 'parent':
        return 'Portal de Padres - IE La Campiña';
      default:
        return 'Aula Virtual - IE La Campiña';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 text-white shadow-glow">
              <div className="absolute inset-0 opacity-20">
                <img 
                  src={heroImage} 
                  alt="Educación virtual IE La Campiña" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <GraduationCap className="w-8 h-8" />
                  <div>
                    <h1 className="text-2xl font-bold">{getWelcomeMessage()}</h1>
                    <p className="text-white/90">{getSubtitle()}</p>
                  </div>
                </div>
                <p className="text-lg text-white/90 max-w-2xl">
                  {profile?.role === 'teacher' 
                    ? 'Gestiona tus cursos, evalúa a tus estudiantes y mantente conectado con la comunidad educativa.'
                    : profile?.role === 'admin'
                    ? 'Administra la plataforma educativa y supervisa el progreso académico institucional.'
                    : profile?.role === 'parent'
                    ? 'Mantente informado sobre el progreso académico de tus hijos y la vida escolar.'
                    : 'Accede a tus cursos, completa tus tareas y mantente conectado con tu educación desde cualquier lugar.'
                  }
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Mis Cursos"
                value={loadingStats ? "..." : (stats?.coursesCount || 0).toString()}
                icon={BookOpen}
                description="Cursos inscritos"
                color="primary"
              />
              <StatsCard
                title="Tareas Pendientes"
                value={loadingStats ? "..." : (stats?.pendingAssignments || 0).toString()}
                icon={FileText}
                description="Por entregar próximamente"
                color="accent"
              />
              <StatsCard
                title="Exámenes Próximos"
                value={loadingStats ? "..." : (stats?.upcomingExams || 0).toString()}
                icon={TrendingUp}
                description="Próximos a rendir"
                color="secondary"
              />
              <StatsCard
                title="Asistencia"
                value={loadingStats ? "..." : `${stats?.attendanceRate || 0}%`}
                icon={GraduationCap}
                description="Tasa de asistencia"
                color="primary"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                <StudentCourses />
                <RecentActivity />
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                <QuickActions />
              </div>
            </div>
          </div>
    </DashboardLayout>
  );
};

export default Index;
