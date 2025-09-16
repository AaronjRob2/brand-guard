import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  return NextResponse.json({
    message: '✅ Callback route is accessible and working',
    url: request.url,
    timestamp: new Date().toISOString(),
    params: Object.fromEntries(searchParams.entries()),
    test: 'This confirms the OAuth callback route structure is correct'
  })
}