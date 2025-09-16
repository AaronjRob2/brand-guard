import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { getFileWithResults } from '@/lib/database-server'

export async function GET(
  request: NextRequest, 
  { params }: { params: { fileId: string } }
) {
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { dbUser } = authResult
  const { fileId } = params

  try {
    const { file, results } = await getFileWithResults(fileId)

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check if user owns the file
    if (file.user_id !== dbUser.id && dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ 
      file: {
        id: file.id,
        filename: file.original_filename,
        fileType: file.file_type,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        status: file.status,
        uploadedAt: file.uploaded_at
      },
      results: results ? {
        extractedText: results.extracted_text,
        wordCount: results.word_count,
        characterCount: results.character_count,
        pageCount: results.page_count,
        language: results.language,
        colors: results.colors,
        fontFamilies: results.font_families,
        fontSizes: results.font_sizes,
        extractedImages: results.extracted_images,
        confidenceScore: results.confidence_score,
        processingTime: results.processing_time_ms,
        processedAt: results.processed_at
      } : null
    })
  } catch (error) {
    console.error('Error fetching file details:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch file details' 
    }, { status: 500 })
  }
}