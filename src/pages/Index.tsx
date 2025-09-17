import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingClasses } from "@/components/dashboard/UpcomingClasses";
import { BookOpen, FileText, GraduationCap, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-education.jpg";

const Index = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <Header />
          
          <main className="flex-1 p-6 space-y-6">
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
                    <h1 className="text-2xl font-bold">¡Bienvenido, Juan!</h1>
                    <p className="text-white/90">Institución Educativa La Campiña - Aula Virtual</p>
                  </div>
                </div>
                <p className="text-lg text-white/90 max-w-2xl">
                  Accede a tus cursos, completa tus tareas y mantente conectado con tu educación desde cualquier lugar.
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Cursos Activos"
                value="6"
                icon={BookOpen}
                description="En progreso este semestre"
                color="primary"
              />
              <StatsCard
                title="Tareas Pendientes"
                value="3"
                icon={FileText}
                description="Por entregar esta semana"
                color="accent"
              />
              <StatsCard
                title="Promedio General"
                value="8.7"
                icon={TrendingUp}
                description="Calificación actual"
                color="secondary"
              />
              <StatsCard
                title="Días de Asistencia"
                value="92%"
                icon={GraduationCap}
                description="Este mes"
                color="primary"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                <UpcomingClasses />
                <RecentActivity />
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                <QuickActions />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
