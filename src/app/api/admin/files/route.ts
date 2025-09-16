import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    // Get all uploaded files with processing results
    const { data: files, error: filesError } = await supabase
      .from('uploaded_files')
      .select(`
        *,
        users (email),
        file_processing_results (
          extracted_text,
          word_count,
          character_count,
          colors,
          confidence_score,
          processed_at
        )
      `)
      .order('uploaded_at', { ascending: false })
      .limit(100)

    if (filesError) {
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    // Get file statistics
    const { data: allFiles, error: statsError } = await supabase
      .from('uploaded_files')
      .select('status, file_type, file_size')

    if (statsError) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const fileStats = {
      total: allFiles?.length || 0,
      pending: allFiles?.filter(f => f.status === 'pending').length || 0,
      processing: allFiles?.filter(f => f.status === 'processing').length || 0,
      completed: allFiles?.filter(f => f.status === 'completed').length || 0,
      failed: allFiles?.filter(f => f.status === 'failed').length || 0,
      totalSize: allFiles?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0,
      types: {
        images: allFiles?.filter(f => f.file_type === 'jpg' || f.file_type === 'png' || f.file_type === 'jpeg').length || 0,
        pdfs: allFiles?.filter(f => f.file_type === 'pdf').length || 0,
        documents: allFiles?.filter(f => f.file_type === 'docx' || f.file_type === 'doc').length || 0,
        other: allFiles?.filter(f => !['jpg', 'png', 'jpeg', 'pdf', 'docx', 'doc'].includes(f.file_type)).length || 0
      }
    }

    return NextResponse.json({ 
      files: files || [],
      stats: fileStats
    })
  } catch (error) {
    console.error('Error fetching admin files:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch files' 
    }, { status: 500 })
  }
}