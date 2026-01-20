import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateRequest {
  course_id: string;
  student_ids: string[];
  n8n_webhook_url: string;
}

serve(async (req) => {
  // Manejar preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
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

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }
    
    console.log('✓ Usuario autenticado:', user.id, user.email);

    // Verificar que sea admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error obteniendo perfil:', profileError?.message);
      return new Response(
        JSON.stringify({ error: 'Perfil no encontrado' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }
    
    console.log('✓ Perfil encontrado - ID:', profile.id, 'Role:', profile.role);

    if (profile.role !== 'admin') {
      console.error('❌ Usuario no es admin:', profile.role);
      return new Response(
        JSON.stringify({ error: 'Solo administradores pueden enviar certificados' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    const { course_id, student_ids, n8n_webhook_url } = await req.json() as CertificateRequest;

    if (!course_id || !student_ids || student_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'course_id y student_ids son requeridos' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!n8n_webhook_url) {
      return new Response(
        JSON.stringify({ error: 'n8n_webhook_url es requerido' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('📜 Enviando certificados - Curso:', course_id, 'Estudiantes:', student_ids.length);

    // Obtener datos del curso con programa
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select(`
        id,
        name,
        code,
        academic_year,
        semester,
        program:program_id (
          id,
          name,
          code
        )
      `)
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      console.error('❌ Error obteniendo curso:', courseError?.message);
      return new Response(
        JSON.stringify({ error: 'Curso no encontrado' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('✓ Curso encontrado:', course.name);

    // Obtener datos de los estudiantes
    const { data: students, error: studentsError } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        paternal_surname,
        maternal_surname
      `)
      .in('id', student_ids);

    if (studentsError || !students || students.length === 0) {
      console.error('❌ Error obteniendo estudiantes:', studentsError?.message);
      return new Response(
        JSON.stringify({ error: 'Estudiantes no encontrados' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('✓ Estudiantes encontrados:', students.length);

    // Preparar datos para n8n
    const certificateData = students.map(student => {
      const fullName = student.paternal_surname && student.maternal_surname
        ? `${student.first_name} ${student.paternal_surname} ${student.maternal_surname}`
        : `${student.first_name} ${student.last_name || ''}`;

      return {
        student_name: fullName.trim(),
        student_email: student.email,
        course_name: course.name,
        course_code: course.code,
        program_name: course.program?.name || 'Sin programa',
        program_code: course.program?.code || '',
        academic_year: course.academic_year,
        semester: course.semester,
      };
    });

    console.log('📤 Enviando datos a n8n webhook...');

    // Enviar a n8n webhook
    let n8nResult: any = null;
    let n8nError: string | null = null;
    
    try {
      const n8nResponse = await fetch(n8n_webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificates: certificateData,
          metadata: {
            sent_by: user.email,
            sent_at: new Date().toISOString(),
            total_certificates: certificateData.length,
          }
        }),
      });

      if (!n8nResponse.ok) {
        n8nError = await n8nResponse.text();
        console.error('❌ Error en n8n webhook:', n8nError);
      } else {
        n8nResult = await n8nResponse.json();
        console.log('✅ Certificados enviados a n8n correctamente');
      }
    } catch (error) {
      n8nError = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Error de conexión con n8n:', n8nError);
    }

    // Registrar cada envío en la base de datos
    console.log('📝 Registrando envíos en base de datos...');
    const logs = students.map((student, index) => ({
      course_id: course_id,
      student_id: student.id,
      sent_by: profile.id,
      sent_at: new Date().toISOString(),
      status: n8nError ? 'failed' : 'sent',
      error_message: n8nError,
      n8n_webhook_url: n8n_webhook_url,
      metadata: certificateData[index]
    }));

    const { error: logsError } = await supabaseClient
      .from('certificate_logs')
      .insert(logs);

    if (logsError) {
      console.error('⚠️ Error guardando logs:', logsError.message);
      // No fallar la petición por esto, solo log
    } else {
      console.log('✅ Logs guardados correctamente');
    }

    // Si hubo error en n8n, retornar error
    if (n8nError) {
      return new Response(
        JSON.stringify({ 
          error: 'Error enviando certificados al webhook',
          details: n8nError,
          logs_saved: !logsError
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${certificateData.length} certificado${certificateData.length !== 1 ? 's' : ''} enviado${certificateData.length !== 1 ? 's' : ''} correctamente`,
        certificates_sent: certificateData.length,
        logs_saved: !logsError,
        n8n_response: n8nResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error enviando certificados:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
