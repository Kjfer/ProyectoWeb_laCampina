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

    // Optimized: Get all data with fewer queries
    console.log('📊 Optimizando consultas para mejor rendimiento...')
    
    // Get all unique teacher IDs
    const teacherIds = [...new Set(classrooms.map(c => c.teacher_id).filter(Boolean))]
    
    // Get all teachers in one query
    let teachersMap = new Map()
    if (teacherIds.length > 0) {
      const { data: teachers, error: teachersError } = await supabaseClient
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', teacherIds)
      
      if (!teachersError && teachers) {
        teachers.forEach(teacher => {
          teachersMap.set(teacher.id, teacher)
        })
      }
    }

    // Get all classroom IDs
    const classroomIds = classrooms.map(c => c.id)
    
    // Get all courses for all classrooms in one query
    let coursesMap = new Map()
    let courseIds: string[] = []
    if (classroomIds.length > 0) {
      const { data: courses, error: coursesError } = await supabaseClient
        .from('courses')
        .select('id, classroom_id')
        .in('classroom_id', classroomIds)
      
      if (!coursesError && courses) {
        courses.forEach(course => {
          courseIds.push(course.id)
          const classroomCourses = coursesMap.get(course.classroom_id) || []
          classroomCourses.push(course)
          coursesMap.set(course.classroom_id, classroomCourses)
        })
      }
    }

    // Get all enrollments for all courses in one query
    let enrollmentsMap = new Map()
    if (courseIds.length > 0) {
      const { data: enrollments, error: enrollmentsError } = await supabaseClient
        .from('course_enrollments')
        .select('course_id, student_id')
        .in('course_id', courseIds)
      
      if (!enrollmentsError && enrollments) {
        enrollments.forEach(enrollment => {
          const courseEnrollments = enrollmentsMap.get(enrollment.course_id) || []
          courseEnrollments.push(enrollment)
          enrollmentsMap.set(enrollment.course_id, courseEnrollments)
        })
      }
    }

    // Build final data structure
    const classroomsWithCounts = classrooms.map(classroom => {
      const teacher = teachersMap.get(classroom.teacher_id) || null
      const classroomCourses = coursesMap.get(classroom.id) || []
      const coursesCount = classroomCourses.length
      
      // Count unique students across all courses in this classroom
      const uniqueStudents = new Set()
      classroomCourses.forEach((course: any) => {
        const courseEnrollments = enrollmentsMap.get(course.id) || []
        courseEnrollments.forEach((enrollment: any) => {
          uniqueStudents.add(enrollment.student_id)
        })
      })

      return {
        ...classroom,
        teacher,
        courses_count: coursesCount,
        students_count: uniqueStudents.size
      }
    })

    console.log(`⚡ Consultas optimizadas completadas en mucho menos tiempo`)
    console.log(`📈 Resumen: ${classrooms.length} aulas, ${teacherIds.length} profesores únicos, ${courseIds.length} cursos total`)

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