import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VirtualClassroom {
  id: string;
  name: string;
  grade: string;
  section: string;
  education_level: string;
  academic_year: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  paternal_surname: string;
  maternal_surname: string;
  student_code: string;
  email: string;
  phone?: string;
  document_number?: string;
  birth_date?: string;
}

interface CourseData {
  id: string;
  name: string;
  code: string;
}

interface AttendanceRecord {
  student_id: string;
  present: number;
  absent: number;
  late: number;
  justified: number;
  total: number;
  attendance_rate: number;
}

interface GradeRecord {
  student_id: string;
  ad_count: number;
  a_count: number;
  b_count: number;
  c_count: number;
  total_graded: number;
  average_score: number;
}

interface TutorDashboardData {
  classroom: VirtualClassroom;
  students: Student[];
  courses: CourseData[];
  attendanceData: AttendanceRecord[];
  gradeData: GradeRecord[];
}

// Optimized tutor dashboard query - parallel fetching with aggregation
export function useTutorDashboard(tutorId: string | undefined) {
  return useQuery({
    queryKey: ['tutor-dashboard', tutorId],
    queryFn: async (): Promise<TutorDashboardData> => {
      if (!tutorId) throw new Error('Tutor ID required');

      // Step 1: Get assigned classroom
      const { data: classroomData, error: classroomError } = await supabase
        .from('virtual_classrooms')
        .select('*')
        .eq('tutor_id', tutorId)
        .single();

      if (classroomError) {
        if (classroomError.code === 'PGRST116') {
          throw new Error('No classroom assigned');
        }
        throw classroomError;
      }

      // Step 2: Get courses in parallel with student enrollments
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('classroom_id', classroomData.id);

      if (coursesError) throw coursesError;

      const courseIds = coursesData.map(c => c.id);

      if (courseIds.length === 0) {
        return {
          classroom: classroomData,
          students: [],
          courses: [],
          attendanceData: [],
          gradeData: [],
        };
      }

      // Step 3: Parallel queries for students, attendance, and grades
      const [studentsResult, attendanceResult, gradesResult] = await Promise.all([
        // Get unique students from enrollments
        supabase
          .from('course_enrollments')
          .select('student_id, profiles!inner(*)')
          .in('course_id', courseIds),
        
        // Get all attendance records
        supabase
          .from('attendance')
          .select('student_id, status')
          .in('course_id', courseIds),
        
        // Get all graded submissions
        supabase
          .from('assignment_submissions')
          .select('student_id, score, assignment_id, assignments!inner(course_id)')
          .not('score', 'is', null),
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      if (gradesResult.error) throw gradesResult.error;

      // Remove duplicate students
      const uniqueStudents = Array.from(
        new Map(studentsResult.data.map(item => [item.student_id, item.profiles])).values()
      ) as Student[];

      // Filter grades by course IDs
      const filteredGrades = gradesResult.data.filter(sub => 
        courseIds.includes((sub.assignments as any).course_id)
      );

      // Process attendance data
      const studentIds = uniqueStudents.map(s => s.id);
      const attendanceMap = new Map<string, AttendanceRecord>();
      
      studentIds.forEach(studentId => {
        attendanceMap.set(studentId, {
          student_id: studentId,
          present: 0,
          absent: 0,
          late: 0,
          justified: 0,
          total: 0,
          attendance_rate: 0
        });
      });

      attendanceResult.data.forEach(record => {
        const current = attendanceMap.get(record.student_id);
        if (current) {
          current.total++;
          if (record.status === 'present') current.present++;
          else if (record.status === 'absent') current.absent++;
          else if (record.status === 'late') current.late++;
          else if (record.status === 'justified') current.justified++;
        }
      });

      attendanceMap.forEach((record) => {
        if (record.total > 0) {
          record.attendance_rate = (record.present / record.total) * 100;
        }
      });

      // Process grades data
      const gradeMap = new Map<string, GradeRecord>();
      
      studentIds.forEach(studentId => {
        gradeMap.set(studentId, {
          student_id: studentId,
          ad_count: 0,
          a_count: 0,
          b_count: 0,
          c_count: 0,
          total_graded: 0,
          average_score: 0
        });
      });

      filteredGrades.forEach(sub => {
        const current = gradeMap.get(sub.student_id);
        if (current) {
          current.total_graded++;
          const score = Number(sub.score);

          if (score >= 18) current.ad_count++;
          else if (score >= 14) current.a_count++;
          else if (score >= 11) current.b_count++;
          else current.c_count++;
        }
      });

      gradeMap.forEach((record) => {
        if (record.total_graded > 0) {
          const studentSubmissions = filteredGrades.filter(s => s.student_id === record.student_id);
          const sum = studentSubmissions.reduce((acc, s) => acc + Number(s.score), 0);
          record.average_score = sum / record.total_graded;
        }
      });

      return {
        classroom: classroomData,
        students: uniqueStudents,
        courses: coursesData,
        attendanceData: Array.from(attendanceMap.values()),
        gradeData: Array.from(gradeMap.values()),
      };
    },
    enabled: !!tutorId,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}
