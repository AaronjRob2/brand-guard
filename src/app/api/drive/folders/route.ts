import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { createClient } from '@supabase/supabase-js'

// Service role client for bypassing RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }

    console.log('Fetching Drive folders for user:', authResult.dbUser.id)

    // Fetch user's drive folders using service role to bypass RLS
    const { data: folders, error } = await supabaseAdmin
      .from('drive_folders')
      .select('*')
      .eq('connected_by', authResult.dbUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching drive folders:', error)
      return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
    }

    console.log('Found folders:', folders?.length || 0)
    return NextResponse.json({ folders: folders || [] })
  } catch (error) {
    console.error('Error in drive folders endpoint:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}