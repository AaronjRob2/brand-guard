import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  exchangeCodeForTokens, 
  getStateCookie, 
  calculateExpiresAt, 
  createErrorResponse 
} from '@/lib/oauth-utils'

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

export async function GET(request: NextRequest) {
  console.log('🔄 OAuth callback received:', request.url)
  
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors from Google
  if (error) {
    console.error('❌ OAuth error from Google:', error)
    const redirectUrl = new URL('/settings/drive', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('error', 'oauth_denied')
    redirectUrl.searchParams.set('message', `Google OAuth error: ${error}`)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // Validate required parameters
  if (!code) {
    console.error('❌ Missing authorization code')
    return createErrorResponse(
      400,
      'MISSING_CODE',
      'Authorization code not provided',
      'OAUTH_FLOW_ERROR'
    )
  }

  if (!state) {
    console.error('❌ Missing state parameter')
    return createErrorResponse(
      400,
      'MISSING_STATE',
      'State parameter not provided',
      'OAUTH_FLOW_ERROR'
    )
  }

  // Verify CSRF state
  const storedState = getStateCookie()
  if (!storedState || storedState !== state) {
    console.error('❌ State mismatch:', { provided: state?.substring(0, 8), stored: storedState?.substring(0, 8) })
    return createErrorResponse(
      400,
      'OAUTH_STATE_MISMATCH',
      'Invalid state parameter - possible CSRF attack',
      'SECURITY_ERROR'
    )
  }

  console.log('✅ State verification passed')

  try {
    // Validate environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Missing OAuth configuration')
      return createErrorResponse(
        500,
        'OAUTH_CONFIG_MISSING',
        'Google OAuth not properly configured',
        'SERVER_CONFIG'
      )
    }

    // Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...')
    const tokens = await exchangeCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri
    })

    console.log('✅ Successfully obtained tokens from Google:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in
    })

    // Calculate expiration
    const expiresAt = calculateExpiresAt(tokens.expires_in)

    // Get user from session (they must be logged in to start OAuth)
    // Check if we have a session token in cookies or headers
    const authHeader = request.headers.get('authorization')
    const cookies = request.headers.get('cookie')
    
    // Try to get session from cookie (for browser redirects)
    let sessionToken: string | null = null
    if (cookies) {
      const cookieMatch = cookies.match(/supabase-auth-token=([^;]+)/)
      if (cookieMatch) {
        sessionToken = cookieMatch[1]
      }
    }
    
    // Fallback to auth header
    if (!sessionToken && authHeader) {
      sessionToken = authHeader.replace('Bearer ', '')
    }
    
    if (!sessionToken) {
      console.error('❌ No session found for OAuth callback')
      const redirectUrl = new URL('/settings/drive', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      redirectUrl.searchParams.set('error', 'session_required')
      redirectUrl.searchParams.set('message', 'Please sign in first')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Get user from session
    const { data: { user }, error: sessionError } = await supabaseAdmin.auth.getUser(sessionToken)
    
    if (sessionError || !user) {
      console.error('❌ Invalid session for OAuth callback:', sessionError)
      const redirectUrl = new URL('/settings/drive', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      redirectUrl.searchParams.set('error', 'invalid_session')
      redirectUrl.searchParams.set('message', 'Please sign in again')
      return NextResponse.redirect(redirectUrl.toString())
    }

    const userId = user.id

    // Store tokens in database
    console.log('💾 Storing tokens in database...')
    const { error: dbError } = await supabaseAdmin
      .from('drive_tokens')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('❌ Database error saving tokens:', dbError)
      return createErrorResponse(
        500,
        'DB_ERROR',
        'Failed to save authentication tokens',
        'DATABASE_ERROR',
        dbError.message
      )
    }

    console.log('✅ Tokens saved successfully')

    // Redirect to success page
    const redirectUrl = new URL('/settings/drive', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    redirectUrl.searchParams.set('connected', '1')
    
    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    console.error('❌ Token exchange failed:', error)
    
    if (error instanceof Error && error.message.includes('Token exchange failed')) {
      return createErrorResponse(
        400,
        'TOKEN_EXCHANGE_FAILED',
        'Failed to exchange authorization code for tokens',
        'GOOGLE_API_ERROR',
        error.message
      )
    }

    return createErrorResponse(
      500,
      'OAUTH_CALLBACK_ERROR',
      'Unexpected error during OAuth callback',
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

// Alternative repository-based token storage (if not using Supabase)
export async function saveTokensWithRepository(
  userId: string,
  tokens: {
    access_token: string
    refresh_token?: string
    expires_at: string
  }
) {
  // Example repository pattern
  // Replace with your actual database/ORM implementation
  
  /*
  const tokenRepository = new DriveTokenRepository()
  
  await tokenRepository.upsert({
    userId,
    provider: 'google',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expires_at),
    updatedAt: new Date()
  })
  */
  
  throw new Error('Repository implementation needed - replace with your database layer')
}