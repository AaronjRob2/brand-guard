import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    // Get user count
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (userError) {
      return NextResponse.json({ error: 'Failed to fetch user count' }, { status: 500 })
    }

    // TODO: Add file count and storage stats when file upload is implemented
    const stats = {
      totalUsers: userCount || 0,
      filesProcessed: 0, // Placeholder
      storageUsed: 0, // Placeholder
      recentActivity: [] // Placeholder
    }

    return NextResponse.json({ stats })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}