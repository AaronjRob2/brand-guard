import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Get redirect URI exactly as the auth route calculates it
  const getRedirectUri = () => {
    if (process.env.GOOGLE_REDIRECT_URI) {
      return process.env.GOOGLE_REDIRECT_URI
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/api/drive/callback`
  }

  const redirectUri = getRedirectUri()
  
  return NextResponse.json({
    message: "OAuth Configuration Debug",
    currentConfig: {
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'NOT_SET',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
      calculatedRedirectUri: redirectUri,
      clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) || 'NOT_SET'
    },
    instructions: {
      googleCloudConsole: "Go to Google Cloud Console → APIs & Services → Credentials",
      step1: "Click on your OAuth 2.0 Client ID",
      step2: `Add this EXACT URI to Authorized redirect URIs: ${redirectUri}`,
      step3: "Save the configuration",
      step4: "Wait 5-10 minutes for changes to propagate",
      note: "The URI must match EXACTLY (including http vs https, port number, path)"
    },
    possibleIssues: [
      "URI not added to Google Cloud Console",
      "Typo in the URI (extra slash, wrong port, etc.)",
      "Google changes not yet propagated (wait 5-10 minutes)",
      "Wrong OAuth client selected in Google Cloud Console"
    ]
  })
}