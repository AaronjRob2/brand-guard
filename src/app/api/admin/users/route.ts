import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { email, role } = await request.json()

    if (!email || !role || !['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid email or role' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ role })
      .eq('email', email)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
    }

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}