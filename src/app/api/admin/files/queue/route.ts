import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    // Get analysis queue status
    const { data: queueItems, error: queueError } = await supabase
      .from('file_analysis_queue')
      .select(`
        *,
        uploaded_files (
          original_filename,
          file_type,
          user_id,
          users (email)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (queueError) {
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    // Get queue statistics
    const { data: stats, error: statsError } = await supabase
      .from('file_analysis_queue')
      .select('status')

    if (statsError) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const queueStats = {
      total: stats?.length || 0,
      queued: stats?.filter(item => item.status === 'queued').length || 0,
      processing: stats?.filter(item => item.status === 'processing').length || 0,
      completed: stats?.filter(item => item.status === 'completed').length || 0,
      failed: stats?.filter(item => item.status === 'failed').length || 0
    }

    return NextResponse.json({ 
      queue: queueItems || [],
      stats: queueStats
    })
  } catch (error) {
    console.error('Error fetching file processing queue:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch processing queue' 
    }, { status: 500 })
  }
}