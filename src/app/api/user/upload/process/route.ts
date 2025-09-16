import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { fileParser } from '@/lib/fileParser'
import { saveUploadedFile, saveProcessingResult, updateFileStatus } from '@/lib/database-server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  console.log('🚀 Upload endpoint called')
  
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    console.log('❌ Auth failed')
    return authResult
  }

  const { dbUser } = authResult
  console.log('✅ Auth successful for user:', dbUser.id)

  try {
    console.log('📋 Reading form data...')
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    console.log('📁 Files received:', files.length)

    if (files.length === 0) {
      console.log('❌ No files provided')
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const results = []

    for (const file of files) {
      try {
        console.log(`📄 Processing file: ${file.name}`)
        
        // Create upload directory if it doesn't exist
        console.log('📁 Creating upload directory...')
        const uploadDir = join(process.cwd(), 'uploads', dbUser.id)
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true })
        }

        // Generate unique filename
        console.log('🏷️ Generating filename...')
        const timestamp = Date.now()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `${timestamp}_${sanitizedName}`
        const filepath = join(uploadDir, filename)

        // Save file to disk
        console.log('💾 Saving file to disk...')
        const bytes = await file.arrayBuffer()
        await writeFile(filepath, Buffer.from(bytes))
        console.log('✅ File saved to:', filepath)

        // Save file record to database
        console.log('🗄️ Saving file record to database...')
        const savedFile = await saveUploadedFile({
          user_id: dbUser.id,
          original_filename: file.name,
          file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          file_size: file.size,
          mime_type: file.type,
          storage_path: filepath
        })

        if (!savedFile) {
          console.log('❌ Failed to save file record to database')
          throw new Error('Failed to save file record')
        }
        console.log('✅ File record saved with ID:', savedFile.id)

        // Update status to processing
        console.log('🔄 Updating file status to processing...')
        await updateFileStatus(savedFile.id, 'processing')

        // Parse the file
        console.log('🔍 Starting file parsing...')
        console.log(`📋 File type: ${file.type}, Name: ${file.name}`)
        
        const parsingResult = await Promise.race([
          fileParser.parseFile(file),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('File parsing timeout after 30 seconds')), 30000)
          )
        ]) as any
        
        console.log('✅ File parsing completed:', parsingResult.success)

        if (parsingResult.success && parsingResult.content) {
          const content = parsingResult.content

          // Save processing results
          await saveProcessingResult({
            file_id: savedFile.id,
            extracted_text: content.text,
            word_count: content.metadata.wordCount,
            character_count: content.metadata.characterCount,
            page_count: content.metadata.pageCount || null,
            language: content.metadata.language || null,
            colors: content.metadata.colors || null,
            font_families: content.metadata.fontFamilies || null,
            font_sizes: content.metadata.fontSize || null,
            extracted_images: content.metadata.extractedImages || null,
            metadata: content.rawData,
            confidence_score: content.rawData?.confidence || null,
            processing_time_ms: parsingResult.processingTime
          })

          results.push({
            fileId: savedFile.id,
            filename: file.name,
            status: 'completed',
            parsing: {
              success: true,
              textLength: content.text.length,
              wordCount: content.metadata.wordCount,
              colors: content.metadata.colors?.length || 0,
              processingTime: parsingResult.processingTime
            }
          })
        } else {
          // Mark as failed and save error
          await updateFileStatus(savedFile.id, 'failed')

          results.push({
            fileId: savedFile.id,
            filename: file.name,
            status: 'failed',
            error: parsingResult.error
          })
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        results.push({
          filename: file.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({ 
      message: 'Files processed',
      results,
      totalFiles: files.length,
      successCount: results.filter(r => r.status === 'completed').length,
      failedCount: results.filter(r => r.status === 'failed').length
    })
  } catch (error) {
    console.error('Upload processing error:', error)
    return NextResponse.json({ 
      error: 'Failed to process uploads' 
    }, { status: 500 })
  }
}