/**
 * Frontend integration for Google Drive OAuth
 */

export interface ConnectDriveResult {
  ok: boolean
  url?: string
  error?: string
  message?: string
}

/**
 * Initialize Google Drive connection
 * This function will redirect the user to Google's OAuth consent screen
 */
export async function connectDrive(): Promise<void> {
  try {
    console.log('🚀 Starting Google Drive connection...')
    
    // Get session token for authentication
    const sessionToken = getSessionToken()
    if (!sessionToken) {
      throw new Error('Please sign in first to connect Google Drive')
    }

    // Call the OAuth start endpoint
    const response = await fetch('/api/google/oauth/start', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok || !data.ok) {
      console.error('❌ Failed to start OAuth flow:', data)
      throw new Error(data.message || 'Failed to initialize Google Drive connection')
    }

    if (!data.url) {
      throw new Error('No authorization URL received from server')
    }

    console.log('✅ Redirecting to Google OAuth...')
    
    // Redirect to Google OAuth consent screen
    window.location.href = data.url

  } catch (error) {
    console.error('❌ Error connecting to Google Drive:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

/**
 * Get session token from Supabase
 * You may need to adjust this based on your Supabase client setup
 */
function getSessionToken(): string | null {
  // This assumes you have Supabase client available globally or imported
  // Adjust based on your actual authentication setup
  
  if (typeof window !== 'undefined') {
    // Check localStorage for Supabase session
    try {
      const supabaseSession = localStorage.getItem('supabase.auth.token')
      if (supabaseSession) {
        const parsed = JSON.parse(supabaseSession)
        return parsed.access_token || parsed.currentSession?.access_token
      }
    } catch (error) {
      console.warn('Failed to parse Supabase session from localStorage')
    }
    
    // Check cookies as fallback
    const cookies = document.cookie
    const match = cookies.match(/supabase-auth-token=([^;]+)/)
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * Check connection status and handle URL parameters after OAuth callback
 */
export function handleOAuthCallback(): {
  connected: boolean
  error: string | null
  message: string | null
} {
  if (typeof window === 'undefined') {
    return { connected: false, error: null, message: null }
  }

  const urlParams = new URLSearchParams(window.location.search)
  
  // Check for success
  if (urlParams.get('connected') === '1') {
    // Clean up URL
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('connected')
    window.history.replaceState({}, document.title, cleanUrl.toString())
    
    return {
      connected: true,
      error: null,
      message: 'Google Drive connected successfully!'
    }
  }

  // Check for errors
  const error = urlParams.get('error')
  const message = urlParams.get('message')
  
  if (error) {
    // Clean up URL
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('error')
    cleanUrl.searchParams.delete('message')
    window.history.replaceState({}, document.title, cleanUrl.toString())
    
    return {
      connected: false,
      error,
      message: message || getErrorMessage(error)
    }
  }

  return { connected: false, error: null, message: null }
}

/**
 * Get user-friendly error messages
 */
function getErrorMessage(error: string): string {
  switch (error) {
    case 'oauth_denied':
      return 'You denied access to Google Drive. Please try again if you want to connect.'
    case 'session_required':
      return 'Please sign in first before connecting Google Drive.'
    case 'invalid_session':
      return 'Your session expired. Please sign in again.'
    case 'oauth_failed':
      return 'Google OAuth failed. Please try again.'
    case 'callback_failed':
      return 'OAuth callback failed. Please check your internet connection and try again.'
    default:
      return 'An error occurred while connecting to Google Drive. Please try again.'
  }
}

/**
 * React hook for handling OAuth callback (optional)
 */
export function useOAuthCallback() {
  if (typeof window === 'undefined') {
    return { connected: false, error: null, message: null }
  }

  const [result, setResult] = React.useState({ connected: false, error: null, message: null })

  React.useEffect(() => {
    const callbackResult = handleOAuthCallback()
    if (callbackResult.connected || callbackResult.error) {
      setResult(callbackResult)
    }
  }, [])

  return result
}

// Note: You'll need to import React if using the hook above
// import React from 'react'