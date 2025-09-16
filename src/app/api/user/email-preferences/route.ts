import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { updateEmailPreferences } from '@/lib/database'

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { dbUser } = authResult

  try {
    const { emailNotifications } = await request.json()

    if (typeof emailNotifications !== 'boolean') {
      return NextResponse.json({ 
        error: 'emailNotifications must be a boolean' 
      }, { status: 400 })
    }

    const success = await updateEmailPreferences(dbUser.id, emailNotifications)

    if (!success) {
      throw new Error('Failed to update email preferences')
    }

    return NextResponse.json({
      message: 'Email preferences updated successfully',
      emailNotifications
    })
  } catch (error) {
    console.error('Error updating email preferences:', error)
    return NextResponse.json({ 
      error: 'Failed to update email preferences' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { dbUser } = authResult

  return NextResponse.json({
    emailNotifications: dbUser.email_notifications ?? true
  })
}