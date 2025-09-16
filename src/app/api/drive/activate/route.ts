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

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { folderId } = await request.json()
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    console.log('Activating folder for user:', authResult.dbUser.id, 'folder:', folderId)

    // First, deactivate all folders for this user
    await supabaseAdmin
      .from('drive_folders')
      .update({ is_active: false })
      .eq('connected_by', authResult.dbUser.id)

    // Then activate the selected folder
    const { data, error } = await supabaseAdmin
      .from('drive_folders')
      .update({ is_active: true })
      .eq('id', folderId)
      .eq('connected_by', authResult.dbUser.id)
      .select()
      .single()

    if (error) {
      console.error('Error activating folder:', error)
      return NextResponse.json({ error: 'Failed to activate folder' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Folder not found or not owned by user' }, { status: 404 })
    }

    console.log('Successfully activated folder:', data.name)
    return NextResponse.json({ success: true, folder: data })
  } catch (error) {
    console.error('Error in drive activate endpoint:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}