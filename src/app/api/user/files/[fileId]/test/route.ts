import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    console.log('🧪 Test endpoint called for fileId:', params?.fileId)

    // Basic validation
    if (!params || !params.fileId) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing fileId',
        step: 'validation'
      }, { status: 400 })
    }

    // Test authentication
    console.log('🔐 Testing auth...')
    const authResult = await requireAuth(request)
    
    if (authResult instanceof NextResponse) {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication failed',
        step: 'auth'
      }, { status: 401 })
    }

    const { dbUser } = authResult

    // Test request body parsing
    let body = null
    try {
      body = await request.json()
    } catch {
      body = { note: 'No JSON body provided' }
    }

    return NextResponse.json({
      status: 'success',
      message: 'All basic tests passed',
      data: {
        fileId: params.fileId,
        userId: dbUser.id,
        userEmail: dbUser.email,
        requestBody: body,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Test endpoint failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 })
  }
}