import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { getUploadedFilesByUser } from '@/lib/database-server'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { dbUser } = authResult

  try {
    const files = await getUploadedFilesByUser(dbUser.id)

    return NextResponse.json({ 
      files: files.map(file => ({
        id: file.id,
        filename: file.original_filename,
        fileType: file.file_type,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        status: file.status,
        uploadedAt: file.uploaded_at
      }))
    })
  } catch (error) {
    console.error('Error fetching user files:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch files' 
    }, { status: 500 })
  }
}