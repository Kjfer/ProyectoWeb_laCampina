import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  name: string;
  code: string;
  schedule?: Array<{
    day: string;
    start_time: string;
    end_time: string;
  }>;
  teacher?: {
    first_name: string;
    last_name: string;
  };
  pending_assignments?: number;
  upcoming_exams?: number;
}

interface CourseDetail {
  id: string;
  name: string;
  code: string;
  description: string;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  classroom?: {
    name: string;
    grade: string;
    education_level: string;
  };
  students: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    enrolled_at: string;
  }>;
  additionalTeachers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
}

// Optimized student courses query - eliminates N+1 problem
export function useStudentCourses(studentId: string | undefined) {
  return useQuery({
    queryKey: ['student-courses', studentId],
    queryFn: async (): Promise<Course[]> => {
      if (!studentId) throw new Error('Student ID required');

      // Get enrolled courses with teacher info in one query
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select(`
          course_id,
          courses (
            id,
            name,
            code,
            schedule,
            profiles!courses_teacher_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('student_id', studentId);

      if (enrollError) throw enrollError;

      const courses = enrollments?.map(e => e.courses).filter(Boolean) || [];
      const courseIds = courses.map(c => c.id);

      if (courseIds.length === 0) return [];

      const now = new Date().toISOString();

      // Parallel queries for all assignments and exams counts
      const [assignmentsResult, submissionsResult, examsResult] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, course_id')
          .in('course_id', courseIds)
          .eq('is_published', true)
          .gt('due_date', now),
        
        supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .eq('student_id', studentId),
        
        supabase
          .from('exams')
          .select('id, course_id')
          .in('course_id', courseIds)
          .eq('is_published', true)
          .gt('start_time', now),
      ]);

      // Create maps for efficient lookup
      const submittedIds = new Set(submissionsResult.data?.map(s => s.assignment_id) || []);
      const assignmentsByCourse = new Map<string, string[]>();
      const examsByCourse = new Map<string, number>();

      assignmentsResult.data?.forEach(a => {
        if (!assignmentsByCourse.has(a.course_id)) {
          assignmentsByCourse.set(a.course_id, []);
        }
        assignmentsByCourse.get(a.course_id)!.push(a.id);
      });

      examsResult.data?.forEach(e => {
        examsByCourse.set(e.course_id, (examsByCourse.get(e.course_id) || 0) + 1);
      });

      // Map courses with counts
      return courses.map((course: any) => {
        const courseAssignments = assignmentsByCourse.get(course.id) || [];
        const pendingAssignments = courseAssignments.filter(id => !submittedIds.has(id)).length;
        const upcomingExams = examsByCourse.get(course.id) || 0;

        return {
          id: course.id,
          name: course.name,
          code: course.code,
          schedule: course.schedule,
          teacher: course.profiles,
          pending_assignments: pendingAssignments,
          upcoming_exams: upcomingExams,
        };
      });
    },
    enabled: !!studentId,
  });
}

// Optimized course detail query - parallel fetching
export function useCourseDetail(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: async (): Promise<CourseDetail | null> => {
      if (!courseId) throw new Error('Course ID required');

      // Parallel queries for course, students, and additional teachers
      const [courseResult, studentsResult, teachersResult] = await Promise.all([
        supabase
          .from('courses')
          .select(`
            *,
            teacher:profiles!courses_teacher_id_fkey(
              id,
              first_name,
              last_name,
              email
            ),
            classroom:virtual_classrooms!courses_classroom_id_fkey(
              name,
              grade,
              education_level
            )
          `)
          .eq('id', courseId)
          .single(),
        
        supabase
          .from('course_enrollments')
          .select(`
            enrolled_at,
            student:profiles!course_enrollments_student_id_fkey(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('course_id', courseId),
        
        supabase
          .from('course_teachers')
          .select(`
            teacher:profiles!course_teachers_teacher_id_fkey(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('course_id', courseId),
      ]);

      if (courseResult.error) throw courseResult.error;

      const students = studentsResult.data
        ?.map(enrollment => {
          if (!enrollment.student) return null;
          return {
            ...enrollment.student,
            enrolled_at: enrollment.enrolled_at
          };
        })
        .filter((student): student is NonNullable<typeof student> => student !== null) || [];

      const additionalTeachers = teachersResult.data?.map(item => item.teacher).filter(Boolean) || [];

      return {
        ...courseResult.data,
        students,
        additionalTeachers,
      };
    },
    enabled: !!courseId,
  });
}
