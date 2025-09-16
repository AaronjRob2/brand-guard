import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

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

// Get redirect URI - must match the auth route
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
  console.log('🔄 Drive callback called:', request.url)
  console.log('🔄 Request headers:', {
    host: request.headers.get('host'),
    userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...',
    referer: request.headers.get('referer')
  })
  
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  console.log('📥 Callback params:', { 
    hasCode: !!code, 
    hasState: !!state, 
    error: error || 'none',
    redirectUri: getRedirectUri()
  })

  // Always redirect to a safe page with status information
  const baseRedirectUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  
  if (error) {
    console.error('❌ OAuth error:', error)
    const redirectUrl = new URL('/dashboard', baseRedirectUrl)
    redirectUrl.searchParams.set('error', 'oauth_failed')
    redirectUrl.searchParams.set('message', `Google OAuth error: ${error}`)
    return NextResponse.redirect(redirectUrl.toString())
  }

  if (!code || !state) {
    console.error('❌ Missing code or state in callback')
    const redirectUrl = new URL('/dashboard', baseRedirectUrl)
    redirectUrl.searchParams.set('error', 'missing_code')
    redirectUrl.searchParams.set('message', 'Missing authorization code from Google')
    return NextResponse.redirect(redirectUrl.toString())
  }

  try {
    console.log('🔄 Parsing state:', state)
    const { userId } = JSON.parse(state)
    console.log('✅ Extracted userId from state:', userId)
    
    // Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...')
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    console.log('✅ Got tokens from Google:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expiry_date
    })

    // Save tokens to drive_tokens table
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
    
    console.log('💾 Saving tokens to database for user:', userId)
    const { error: tokenError } = await supabaseAdmin
      .from('drive_tokens')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt
      })

    if (tokenError) {
      console.error('❌ Error saving drive tokens:', tokenError)
      const redirectUrl = new URL('/dashboard', baseRedirectUrl)
      redirectUrl.searchParams.set('error', 'token_save_failed')
      redirectUrl.searchParams.set('message', 'Failed to save authentication tokens')
      return NextResponse.redirect(redirectUrl.toString())
    }

    console.log('✅ Saved tokens to drive_tokens table')

    // Skip complex folder operations for now - just redirect with success
    console.log('✅ OAuth callback completed successfully for user:', userId)
    
    const redirectUrl = new URL('/dashboard', baseRedirectUrl)
    redirectUrl.searchParams.set('success', 'drive_connected')
    redirectUrl.searchParams.set('message', 'Google Drive connected successfully!')
    
    console.log('🔄 Redirecting to:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl.toString())

  } catch (err) {
    console.error('❌ Error in Drive callback:', err)
    const redirectUrl = new URL('/dashboard', baseRedirectUrl)
    redirectUrl.searchParams.set('error', 'callback_failed')
    redirectUrl.searchParams.set('message', 'OAuth callback failed - please try again')
    return NextResponse.redirect(redirectUrl.toString())
  }
}