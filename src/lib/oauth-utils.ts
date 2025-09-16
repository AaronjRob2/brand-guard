import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export interface GoogleAuthUrlParams {
  clientId: string
  redirectUri: string
  scopes: string[]
  state: string
}

export interface TokenExchangeParams {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

/**
 * Build Google OAuth authorization URL
 */
export function buildGoogleAuthUrl({ 
  clientId, 
  redirectUri, 
  scopes, 
  state 
}: GoogleAuthUrlParams): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: state
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens({
  code,
  clientId,
  clientSecret,
  redirectUri
}: TokenExchangeParams): Promise<GoogleTokenResponse> {
  const tokenUrl = 'https://oauth2.googleapis.com/token'
  
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: body.toString()
  })

  const data = await safeJson(response)
  
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${data.error || 'Unknown error'}`)
  }

  return data as GoogleTokenResponse
}

/**
 * Safely parse JSON response, handle empty/invalid responses
 */
export async function safeJson(response: Response): Promise<any> {
  const text = await response.text()
  
  if (!text || text.trim() === '') {
    return { error: 'Empty response' }
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    return { 
      error: 'Invalid JSON', 
      raw: text.substring(0, 200) 
    }
  }
}

/**
 * Set state cookie for CSRF protection
 */
export function setStateCookie(state: string): void {
  const cookieStore = cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })
}

/**
 * Get and verify state cookie
 */
export function getStateCookie(): string | null {
  const cookieStore = cookies()
  return cookieStore.get('oauth_state')?.value || null
}

/**
 * Generate random state string
 */
export function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

/**
 * Calculate token expiration timestamp
 */
export function calculateExpiresAt(expiresIn: number): string {
  return new Date(Date.now() + (expiresIn * 1000)).toISOString()
}

/**
 * Standard error response format
 */
export function createErrorResponse(
  status: number,
  code: string,
  message: string,
  diagnostic?: string,
  details?: any
): NextResponse {
  return NextResponse.json({
    ok: false,
    status,
    code,
    message,
    diagnostic,
    details
  }, { status })
}