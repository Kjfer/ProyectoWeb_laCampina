import { useState, useEffect } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StudentCourses } from "@/components/dashboard/StudentCourses";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Notifications } from "@/components/Notifications";
import { BookOpen, FileText, GraduationCap, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-education.jpg";

interface DashboardStats {
  coursesCount: number;
  pendingAssignments: number;
  upcomingExams: number;
  attendanceRate: number;
}

const Index = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    coursesCount: 0,
    pendingAssignments: 0,
    upcomingExams: 0,
    attendanceRate: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardStats();
    }
  }, [profile]);

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);

      // Get courses count
      const { count: coursesCount } = await supabase
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', profile!.id);

      // Get pending assignments
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', profile!.id);

      const courseIds = enrollments?.map(e => e.course_id) || [];

      let pendingAssignments = 0;
      if (courseIds.length > 0) {
        // Get all assignments in enrolled courses
        const { data: assignments } = await supabase
          .from('assignments')
          .select('id')
          .in('course_id', courseIds)
          .eq('is_published', true)
          .gt('due_date', new Date().toISOString());

        const assignmentIds = assignments?.map(a => a.id) || [];

        if (assignmentIds.length > 0) {
          // Get submitted assignments
          const { data: submissions } = await supabase
            .from('assignment_submissions')
            .select('assignment_id')
            .eq('student_id', profile!.id)
            .in('assignment_id', assignmentIds);

          const submittedIds = new Set(submissions?.map(s => s.assignment_id) || []);
          pendingAssignments = assignmentIds.filter(id => !submittedIds.has(id)).length;
        }
      }

      // Get upcoming exams
      let upcomingExams = 0;
      if (courseIds.length > 0) {
        const { count: examsCount } = await supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .in('course_id', courseIds)
          .eq('is_published', true)
          .gt('start_time', new Date().toISOString());

        upcomingExams = examsCount || 0;
      }

      // Get attendance rate
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', profile!.id);

      let attendanceRate = 0;
      if (attendance && attendance.length > 0) {
        const presentCount = attendance.filter(a => 
          a.status === 'present' || a.status === 'late'
        ).length;
        attendanceRate = Math.round((presentCount / attendance.length) * 100);
      }

      setStats({
        coursesCount: coursesCount || 0,
        pendingAssignments,
        upcomingExams,
        attendanceRate,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

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
                value={loadingStats ? "..." : stats.coursesCount.toString()}
                icon={BookOpen}
                description="Cursos inscritos"
                color="primary"
              />
              <StatsCard
                title="Tareas Pendientes"
                value={loadingStats ? "..." : stats.pendingAssignments.toString()}
                icon={FileText}
                description="Por entregar próximamente"
                color="accent"
              />
              <StatsCard
                title="Exámenes Próximos"
                value={loadingStats ? "..." : stats.upcomingExams.toString()}
                icon={TrendingUp}
                description="Próximos a rendir"
                color="secondary"
              />
              <StatsCard
                title="Asistencia"
                value={loadingStats ? "..." : `${stats.attendanceRate}%`}
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
