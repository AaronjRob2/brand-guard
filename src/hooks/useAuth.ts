import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getUserByEmail, User as DbUser } from '@/lib/database'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const getSession = async () => {
      console.log('useAuth: Getting session...')
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('useAuth: Session data:', { session: !!session, user: !!session?.user, error })
        
        if (error) throw error
        
        const authUser = session?.user ?? null
        setUser(authUser)
        
        if (authUser?.email) {
          console.log('useAuth: Fetching user data for:', authUser.email)
          try {
            // Temporarily bypass database call to fix loading issue
            console.log('useAuth: Bypassing database call for now')
            setDbUser({ 
              id: authUser.id, 
              email: authUser.email, 
              full_name: authUser.user_metadata?.name || '', 
              role: 'user',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            // const userData = await getUserByEmail(authUser.email)
            // console.log('useAuth: User data fetched:', !!userData)
            // setDbUser(userData)
          } catch (dbError) {
            console.error('Error fetching user data:', dbError)
            setDbUser(null)
          }
        } else {
          setDbUser(null)
        }
        
        setAuthError(null)
      } catch (err) {
        console.error('useAuth: Session error:', err)
        setAuthError(err instanceof Error ? err.message : 'Failed to get session')
      } finally {
        console.log('useAuth: Setting loading to false')
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          const authUser = session?.user ?? null
          setUser(authUser)
          
          if (authUser?.email) {
            try {
              // Temporarily bypass database call to fix loading issue
              setDbUser({ 
                id: authUser.id, 
                email: authUser.email, 
                full_name: authUser.user_metadata?.name || '', 
                role: 'user',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              // const userData = await getUserByEmail(authUser.email)
              // setDbUser(userData)
            } catch (dbError) {
              console.error('Error fetching user data:', dbError)
              setDbUser(null)
            }
          } else {
            setDbUser(null)
          }
          
          setAuthError(null)
        } catch (err) {
          setAuthError(err instanceof Error ? err.message : 'Auth state change failed')
        } finally {
          setLoading(false)
        }
      }
    )

    // Session timeout handling - refresh token after 50 minutes
    const sessionTimeout = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && session.expires_at) {
          const expiresAt = session.expires_at * 1000
          const now = Date.now()
          const timeUntilExpiry = expiresAt - now
          
          // Refresh if expires in less than 10 minutes
          if (timeUntilExpiry < 600000) {
            await supabase.auth.refreshSession()
          }
        }
      } catch (err) {
        console.warn('Session refresh failed:', err)
      }
    }, 300000) // Check every 5 minutes

    return () => {
      subscription.unsubscribe()
      clearInterval(sessionTimeout)
    }
  }, [])

  const signInWithGoogle = async () => {
    setSigningIn(true)
    setAuthError(null)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      if (error) throw error
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed')
      throw err
    } finally {
      setSigningIn(false)
    }
  }

  const signOut = async () => {
    setSigningOut(true)
    setAuthError(null)
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign out failed')
      throw err
    } finally {
      setSigningOut(false)
    }
  }

  const isAuthorized = (email: string | undefined): boolean => {
    return email?.endsWith('@danielbrian.com') ?? false
  }

  const isAdmin = (): boolean => {
    return dbUser?.role === 'admin'
  }

  const isUser = (): boolean => {
    return dbUser?.role === 'user'
  }

  return {
    user,
    dbUser,
    loading,
    authError,
    signingIn,
    signingOut,
    signInWithGoogle,
    signOut,
    isAuthorized,
    isAdmin,
    isUser,
    clearAuthError: () => setAuthError(null)
  }
}