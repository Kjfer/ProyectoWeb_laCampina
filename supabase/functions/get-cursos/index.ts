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

    // Only allow GET and POST requests
    if (!['GET', 'POST'].includes(req.method)) {
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: 'Método no permitido. Solo se permite GET y POST.' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
        )
    }
   
    try {
        // Get the Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? '',
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
        )

        // Handle GET requests - Obtener todos los cursos
        if (req.method === 'GET') {
            console.log('🔍 Obteniendo cursos...')
            
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('❌ Error al obtener cursos:', error)
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        error: 'Error al obtener cursos',
                        details: error.message 
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
                )
            }
            
            console.log(`✅ Cursos obtenidos: ${data?.length || 0}`)
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    data: data || [],
                    count: data?.length || 0
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // Handle POST requests - Crear nuevo curso
        if (req.method === 'POST') {
            console.log('➕ Creando nuevo curso...')
            
            // Validar que hay body
            let body;
            try {
                body = await req.json();
            } catch (parseError) {
                console.error('❌ Error parseando JSON:', parseError)
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        error: 'JSON inválido en el body de la petición',
                        details: 'El body debe ser un JSON válido'
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // Validar campos requeridos
            const requiredFields = ['name', 'description', 'code', 'teacher_id', 'academic_year', 'semester']
            const missingFields = requiredFields.filter(field => !body[field])
            
            if (missingFields.length > 0) {
                console.error('❌ Campos faltantes:', missingFields)
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        error: 'Campos requeridos faltantes',
                        details: `Los siguientes campos son requeridos: ${missingFields.join(', ')}`,
                        missingFields
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // Preparar datos del curso
            const courseData = {
                name: body.name?.trim(),
                description: body.description?.trim(),
                code: body.code?.trim().toUpperCase(),
                teacher_id: body.teacher_id,
                academic_year: body.academic_year,
                semester: body.semester,
                classroom_id: body.classroom_id || null,
                is_active: body.is_active !== undefined ? body.is_active : true
            }

            console.log('📝 Datos del curso a crear:', courseData)

            const { data, error } = await supabase
                .from('courses')
                .insert([courseData])
                .select()
                .single()

            if (error) {
                console.error('❌ Error al crear curso:', error)
                
                // Manejar errores específicos
                if (error.code === '23505') { // Unique constraint violation
                    return new Response(
                        JSON.stringify({ 
                            success: false, 
                            error: 'Ya existe un curso con ese código',
                            details: 'El código del curso debe ser único'
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
                    )
                }

                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        error: 'Error al crear curso',
                        details: error.message 
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
                )
            }

            console.log('✅ Curso creado exitosamente:', data.id)
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    data: data,
                    message: 'Curso creado exitosamente'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
            )
        }

        // Esta línea nunca debería ejecutarse debido a la validación al inicio
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: 'Método no manejado' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )

    } catch (error) {
        console.error('💥 Error general en get-cursos:', error)
        
        // Diferentes tipos de errores
        if (error instanceof SyntaxError) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    error: 'Error de sintaxis en la petición',
                    details: error.message
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (error instanceof TypeError) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    error: 'Error de tipo de datos',
                    details: error.message
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Error genérico
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