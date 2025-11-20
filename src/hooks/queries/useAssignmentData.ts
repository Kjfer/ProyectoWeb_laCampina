import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  course_id: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  teacher_files?: Array<{
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
  }>;
}

interface Submission {
  id: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_path: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  student_files?: Array<{
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    file_url: string;
  }>;
}

interface AssignmentWithSubmission {
  assignment: Assignment;
  submission: Submission | null;
}

// Optimized assignment detail query - parallel fetching
export function useAssignmentDetail(assignmentId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: ['assignment-detail', assignmentId, studentId],
    queryFn: async (): Promise<AssignmentWithSubmission | null> => {
      if (!assignmentId || !studentId) throw new Error('Assignment ID and Student ID required');

      // Parallel queries for assignment, resource files, and submission
      const [assignmentResult, resourceResult, submissionResult] = await Promise.all([
        supabase
          .from('assignments')
          .select(`
            *,
            course:courses (
              id,
              name,
              code
            )
          `)
          .eq('id', assignmentId)
          .single(),
        
        supabase
          .from('course_weekly_resources')
          .select('teacher_files')
          .eq('assignment_id', assignmentId)
          .maybeSingle(),
        
        supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentId)
          .maybeSingle(),
      ]);

      if (assignmentResult.error) throw assignmentResult.error;

      const assignment: Assignment = {
        ...assignmentResult.data,
        teacher_files: Array.isArray(resourceResult.data?.teacher_files) 
          ? resourceResult.data.teacher_files as any 
          : []
      };

      const submission: Submission | null = submissionResult.data ? {
        ...submissionResult.data,
        student_files: Array.isArray(submissionResult.data.student_files) 
          ? submissionResult.data.student_files as any 
          : []
      } : null;

      return { assignment, submission };
    },
    enabled: !!assignmentId && !!studentId,
  });
}
