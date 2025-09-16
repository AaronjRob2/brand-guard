import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware'
import { emailService } from '@/lib/emailService'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { dbUser } = authResult

  try {
    const { testEmail } = await request.json()
    const emailToTest = testEmail || dbUser.email

    console.log(`Sending test email to: ${emailToTest}`)
    const success = await emailService.sendTestEmail(emailToTest)

    if (!success) {
      throw new Error('Failed to send test email')
    }

    return NextResponse.json({
      message: `Test email sent successfully to ${emailToTest}`,
      success: true
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send test email',
      success: false
    }, { status: 500 })
  }
}