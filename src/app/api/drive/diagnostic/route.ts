import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
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

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }

    console.log('🔧 Running diagnostic for user:', authResult.dbUser.id)

    const diagnostic = {
      user: {
        id: authResult.dbUser.id,
        email: authResult.dbUser.email || 'Unknown'
      },
      googleApi: {
        clientIdConfigured: !!process.env.GOOGLE_CLIENT_ID,
        clientSecretConfigured: !!process.env.GOOGLE_CLIENT_SECRET,
        redirectUriConfigured: !!process.env.GOOGLE_REDIRECT_URI,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'Not set'
      },
      drive: {
        foldersConnected: 0,
        tokenExists: false,
        brandGuidelinesFolder: false,
        availableFolders: [] as string[]
      }
    }

    // Check for drive folders
    const { data: folders, error: foldersError } = await supabaseAdmin
      .from('drive_folders')
      .select('name')
      .eq('connected_by', authResult.dbUser.id)

    if (!foldersError && folders) {
      diagnostic.drive.foldersConnected = folders.length
      diagnostic.drive.availableFolders = folders.map(f => f.name)
      diagnostic.drive.brandGuidelinesFolder = folders.some(f => f.name === 'Brand Guidelines Test')
    }

    // Check for drive tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('drive_tokens')
      .select('created_at')
      .eq('user_id', authResult.dbUser.id)
      .single()

    if (!tokensError && tokens) {
      diagnostic.drive.tokenExists = true
    }

    return NextResponse.json({ 
      diagnostic,
      recommendations: generateRecommendations(diagnostic)
    })

  } catch (error) {
    console.error('❌ Error in diagnostic endpoint:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

function generateRecommendations(diagnostic: {
  user: { id: string; email: string };
  googleApi: { clientIdConfigured: boolean; clientSecretConfigured: boolean; redirectUriConfigured: boolean; redirectUri: string };
  drive: { foldersConnected: number; tokenExists: boolean; brandGuidelinesFolder: boolean; availableFolders: string[] };
}) {
  const recommendations = []

  if (!diagnostic.googleApi.clientIdConfigured || !diagnostic.googleApi.clientSecretConfigured) {
    recommendations.push({
      type: 'error',
      message: 'Google API credentials not configured properly',
      action: 'Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
    })
  }

  if (!diagnostic.drive.tokenExists) {
    recommendations.push({
      type: 'warning',
      message: 'No Google Drive authentication found',
      action: 'Click "Connect Drive" to authenticate with Google Drive'
    })
  }

  if (diagnostic.drive.foldersConnected === 0) {
    recommendations.push({
      type: 'info',
      message: 'No drive folders connected',
      action: 'Connect to Google Drive to access your folders'
    })
  } else if (!diagnostic.drive.brandGuidelinesFolder) {
    recommendations.push({
      type: 'warning',
      message: 'Brand Guidelines Test folder not found',
      action: `Create a folder named "Brand Guidelines Test" in Google Drive. Available folders: ${diagnostic.drive.availableFolders.join(', ')}`
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'All systems configured correctly',
      action: 'You should be able to select brand files from your Brand Guidelines Test folder'
    })
  }

  return recommendations
}