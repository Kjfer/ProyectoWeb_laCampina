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

  // Accept both GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método no permitido. Use GET o POST.' }),
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

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, id')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      throw new Error('Error al obtener el perfil del usuario')
    }

    // Build the query based on user role (sin JOIN problemático)
    let query = supabaseClient
      .from('virtual_classrooms')
      .select(`
        id,
        name,
        grade,
        education_level,
        academic_year,
        teacher_id,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false })

    // If user is a teacher, only show their classrooms
    if (profile.role === 'teacher') {
      query = query.eq('teacher_id', profile.id)
    }

    const { data: classrooms, error: classroomsError } = await query

    if (classroomsError) {
      throw classroomsError
    }

    // Get teacher info and counts for each classroom
    const classroomsWithCounts = await Promise.all(
      (classrooms || []).map(async (classroom) => {
        try {
          // Get teacher info separately
          let teacher = null
          if (classroom.teacher_id) {
            const { data: teacherData, error: teacherError } = await supabaseClient
              .from('profiles')
              .select('id, first_name, last_name, email')
              .eq('id', classroom.teacher_id)
              .single()

            if (!teacherError && teacherData) {
              teacher = teacherData
            }
          }

          // Get courses count
          const { count: coursesCount, error: coursesError } = await supabaseClient
            .from('courses')
            .select('id', { count: 'exact', head: true })
            .eq('classroom_id', classroom.id)

          if (coursesError) {
            console.error('Error getting courses count:', coursesError)
          }

          // Get courses for enrollment count
          const { data: courses, error: coursesDataError } = await supabaseClient
            .from('courses')
            .select('id')
            .eq('classroom_id', classroom.id)

          if (coursesDataError) {
            console.error('Error getting courses:', coursesDataError)
          }

          let studentsCount = 0
          if (courses && courses.length > 0) {
            const courseIds = courses.map(c => c.id)
            const { count, error: enrollmentsError } = await supabaseClient
              .from('course_enrollments')
              .select('student_id', { count: 'exact', head: true })
              .in('course_id', courseIds)

            if (enrollmentsError) {
              console.error('Error getting enrollments count:', enrollmentsError)
            } else {
              studentsCount = count || 0
            }
          }

          return {
            ...classroom,
            teacher,
            courses_count: coursesCount || 0,
            students_count: studentsCount
          }
        } catch (error) {
          console.error('Error processing classroom:', classroom.id, error)
          return {
            ...classroom,
            teacher: null,
            courses_count: 0,
            students_count: 0
          }
        }
      })
    )

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: classroomsWithCounts,
        user_role: profile.role 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in get-virtual-classrooms function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})