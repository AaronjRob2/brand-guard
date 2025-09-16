'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth()
  const router = useRouter()

  console.log('AuthGuard: user:', !!user, 'loading:', loading)

  useEffect(() => {
    console.log('AuthGuard useEffect: loading:', loading, 'user:', !!user)
    if (!loading && !user) {
      console.log('AuthGuard: Redirecting to root page for login')
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    console.log('AuthGuard: Showing loading screen')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl text-white">🛡️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('AuthGuard: No user, returning null')
    return null // Will redirect to login via useEffect
  }

  console.log('AuthGuard: User authenticated, showing children')
  return <>{children}</>
}