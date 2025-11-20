import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Get the user from the token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get request body
    const { bucket, filePath, fileName } = await req.json()

    if (!bucket || !filePath) {
      return new Response(JSON.stringify({ error: 'Missing bucket or filePath' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      throw new Error('Profile not found')
    }

    // Check permissions based on bucket
    let hasPermission = false

    if (bucket === 'course-documents' || bucket === 'course-videos') {
      // Students and teachers can download course materials
      hasPermission = ['student', 'teacher', 'admin'].includes(profile.role)
    } else if (bucket === 'student-submissions') {
      // For student submissions, check if user owns the file or is a teacher/admin
      if (profile.role === 'admin') {
        hasPermission = true
      } else if (profile.role === 'teacher') {
        hasPermission = true // Teachers can view submissions in their courses
      } else if (profile.role === 'student') {
        // Students can only download their own submissions (files are stored with profile.id)
        hasPermission = filePath.startsWith(profile.id)
      }
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create signed URL for download
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .createSignedUrl(filePath, 300) // 5 minutes expiry

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ 
      signedUrl: data.signedUrl,
      fileName: fileName || filePath.split('/').pop()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Error in download-file function:', error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})