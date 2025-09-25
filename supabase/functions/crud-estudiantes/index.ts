import {serve} from 'https://deno.land/std@0.177.0/http/server.ts'
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2' 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders})
  }
  if (!['GET', 'POST', 'DELETE','PUT'].includes(req.method)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Método no permitido. Solo se permite GET, POST, DELETE y PUT.',
      }),
      {headers: {...corsHeaders, 'Content-Type': 'application/json'}, status: 405}
    )
  }

  try {
    // Get the Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
    )

    // Handle GET requests - Obtener estudiantes
    if (req.method === 'GET') {
      console.log('🔍 Obteniendo estudiantes...')
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error al obtener estudiantes:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error al obtener estudiantes',
            details: error.message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      console.log(`✅ Estudiantes obtenidos: ${data?.length || 0}`)
      return new Response(
        JSON.stringify({
          success: true,
          data: data || [],
          count: data?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Handle POST requests - Crear estudiante
    if (req.method === 'POST') {
      console.log('➕ Creando estudiante...')
      
      let body;
      try {
        body = await req.json()
      } catch (parseError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'JSON inválido en el body de la petición'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { first_name, last_name, email, role, user_id } = body

      // Validar campos requeridos
      if (!first_name || !last_name || !email || !role) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Campos requeridos: first_name, last_name, email, role'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const profileData = {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim(),
        user_id: user_id || null,
        is_active: true
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error al crear estudiante:', error)
        
        if (error.code === '23505') { // Unique constraint violation
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Ya existe un perfil con ese email',
              details: 'El email debe ser único'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error al crear estudiante',
            details: error.message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      console.log(`✅ Estudiante creado: ${data?.id}`)
      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          message: 'Estudiante creado exitosamente'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
      )
    }

    // Handle PUT requests - Actualizar estudiante
    if (req.method === 'PUT') {
      console.log('✏️ Actualizando estudiante...')
      
      const url = new URL(req.url)
      const id = url.searchParams.get('id')
      
      if (!id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'ID del estudiante es requerido en los parámetros de la URL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      let body;
      try {
        body = await req.json()
      } catch (parseError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'JSON inválido en el body de la petición'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const updateData = {}
      if (body.first_name) updateData.first_name = body.first_name.trim()
      if (body.last_name) updateData.last_name = body.last_name.trim()
      if (body.email) updateData.email = body.email.trim().toLowerCase()
      if (body.role) updateData.role = body.role.trim()
      if (body.is_active !== undefined) updateData.is_active = body.is_active

      if (Object.keys(updateData).length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No hay datos para actualizar'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error al actualizar estudiante:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error al actualizar estudiante',
            details: error.message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (!data) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Estudiante no encontrado'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      console.log(`✅ Estudiante actualizado: ${data.id}`)
      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          message: 'Estudiante actualizado exitosamente'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Handle DELETE requests - Eliminar estudiante
    if (req.method === 'DELETE') {
      console.log('🗑️ Eliminando estudiante...')
      
      const url = new URL(req.url)
      const id = url.searchParams.get('id')
      
      if (!id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'ID del estudiante es requerido en los parámetros de la URL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error al eliminar estudiante:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error al eliminar estudiante',
            details: error.message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (!data) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Estudiante no encontrado'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      console.log(`✅ Estudiante eliminado: ${data.id}`)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Estudiante eliminado exitosamente',
          data: data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Fallback - método no implementado
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método no implementado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 501 }
    )

  } catch (error) {
    console.error('💥 Error general en crud-estudiantes:', error)
    
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
