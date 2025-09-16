import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID ? 
      `${process.env.GOOGLE_CLIENT_ID.substring(0, 12)}...` : 
      'NOT_SET',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'NOT_SET',
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET'
  }

  return NextResponse.json({
    message: 'Google OAuth Configuration',
    config,
    expectedRedirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google/oauth/callback`,
    instructions: [
      '1. Go to Google Cloud Console → APIs & Services → Credentials',
      '2. Select your OAuth 2.0 Client ID',
      '3. In Authorized redirect URIs, add: ' + config.redirectUri,
      '4. Save the configuration',
      '5. Wait a few minutes for changes to propagate'
    ]
  })
}