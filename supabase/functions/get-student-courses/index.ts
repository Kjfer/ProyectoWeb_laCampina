import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Método no permitido. Solo se permite GET.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    // Get the Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
    )

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autorización requerido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Verify the JWT token and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'Perfil no encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log(`🔍 Obteniendo cursos para ${profile.role}: ${profile.id}`)

    let coursesData = []

    if (profile.role === 'student') {
      // For students: get modules they are enrolled in via matriculas
      const { data, error } = await supabaseClient
        .from('matriculas')
        .select(`
          fecha_matricula,
          modulo:modulos (
            id,
            nombre,
            codigo,
            start_date,
            end_date,
            teacher_principal_id,
            course:courses (
              id,
              name,
              code,
              academic_year,
              semester,
              program:programas (
                id,
                nombre
              )
            ),
            teacher:profiles!modulos_teacher_principal_id_fkey (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('student_code', profile.student_code)
        .order('fecha_matricula', { ascending: false })

      if (error) {
        console.error('❌ Error obteniendo cursos del estudiante:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error al obtener cursos del estudiante',
            details: error.message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // Transform the data to include enrollment info from modulos
      coursesData = data?.map(matricula => {
        const modulo = matricula.modulo
        return {
          id: modulo.id,
          name: modulo.nombre,
          description: `${modulo.course?.program?.nombre || ''} - ${modulo.course?.name || ''}`,
          code: modulo.codigo,
          academic_year: modulo.course?.academic_year,
          semester: modulo.course?.semester,
          is_active: true,
          created_at: modulo.start_date,
          teacher: modulo.teacher,
          enrolled_at: matricula.fecha_matricula,
          enrollment_status: 'enrolled'
        }
      }).filter(item => item.id) || []

    } else if (profile.role === 'teacher') {
      // For teachers: get modules they teach (primary or additional)
      
      // Get modules where they are the primary teacher
      const { data: primaryModulos, error: primaryError } = await supabaseClient
        .from('modulos')
        .select(`
          id,
          nombre,
          codigo,
          start_date,
          end_date,
          teacher_principal_id,
          course:courses (
            id,
            name,
            code,
            academic_year,
            semester,
            program:programas (
              id,
              nombre
            )
          ),
          teacher:profiles!modulos_teacher_principal_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          enrollments:matriculas (count)
        `)
        .eq('teacher_principal_id', profile.id)

      if (primaryError) {
        console.error('❌ Error obteniendo módulos principales del profesor:', primaryError)
      }

      // Get modules where they are an additional teacher
      const { data: additionalModulos, error: additionalError } = await supabaseClient
        .from('modulo_teachers')
        .select(`
          modulo:modulos (
            id,
            nombre,
            codigo,
            start_date,
            end_date,
            teacher_principal_id,
            course:courses (
              id,
              name,
              code,
              academic_year,
              semester,
              program:programas (
                id,
                nombre
              )
            ),
            teacher:profiles!modulos_teacher_principal_id_fkey (
              id,
              first_name,
              last_name,
              email
            ),
            enrollments:matriculas (count)
          )
        `)
        .eq('teacher_id', profile.id)

      if (additionalError) {
        console.error('❌ Error obteniendo módulos adicionales del profesor:', additionalError)
      }

      // Combine both arrays and remove duplicates
      const allModulos = [
        ...(primaryModulos || []),
        ...(additionalModulos?.map(mt => mt.modulo).filter(Boolean) || [])
      ]

      // Remove duplicates based on module id
      const uniqueModulos = allModulos.reduce((acc, modulo) => {
        if (!acc.find(m => m.id === modulo.id)) {
          acc.push(modulo)
        }
        return acc
      }, [] as any[])

      // Transform to match course structure and sort by start_date
      coursesData = uniqueModulos.map(modulo => ({
        id: modulo.id,
        name: modulo.nombre,
        description: `${modulo.course?.program?.nombre || ''} - ${modulo.course?.name || ''}`,
        code: modulo.codigo,
        academic_year: modulo.course?.academic_year,
        semester: modulo.course?.semester,
        is_active: true,
        created_at: modulo.start_date,
        teacher: modulo.teacher,
        enrollments: modulo.enrollments
      })).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

    } else if (profile.role === 'admin') {
      // For admins: get all modules
      const { data, error } = await supabaseClient
        .from('modulos')
        .select(`
          id,
          nombre,
          codigo,
          start_date,
          end_date,
          teacher_principal_id,
          course:courses (
            id,
            name,
            code,
            academic_year,
            semester,
            program:programas (
              id,
              nombre
            )
          ),
          teacher:profiles!modulos_teacher_principal_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          enrollments:matriculas (count)
        `)
        .order('start_date', { ascending: false })

      if (error) {
        console.error('❌ Error obteniendo todos los módulos:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error al obtener módulos',
            details: error.message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // Transform modules to match course structure
      coursesData = data?.map(modulo => ({
        id: modulo.id,
        name: modulo.nombre,
        description: `${modulo.course?.program?.nombre || ''} - ${modulo.course?.name || ''}`,
        code: modulo.codigo,
        academic_year: modulo.course?.academic_year,
        semester: modulo.course?.semester,
        is_active: true,
        created_at: modulo.start_date,
        teacher: modulo.teacher,
        enrollments: modulo.enrollments
      })) || []
    } else if (profile.role === 'tutor') {
      // For tutors: return empty array since virtual classrooms were removed
      coursesData = []
      
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rol de usuario no válido' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    console.log(`✅ Cursos obtenidos para ${profile.role}: ${coursesData.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        data: coursesData,
        count: coursesData.length,
        user_role: profile.role,
        message: `Cursos obtenidos exitosamente para ${profile.role}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('💥 Error general en get-student-courses:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})