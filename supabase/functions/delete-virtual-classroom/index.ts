import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método no permitido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
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

    // Get classroom ID from URL or body
    const url = new URL(req.url)
    const id = url.searchParams.get('id') || (await req.json()).id

    if (!id) {
      throw new Error('El ID del aula virtual es requerido')
    }

    console.log('📥 Deleting classroom with ID:', id)

    // Get existing classroom to check permissions
    const { data: existingClassroom, error: fetchError } = await supabaseClient
      .from('virtual_classrooms')
      .select('teacher_id, name')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error obteniendo aula:', fetchError)
      throw new Error('Aula virtual no encontrada')
    }

    // Check permissions: only admin or the classroom teacher
    if (profile.role !== 'admin' && existingClassroom.teacher_id !== profile.id) {
      throw new Error('No tienes permisos para eliminar esta aula virtual')
    }

    // Check if there are enrolled students
    const { data: courses, error: coursesError } = await supabaseClient
      .from('courses')
      .select('id')
      .eq('classroom_id', id)

    if (coursesError) {
      console.error('Error verificando cursos:', coursesError)
    }

    let enrollmentCount = 0
    if (courses && courses.length > 0) {
      const courseIds = courses.map(c => c.id)
      const { count, error: enrollmentError } = await supabaseClient
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .in('course_id', courseIds)

      if (!enrollmentError && count) {
        enrollmentCount = count
      }
    }

    // If there are enrolled students, only deactivate instead of delete
    if (enrollmentCount > 0) {
      const { data: deactivated, error: deactivateError } = await supabaseClient
        .from('virtual_classrooms')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (deactivateError) {
        console.error('Error desactivando aula:', deactivateError)
        throw deactivateError
      }

      console.log(`⚠️ Aula desactivada (tiene ${enrollmentCount} estudiantes inscritos):`, existingClassroom.name)

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: deactivated,
          message: `Aula virtual desactivada (tiene ${enrollmentCount} estudiantes inscritos). No se eliminó para preservar el historial.`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // No students enrolled, safe to delete
    // First, delete associated courses
    if (courses && courses.length > 0) {
      const { error: deleteCoursesError } = await supabaseClient
        .from('courses')
        .delete()
        .eq('classroom_id', id)

      if (deleteCoursesError) {
        console.error('Error eliminando cursos:', deleteCoursesError)
        throw new Error('Error al eliminar los cursos asociados')
      }

      console.log(`🗑️ Eliminados ${courses.length} cursos asociados`)
    }

    // Delete the classroom
    const { error: deleteError } = await supabaseClient
      .from('virtual_classrooms')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error eliminando aula:', deleteError)
      throw deleteError
    }

    console.log('✅ Aula virtual eliminada exitosamente:', existingClassroom.name)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Aula virtual eliminada exitosamente'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in delete-virtual-classroom function:', error)
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
