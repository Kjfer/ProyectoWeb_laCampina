import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  coursesCount: number;
  pendingAssignments: number;
  upcomingExams: number;
  attendanceRate: number;
}

export function useStudentDashboardStats(studentId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-stats', studentId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!studentId) throw new Error('Student ID required');

      // Get enrolled course IDs first
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', studentId);

      if (enrollError) throw enrollError;

      const courseIds = enrollments?.map(e => e.course_id) || [];
      const coursesCount = courseIds.length;

      if (courseIds.length === 0) {
        return {
          coursesCount: 0,
          pendingAssignments: 0,
          upcomingExams: 0,
          attendanceRate: 0,
        };
      }

      const now = new Date().toISOString();

      // Parallel queries for assignments, exams, and attendance
      const [assignmentsResult, submissionsResult, examsResult, attendanceResult] = await Promise.all([
        // Get published assignments with future due dates
        supabase
          .from('assignments')
          .select('id')
          .in('course_id', courseIds)
          .eq('is_published', true)
          .gt('due_date', now),
        
        // Get student's submissions
        supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .eq('student_id', studentId),
        
        // Get upcoming exams count
        supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .in('course_id', courseIds)
          .eq('is_published', true)
          .gt('start_time', now),
        
        // Get attendance records
        supabase
          .from('attendance')
          .select('status')
          .eq('student_id', studentId),
      ]);

      // Calculate pending assignments
      const assignmentIds = assignmentsResult.data?.map(a => a.id) || [];
      const submittedIds = new Set(submissionsResult.data?.map(s => s.assignment_id) || []);
      const pendingAssignments = assignmentIds.filter(id => !submittedIds.has(id)).length;

      // Get upcoming exams
      const upcomingExams = examsResult.count || 0;

      // Calculate attendance rate
      let attendanceRate = 0;
      const attendance = attendanceResult.data || [];
      if (attendance.length > 0) {
        const presentCount = attendance.filter(a => 
          a.status === 'present' || a.status === 'late'
        ).length;
        attendanceRate = Math.round((presentCount / attendance.length) * 100);
      }

      return {
        coursesCount,
        pendingAssignments,
        upcomingExams,
        attendanceRate,
      };
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2, // 2 minutes (more frequent updates for dashboard)
  });
}
