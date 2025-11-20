import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

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
    const { name, grade, education_level, academic_year, teacher_id, tutor_id, section, start_date, end_date } = body

    // Validate required fields
    if (!name || !grade || !education_level || !academic_year || !section || !start_date || !end_date) {
      throw new Error('Todos los campos son requeridos, incluyendo fechas de inicio y fin')
    }

    // Validate dates
    if (new Date(end_date) <= new Date(start_date)) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
    }

    // Validate education_level
    if (!['primaria', 'secundaria'].includes(education_level)) {
      throw new Error('Nivel educativo no válido')
    }

    // Validate section (single uppercase letter A-Z)
    if (!/^[A-Z]$/.test(section)) {
      throw new Error('La sección debe ser una sola letra mayúscula (A-Z)')
    }

    // Check if classroom with same combination already exists
    const { data: existingClassroom, error: checkError } = await supabaseClient
      .from('virtual_classrooms')
      .select('id, name')
      .eq('education_level', education_level)
      .eq('grade', grade)
      .eq('section', section)
      .eq('academic_year', academic_year)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing classroom:', checkError)
      throw new Error('Error al verificar aulas existentes')
    }

    if (existingClassroom) {
      throw new Error(`Ya existe un aula virtual para ${education_level} ${grade}${section} del año ${academic_year}`)
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
        tutor_id: tutor_id || null,
        is_active: true
      })
      .select(`
        id,
        name,
        grade,
        education_level,
        academic_year,
        teacher_id,
        tutor_id,
        is_active,
        created_at,
        teacher:profiles!teacher_id(
          id,
          first_name,
          last_name,
          email
        ),
        tutor:profiles!tutor_id(
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

    // Define standard courses based on education level
    const standardCourses = education_level === 'primaria' 
      ? [
          'Matemática',
          'Ciencias',
          'Inglés',
          'Personal Social',
          'Arte',
          'Religión',
          'Computación',
          'Tutoría',
          'Comunicación',
          'Plan Lector'
        ]
      : [ // secundaria
          'Ciencias Sociales',
          'Desarrollo Personal Ciudadanía y Cívica',
          'Ciencia y Tecnología',
          'Arte y Cultura',
          'Educación para el Trabajo',
          'Matemática',
          'Comunicación',
          'Inglés',
          'Religión'
        ];

    // Create standard courses for the classroom
    const coursesToInsert = standardCourses.map((courseName, index) => {
      // Build a short, more unique prefix (initials of words, max 3 chars)
      const initials = courseName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 3)
        .toUpperCase();
      const idPart = String(newClassroom.id).replace(/-/g, '').slice(0, 8);
      // Append index to avoid collisions for subjects with same initials
      const code = `${initials}-${grade}-${section}-${academic_year}-${idPart}-${index + 1}`;
      return {
        name: courseName,
        code,
        classroom_id: newClassroom.id,
        teacher_id: finalTeacherId,
        academic_year: academic_year,
        start_date: start_date,
        end_date: end_date,
        schedule: null, // No default schedule - teachers will configure individually
        is_active: true
      };
    });

    const { data: createdCourses, error: coursesError } = await supabaseClient
      .from('courses')
      .insert(coursesToInsert)
      .select('id');

    if (coursesError) {
      console.error('Error creating courses:', coursesError);
      // Don't throw error, just log it - classroom was created successfully
    }

    console.log(`✅ Created ${createdCourses?.length || 0} standard courses for classroom ${newClassroom.id}`);

    // Generate weekly sections for each course automatically
    let successfulWeekGenerations = 0;
    if (createdCourses && createdCourses.length > 0) {
      console.log(`📅 Generating weekly sections for ${createdCourses.length} courses...`);
      
      for (const course of createdCourses) {
        try {
          const { data: weekData, error: weekError } = await supabaseClient.functions.invoke(
            'generate-course-weeks',
            {
              body: {
                courseId: course.id,
                startDate: start_date,
                endDate: end_date
              }
            }
          );

          if (weekError) {
            console.error(`❌ Error generating weeks for course ${course.id}:`, weekError);
          } else {
            successfulWeekGenerations++;
            console.log(`✅ Generated weeks for course ${course.id}:`, weekData);
          }
        } catch (weekGenError) {
          console.error(`❌ Exception generating weeks for course ${course.id}:`, weekGenError);
        }
      }
      
      console.log(`✅ Successfully generated weeks for ${successfulWeekGenerations}/${createdCourses.length} courses`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          ...newClassroom,
          courses_count: createdCourses?.length || 0,
          students_count: 0
        },
        message: `Aula virtual creada exitosamente con ${createdCourses?.length || 0} cursos y ${successfulWeekGenerations} cursos con semanas generadas automáticamente`
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