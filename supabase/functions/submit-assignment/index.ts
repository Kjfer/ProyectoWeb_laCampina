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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('No autorizado');
    }

    const { 
      resourceId, 
      assignmentTitle, 
      deadline, 
      maxScore, 
      content, 
      filePath, 
      fileName, 
      fileSize, 
      mimeType,
      courseId 
    } = await req.json();

    console.log('Submitting assignment for user:', user.id);

    // Get student profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Perfil no encontrado');
    }

    // Check if assignment already exists
    let assignmentId;
    const { data: existingAssignment } = await supabaseClient
      .from('assignments')
      .select('id')
      .eq('title', assignmentTitle)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingAssignment) {
      assignmentId = existingAssignment.id;
    } else {
      // Create assignment using service role (bypasses RLS)
      const { data: newAssignment, error: assignmentError } = await supabaseClient
        .from('assignments')
        .insert({
          title: assignmentTitle,
          description: `Tarea: ${assignmentTitle}`,
          due_date: deadline,
          max_score: maxScore || 100,
          course_id: courseId,
          is_published: true
        })
        .select()
        .single();

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        throw new Error('Error al crear la tarea');
      }
      assignmentId = newAssignment.id;
    }

    // Create submission with user's auth (RLS allows students to create their own submissions)
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { error: submissionError } = await userSupabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: profile.id,
        content: content || null,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType
      });

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      throw new Error('Error al crear la entrega');
    }

    return new Response(
      JSON.stringify({ success: true, assignmentId }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
