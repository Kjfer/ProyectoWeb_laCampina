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

    // Solo administradores pueden acceder
    if (profile.role !== 'admin') {
      throw new Error('No tiene permisos');
    }

    const url = new URL(req.url);
    const course_id = url.searchParams.get('course_id');

    if (!course_id) {
      throw new Error('course_id es requerido');
    }

    console.log('📅 Obteniendo fechas de clases - Curso:', course_id);

    // Obtener todas las fechas únicas donde hay registros de asistencia
    // que ya pasaron (son del pasado)
    const { data: attendanceDates, error } = await supabaseClient
      .from('attendance')
      .select('date')
      .eq('course_id', course_id)
      .lte('date', new Date().toISOString().split('T')[0]) // Solo fechas pasadas o de hoy
      .order('date', { ascending: false });

    if (error) throw error;

    // Obtener fechas únicas
    const uniqueDates = [...new Set(attendanceDates?.map(a => a.date) || [])];

    console.log('✅ Fechas encontradas:', uniqueDates.length);

    return new Response(
      JSON.stringify({ dates: uniqueDates }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error obteniendo fechas:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
