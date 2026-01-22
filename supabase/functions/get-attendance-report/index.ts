import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('No autorizado');
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('Perfil no encontrado');
    }

    // Solo administradores pueden generar reportes de asistencia
    if (profile.role !== 'admin') {
      throw new Error('No tiene permisos para generar reportes');
    }

    const url = new URL(req.url);
    const course_id = url.searchParams.get('course_id');
    const date = url.searchParams.get('date');

    if (!course_id) {
      throw new Error('course_id es requerido');
    }

    if (!date) {
      throw new Error('date es requerida');
    }

    console.log('📊 Generando reporte de asistencia - Curso:', course_id, 'Fecha:', date);

    // Obtener información del curso
    const { data: courseData, error: courseError } = await supabaseClient
      .from('courses')
      .select('id, name, code')
      .eq('id', course_id)
      .single();

    if (courseError) throw courseError;
    if (!courseData) throw new Error('Curso no encontrado');

    // Obtener todos los estudiantes matriculados en el curso
    const { data: enrolledStudents, error: enrollError } = await supabaseClient
      .from('enrollments')
      .select(`
        student_id,
        student:profiles!enrollments_student_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('course_id', course_id);

    if (enrollError) throw enrollError;

    // Obtener registros de asistencia para la fecha especificada
    const { data: attendanceData, error: attendanceError } = await supabaseClient
      .from('attendance')
      .select(`
        id,
        student_id,
        status,
        notes,
        created_at
      `)
      .eq('course_id', course_id)
      .eq('date', date);

    if (attendanceError) throw attendanceError;

    // Crear un mapa de asistencia por student_id
    const attendanceMap = new Map();
    if (attendanceData) {
      attendanceData.forEach(record => {
        attendanceMap.set(record.student_id, record);
      });
    }

    // Generar reporte completo
    const report = [];
    const absentStudents = [];

    if (enrolledStudents) {
      for (const enrollment of enrolledStudents) {
        const student = enrollment.student;
        const attendanceRecord = attendanceMap.get(enrollment.student_id);

        const studentReport = {
          student_id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          phone: student.phone || null,
          status: attendanceRecord?.status || 'not_recorded',
          notes: attendanceRecord?.notes || null,
          recorded_at: attendanceRecord?.created_at || null
        };

        report.push(studentReport);

        // Filtrar estudiantes inasistentes (absent)
        if (attendanceRecord?.status === 'absent' || !attendanceRecord) {
          absentStudents.push(studentReport);
        }
      }
    }

    // Calcular estadísticas
    const totalStudents = report.length;
    const presentCount = report.filter(r => r.status === 'present').length;
    const absentCount = report.filter(r => r.status === 'absent').length;
    const lateCount = report.filter(r => r.status === 'late').length;
    const excusedCount = report.filter(r => r.status === 'excused').length;
    const notRecordedCount = report.filter(r => r.status === 'not_recorded').length;

    const response = {
      course: courseData,
      date: date,
      statistics: {
        total_students: totalStudents,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        not_recorded: notRecordedCount
      },
      all_students: report,
      absent_students: absentStudents
    };

    console.log('✅ Reporte generado exitosamente');

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
