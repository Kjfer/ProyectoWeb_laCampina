import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting assignment status check...');

    const today = new Date();
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    // Obtener todas las tareas activas
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, title, course_id, due_date')
      .eq('is_published', true)
      .not('due_date', 'is', null);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      throw assignmentsError;
    }

    console.log(`Found ${assignments?.length || 0} assignments to check`);

    const notificationsToCreate = [];

    for (const assignment of assignments || []) {
      const dueDate = new Date(assignment.due_date);

      // Obtener estudiantes inscritos en el curso
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('course_id', assignment.course_id);

      if (enrollmentsError) {
        console.error(`Error fetching enrollments for course ${assignment.course_id}:`, enrollmentsError);
        continue;
      }

      for (const enrollment of enrollments || []) {
        // Verificar si ya existe una entrega
        const { data: submissions } = await supabase
          .from('assignment_submissions')
          .select('id')
          .eq('assignment_id', assignment.id)
          .eq('student_id', enrollment.student_id)
          .limit(1);

        const hasSubmission = submissions && submissions.length > 0;

        // Verificar si ya existe una notificación reciente (últimas 24 horas)
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const { data: existingNotifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', enrollment.student_id)
          .eq('assignment_id', assignment.id)
          .gte('created_at', yesterday.toISOString())
          .limit(1);

        if (existingNotifications && existingNotifications.length > 0) {
          console.log(`Notification already exists for student ${enrollment.student_id} and assignment ${assignment.id}`);
          continue;
        }

        // Tarea vencida sin entrega
        if (dueDate < today && !hasSubmission) {
          notificationsToCreate.push({
            user_id: enrollment.student_id,
            assignment_id: assignment.id,
            type: 'overdue',
            message: `La tarea "${assignment.title}" está vencida y no ha sido entregada.`,
            is_read: false,
          });
        }
        // Tarea próxima a vencer (2 días) sin entrega
        else if (dueDate <= twoDaysFromNow && dueDate >= today && !hasSubmission) {
          const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          notificationsToCreate.push({
            user_id: enrollment.student_id,
            assignment_id: assignment.id,
            type: 'pending',
            message: `La tarea "${assignment.title}" vence en ${daysLeft} día(s). No olvides entregarla.`,
            is_read: false,
          });
        }
      }
    }

    console.log(`Creating ${notificationsToCreate.length} notifications...`);

    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }
    }

    console.log('Assignment status check completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notificationsToCreate.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in check-assignments-status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
