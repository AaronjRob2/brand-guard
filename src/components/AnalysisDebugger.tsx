'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useBrandAnalysis } from '@/hooks/useBrandAnalysis'

export const AnalysisDebugger = ({ testFileId }: { testFileId?: string }) => {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { testAnalyzeEndpoint } = useBrandAnalysis()

  const runDiagnostic = async () => {
    setTesting(true)
    setResults(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setResults({ error: 'No authentication session found' })
        return
      }

      // Test the basic auth endpoint first
      const authTest = await fetch('/api/test-analyze', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const authResult = await authTest.text()
      
      let authData
      try {
        authData = JSON.parse(authResult)
      } catch {
        authData = { error: 'Non-JSON response', response: authResult.substring(0, 200) }
      }

      const testResults: any = {
        authTest: {
          status: authTest.status,
          data: authData
        },
        sessionInfo: {
          hasSession: !!session,
          hasAccessToken: !!session.access_token,
          userEmail: session.user?.email
        }
      }

      // If we have a test file ID, test the analyze endpoint
      if (testFileId) {
        console.log('Testing analyze endpoint with fileId:', testFileId)
        const analyzeTest = await testAnalyzeEndpoint(testFileId)
        testResults.analyzeTest = analyzeTest
      }

      setResults(testResults)

    } catch (error) {
      setResults({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">🔧 Analysis Diagnostics</h3>
        <button
          onClick={runDiagnostic}
          disabled={testing}
          className="btn-secondary text-sm"
        >
          {testing ? 'Testing...' : 'Run Diagnostic'}
        </button>
      </div>

      {results && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium text-sm mb-2">Authentication Test</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600">
        <p><strong>What this tests:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Authentication session status</li>
          <li>API endpoint accessibility</li>
          <li>Server response format</li>
          <li>Environment configuration</li>
        </ul>
      </div>
    </div>
  )
}