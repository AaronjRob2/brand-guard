import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Get redirect URI - same logic as auth route
  const getRedirectUri = () => {
    if (process.env.GOOGLE_REDIRECT_URI) {
      return process.env.GOOGLE_REDIRECT_URI
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/api/drive/callback`
  }

  const redirectUri = getRedirectUri()

  return NextResponse.json({
    redirectUri,
    environment: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'NOT SET',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'
    },
    requestInfo: {
      host: request.headers.get('host'),
      protocol: request.headers.get('x-forwarded-proto') || 'http',
      origin: request.headers.get('origin'),
      url: request.url
    },
    instructions: {
      message: 'Add this exact redirect URI to your Google Cloud Console OAuth settings:',
      redirectUri: redirectUri,
      googleConsoleUrl: 'https://console.cloud.google.com/apis/credentials'
    }
  })
}