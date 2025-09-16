import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AnalysisIssue {
  id: string
  type: 'grammar' | 'banned_word' | 'color_violation' | 'image_violation' | 'voice_tone' | 'other'
  severity: 'high' | 'medium' | 'low'
  message: string
  ruleViolated: string
  location?: {
    context?: string
    line?: number
    position?: number
  }
  suggestion?: string
  status: 'open' | 'acknowledged' | 'fixed' | 'dismissed'
}

export interface AnalysisResult {
  id: string
  fileId: string
  totalIssues: number
  highSeverityIssues: number
  mediumSeverityIssues: number
  lowSeverityIssues: number
  complianceScore: number
  analysisTimeMs: number
  contentLength: number
  rulesApplied: number
  analyzedAt: string
}

export interface AnalysisStats {
  totalAnalyses: number
  avgComplianceScore: number
  totalIssues: number
  recentAnalyses: number
}

export const useBrandAnalysis = () => {
  const [analyzing, setAnalyzing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const analyzeFile = useCallback(async (fileId: string, brandFileId?: string): Promise<{
    analysisId: string
    summary: {
      totalIssues: number
      highSeverity: number
      mediumSeverity: number
      lowSeverity: number
      score: number
    }
    issues: AnalysisIssue[]
    rulesApplied: number
    analysisTime: number
  } | null> => {
    setAnalyzing(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('No auth token')

      const requestBody = brandFileId ? { brandFileId } : {}

      const response = await fetch(`/api/user/files/${fileId}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        let errorMessage = 'Analysis failed'
        try {
          const responseText = await response.text()
          
          // Check if response is JSON
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            const errorData = JSON.parse(responseText)
            errorMessage = errorData.error || 'Analysis failed'
          } else if (responseText.includes('<!DOCTYPE')) {
            // HTML error page returned
            errorMessage = `Server returned HTML error page (${response.status}). This usually indicates a server configuration issue or authentication problem.`
          } else {
            // Plain text or other format
            errorMessage = `Server error: ${responseText.substring(0, 100)}`
          }
        } catch (parseError) {
          errorMessage = `Failed to parse server response (${response.status})`
        }
        
        throw new Error(errorMessage)
      }

      // Parse successful response
      let result
      try {
        const responseText = await response.text()
        
        if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          result = JSON.parse(responseText)
        } else if (responseText.includes('<!DOCTYPE')) {
          throw new Error('Server returned HTML page instead of JSON data')
        } else {
          throw new Error(`Unexpected response format: ${responseText.substring(0, 100)}`)
        }
      } catch (parseError) {
        throw new Error(`Server returned invalid data format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }

      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      return null
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const getUserAnalyses = useCallback(async (includeStats: boolean = false): Promise<{
    analyses: AnalysisResult[]
    stats?: AnalysisStats
  }> => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('No auth token')

      const url = `/api/user/analysis${includeStats ? '?stats=true' : ''}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch analyses')

      const result = await response.json()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analyses')
      return { analyses: [] }
    } finally {
      setLoading(false)
    }
  }, [])

  const getAnalysisIssues = useCallback(async (analysisId: string): Promise<AnalysisIssue[]> => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/user/analysis/${analysisId}/issues`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch issues')

      const result = await response.json()
      return result.issues || []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const updateIssueStatus = useCallback(async (
    analysisId: string, 
    issueId: string, 
    status: 'open' | 'acknowledged' | 'fixed' | 'dismissed'
  ): Promise<boolean> => {
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/user/analysis/${analysisId}/issues`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ issueId, status })
      })

      if (!response.ok) throw new Error('Failed to update issue status')

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issue status')
      return false
    }
  }, [])

  const testAnalyzeEndpoint = useCallback(async (fileId: string): Promise<any> => {
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/user/files/${fileId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true })
      })

      const responseText = await response.text()
      
      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        result = { error: 'Non-JSON response', response: responseText.substring(0, 200) }
      }

      return {
        status: response.status,
        ok: response.ok,
        data: result
      }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Test failed'
      }
    }
  }, [])

  return {
    analyzing,
    loading,
    error,
    analyzeFile,
    getUserAnalyses,
    getAnalysisIssues,  
    updateIssueStatus,
    testAnalyzeEndpoint,
    clearError: () => setError(null)
  }
}