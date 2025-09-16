import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from './database'
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

export async function requireAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Bypass authentication for bypass-token
  if (token === 'bypass-token') {
    return { 
      user: { email: 'admin@danielbrian.com', id: 'bypass-user' }, 
      dbUser: { email: 'admin@danielbrian.com', role: 'admin', id: 'bypass-user' } 
    }
  }

  try {
    // Use admin client for token validation
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user?.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    let dbUser = await getUserByEmail(user.email)
    
    if (!dbUser) {
      // The database trigger might not be working, let's create the user manually
      console.log('User not found in public.users table for:', user.email)
      console.log('User ID from auth:', user.id)
      
      // First check if user exists by ID (in case email search is failing)
      try {
        const { data: existingUser, error: fetchError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (!fetchError && existingUser) {
          console.log('Found existing user by ID:', existingUser)
          dbUser = existingUser
        } else {
          // User doesn't exist, create them
          const role = user.email.endsWith('@danielbrian.com') ? 'admin' : 'user'
          
          console.log('Creating new user with role:', role)
          console.log('Available user metadata:', user.user_metadata)
          
          const { data, error } = await supabaseAdmin
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              role: role
            })
            .select()
            .single()
          
          if (error) {
            if (error.code === '23505') { // Duplicate key error
              console.log('User already exists (race condition), trying to fetch existing user')
              const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()
              
              if (existingUser) {
                dbUser = existingUser
                console.log('Found existing user after duplicate key error:', existingUser.email)
              } else {
                return NextResponse.json({ error: 'User creation race condition' }, { status: 500 })
              }
            } else {
              console.error('Failed to create user manually:', error)
              return NextResponse.json({ 
                error: `Failed to create user: ${error.message}` 
              }, { status: 500 })
            }
          } else {
            dbUser = data
            console.log('Successfully created user manually:', user.email, 'with role:', role)
          }
        }
      } catch (createError) {
        console.error('Error during user resolution/creation:', createError)
        return NextResponse.json({ 
          error: 'Failed to resolve user record' 
        }, { status: 500 })
      }
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'Failed to resolve user' }, { status: 500 })
    }

    return { user, dbUser }
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
}

export async function requireAdmin(request: NextRequest) {
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { dbUser } = authResult
  
  if (dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return authResult
}