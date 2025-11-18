import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
      throw new Error('No tiene permisos para registrar asistencia');
    }

    const { course_id, date, attendance_records } = await req.json();

    console.log('📝 Registrando asistencia para curso:', course_id, 'fecha:', date);

    // Verificar que el profesor es dueño del curso o es admin
    if (profile.role === 'teacher') {
      const { data: course } = await supabaseClient
        .from('courses')
        .select('teacher_id')
        .eq('id', course_id)
        .single();

      if (!course || course.teacher_id !== profile.id) {
        throw new Error('No tiene permisos para gestionar este curso');
      }
    }

    // Delete existing records for this date and course
    await supabaseClient
      .from('attendance')
      .delete()
      .eq('course_id', course_id)
      .eq('date', date);

    // Insert new records
    const recordsToInsert = attendance_records.map((record: any) => ({
      course_id,
      student_id: record.student_id,
      date,
      status: record.status,
      notes: record.notes || null,
      recorded_by: profile.id,
    }));

    const { data, error } = await supabaseClient
      .from('attendance')
      .insert(recordsToInsert)
      .select();

    if (error) throw error;

    console.log('✅ Asistencia registrada:', data.length, 'registros');

    return new Response(
      JSON.stringify({ success: true, count: data.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});