import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireAuth } from '@/lib/middleware'

// Get redirect URI - fallback to localhost for development
const getRedirectUri = () => {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/drive/callback`
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getRedirectUri()
)

export async function GET(request: NextRequest) {
  try {
    // Check if Google credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('❌ GOOGLE_CLIENT_ID not configured')
      return NextResponse.json({ 
        error: 'Google Drive integration not configured: GOOGLE_CLIENT_ID missing',
        diagnostic: 'MISSING_CLIENT_ID'
      }, { status: 500 })
    }

    if (!process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ GOOGLE_CLIENT_SECRET not configured')
      return NextResponse.json({ 
        error: 'Google Drive integration not configured: GOOGLE_CLIENT_SECRET missing',
        diagnostic: 'MISSING_CLIENT_SECRET' 
      }, { status: 500 })
    }

    const authResult = await requireAuth(request)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }

    console.log('🔐 Generating Google Drive auth URL for user:', authResult.dbUser.id)
    const redirectUri = getRedirectUri()
    console.log('📍 Using redirect URI:', redirectUri)
    
    // Log environment variables for debugging (without sensitive values)
    console.log('🔧 Environment check:')
    console.log('  - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? `SET (${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...)` : 'MISSING')
    console.log('  - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING')
    console.log('  - GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || 'NOT SET')
    console.log('  - NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'NOT SET')
    
    // Log the exact OAuth client configuration
    console.log('🔧 OAuth Client Config:')
    console.log('  - Client ID (first 20 chars):', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) || 'MISSING')
    console.log('  - Redirect URI being used:', redirectUri)

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
      prompt: 'consent',
      state: JSON.stringify({ userId: authResult.dbUser.id })
    })

    console.log('✅ Generated auth URL successfully')
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('❌ Error in Drive auth endpoint:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate auth URL' 
    }, { status: 500 })
  }
}