import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

interface DashboardStats {
  totalUsers: number
  filesProcessed: number
  storageUsed: number
  recentActivity: Array<Record<string, unknown>>
}

export const useAdminData = () => {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const { users } = await response.json()
      setUsers(users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const { stats } = await response.json()
      setStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    }
  }

  const updateUserRole = async (email: string, role: 'user' | 'admin'): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return false

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email, role })
      })

      if (!response.ok) {
        throw new Error('Failed to update user role')
      }

      // Refresh users list
      await fetchUsers()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role')
      return false
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchUsers(), fetchStats()])
      setLoading(false)
    }

    loadData()
  }, [])

  return {
    users,
    stats,
    loading,
    error,
    fetchUsers,
    fetchStats,
    updateUserRole
  }
}