import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método no permitido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('No autorizado')
    }

    // Get user profile to check permissions
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, id')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error obteniendo perfil:', profileError)
      throw new Error('Error al obtener el perfil del usuario')
    }

    // Check if user has permission to create classrooms
    if (profile.role !== 'admin' && profile.role !== 'teacher') {
      throw new Error('No tienes permisos para crear aulas virtuales')
    }

    // Get request body
    const body = await req.json()
    console.log('📥 Request body:', body)
    const { name, grade, education_level, academic_year, teacher_id, section } = body

    // Validate required fields
    if (!name || !grade || !education_level || !academic_year || !section) {
      throw new Error('Todos los campos son requeridos')
    }

    // Validate education_level
    if (!['primaria', 'secundaria'].includes(education_level)) {
      throw new Error('Nivel educativo no válido')
    }

    // Validate section (single uppercase letter A-Z)
    if (!/^[A-Z]$/.test(section)) {
      throw new Error('La sección debe ser una sola letra mayúscula (A-Z)')
    }

    // Insert new virtual classroom - use teacher_id from request if admin, otherwise use current user's profile
    const finalTeacherId = teacher_id || profile.id;
    
    const { data: newClassroom, error: insertError } = await supabaseClient
      .from('virtual_classrooms')
      .insert({
        name,
        grade,
        education_level,
        academic_year,
        section,
        teacher_id: finalTeacherId,
        is_active: true
      })
      .select(`
        id,
        name,
        grade,
        education_level,
        academic_year,
        teacher_id,
        is_active,
        created_at,
        teacher:profiles!teacher_id(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single()

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          ...newClassroom,
          courses_count: 0,
          students_count: 0
        },
        message: 'Aula virtual creada exitosamente'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      },
    )

  } catch (error) {
    console.error('Error in create-virtual-classroom function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Error interno del servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})