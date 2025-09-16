import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  console.log('🧪 Test analyze endpoint called')
  
  try {
    const authResult = await requireAuth(request)
    
    if (authResult instanceof NextResponse) {
      return NextResponse.json({
        status: 'auth_failed',
        message: 'Authentication failed',
        error: 'Could not authenticate user'
      }, { status: 401 })
    }

    const { dbUser } = authResult

    return NextResponse.json({
      status: 'success',
      message: 'Authentication successful',
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role
      },
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
      }
    })
  } catch (error) {
    console.error('❌ Test analyze endpoint error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}