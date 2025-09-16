import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

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

interface BrandFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  downloadUrl?: string
  size?: string
}

export async function GET(request: NextRequest) {
  console.log('🔗 Brand files API called:', request.url)
  try {
    console.log('🔐 Starting auth check...')
    const authResult = await requireAuth(request)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }

    console.log('🔍 Fetching brand files for user:', authResult.dbUser.id)

    // Check if user has any drive folders at all
    const { data: allFolders, error: allFoldersError } = await supabaseAdmin
      .from('drive_folders')
      .select('name')
      .eq('connected_by', authResult.dbUser.id)

    if (allFoldersError) {
      console.error('❌ Error checking user folders:', allFoldersError)
      return NextResponse.json({ 
        error: 'Database error checking drive folders' 
      }, { status: 500 })
    }

    if (!allFolders || allFolders.length === 0) {
      console.log('❌ No drive folders found for user')
      return NextResponse.json({ 
        error: 'No Google Drive connection found. Please connect to Google Drive first.',
        diagnostic: 'NO_DRIVE_CONNECTION'
      }, { status: 404 })
    }

    console.log('📁 User has folders:', allFolders.map(f => f.name))

    // Get the Brand Guidelines Test folder for this user
    const { data: folder, error: folderError } = await supabaseAdmin
      .from('drive_folders')
      .select('*')
      .eq('connected_by', authResult.dbUser.id)
      .eq('name', 'Brand Guidelines Test')
      .single()

    if (folderError || !folder) {
      console.log('❌ Brand Guidelines Test folder not found. Available folders:', allFolders.map(f => f.name))
      return NextResponse.json({ 
        error: 'Brand Guidelines Test folder not found in your Google Drive.',
        diagnostic: 'MISSING_BRAND_FOLDER',
        availableFolders: allFolders.map(f => f.name),
        suggestion: 'Create a folder named exactly "Brand Guidelines Test" in your Google Drive and reconnect.'
      }, { status: 404 })
    }

    // Get the user's stored Google Drive tokens
    const { data: driveTokens, error: tokenError } = await supabaseAdmin
      .from('drive_tokens')
      .select('*')
      .eq('user_id', authResult.dbUser.id)
      .eq('provider', 'google')
      .maybeSingle()

    if (tokenError) {
      console.error('❌ Error querying drive tokens for user:', authResult.dbUser.id, tokenError)
      return NextResponse.json({ 
        error: 'Database error checking drive tokens',
        diagnostic: 'DATABASE_ERROR'
      }, { status: 500 })
    }

    if (!driveTokens) {
      console.log('❌ No drive tokens found for user:', authResult.dbUser.id)
      return NextResponse.json({ 
        error: 'Google Drive authentication expired or missing.',
        diagnostic: 'MISSING_DRIVE_TOKENS',
        suggestion: 'Please reconnect to Google Drive to refresh your authentication.'
      }, { status: 401 })
    }

    console.log('✅ Drive tokens found for user')

    // Set up Google OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: driveTokens.access_token,
      refresh_token: driveTokens.refresh_token
    })

    // Create Drive client
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    // List files in the Brand Guidelines Test folder
    const filesResponse = await drive.files.list({
      q: `'${folder.drive_folder_id}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,webViewLink,size)',
      pageSize: 100
    })

    const files: BrandFile[] = (filesResponse.data.files || [])
      .filter(file => {
        // Filter for brand guideline file types
        const supportedTypes = [
          // PDF files
          'application/pdf',
          
          // Image files
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'image/bmp',
          'image/tiff',
          'image/tif',
          
          // Google Workspace files
          'application/vnd.google-apps.document',
          'application/vnd.google-apps.presentation',
          'application/vnd.google-apps.spreadsheet',
          
          // Microsoft Office files
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/msword', // .doc
          'application/vnd.ms-powerpoint', // .ppt
          'application/vnd.ms-excel', // .xls
          
          // Text files
          'text/plain',
          'text/markdown',
          'text/html',
          'text/css',
          'text/rtf',
          'application/rtf',
          
          // Other document formats
          'application/vnd.openxmlformats-officedocument.wordprocessingml.template', // .dotx
          'application/vnd.ms-word.document.macroEnabled.12', // .docm
          'application/vnd.oasis.opendocument.text', // .odt
          'application/vnd.oasis.opendocument.presentation', // .odp
          'application/vnd.oasis.opendocument.spreadsheet', // .ods
          
          // Adobe files
          'application/postscript', // .ai (Adobe Illustrator)
          'application/x-photoshop', // .psd
          'image/vnd.adobe.photoshop', // .psd
          
          // Archive files (for brand asset packages)
          'application/zip',
          'application/x-zip-compressed',
          'application/x-rar-compressed',
          'application/x-7z-compressed',
          
          // JSON and XML (for style guides/design tokens)
          'application/json',
          'application/xml',
          'text/xml'
        ]
        return file.mimeType && supportedTypes.includes(file.mimeType)
      })
      .map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        webViewLink: file.webViewLink!,
        size: file.size || undefined
      }))

    console.log(`Found ${files.length} brand files in folder:`, folder.name)
    
    return NextResponse.json({ 
      files,
      folder: {
        id: folder.id,
        name: folder.name,
        drive_folder_id: folder.drive_folder_id
      }
    })

  } catch (error) {
    console.error('Error in brand files endpoint:', error)
    
    // Handle token refresh if needed
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.json({ 
        error: 'Drive authentication expired. Please reconnect to Google Drive.' 
      }, { status: 401 })
    }

    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}