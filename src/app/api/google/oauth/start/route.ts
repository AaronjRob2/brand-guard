import { NextRequest, NextResponse } from 'next/server'
import { 
  buildGoogleAuthUrl, 
  setStateCookie, 
  generateState, 
  createErrorResponse 
} from '@/lib/oauth-utils'

export async function GET(request: NextRequest) {
  console.log('🚀 OAuth start requested')
  
  try {
    // Validate environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI
    
    if (!clientId || !redirectUri) {
      console.error('❌ Missing OAuth configuration')
      return createErrorResponse(
        500,
        'OAUTH_CONFIG_MISSING',
        'Google OAuth not properly configured',
        'SERVER_CONFIG',
        { hasClientId: !!clientId, hasRedirectUri: !!redirectUri }
      )
    }

    // Generate CSRF state
    const state = generateState()
    setStateCookie(state)
    
    console.log('🔐 Generated OAuth state:', state.substring(0, 8) + '...')

    // Build authorization URL with required scopes
    const authUrl = buildGoogleAuthUrl({
      clientId,
      redirectUri,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
      ],
      state
    })

    console.log('✅ Generated auth URL for redirect')
    
    return NextResponse.json({
      ok: true,
      url: authUrl,
      state: state.substring(0, 8) + '...' // Only show partial state for debugging
    })

  } catch (error) {
    console.error('❌ Error in OAuth start:', error)
    return createErrorResponse(
      500,
      'OAUTH_START_ERROR',
      'Failed to initialize OAuth flow',
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}