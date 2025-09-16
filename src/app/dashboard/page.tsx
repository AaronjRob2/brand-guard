'use client'

import { AuthGuard } from '@/components/AuthGuard'
import { Header } from '@/components/Header'
import { AdminDashboard } from '@/components/AdminDashboard'
import { UserInterface } from '@/components/UserInterface'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Header />
      <RoleBasedContent />
    </AuthGuard>
  )
}

const RoleBasedContent = () => {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl text-white">🛡️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Role-based content */}
      {isAdmin() ? <AdminDashboard /> : <UserInterface />}
    </div>
  )
}