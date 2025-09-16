'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export const QuickAnalysisTest = ({ fileId }: { fileId: string }) => {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testAnalysisWithoutBrandFile = async () => {
    setTesting(true)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setResult({ error: 'No authentication session' })
        return
      }

      console.log('🧪 Testing analysis without brand file for fileId:', fileId)

      // Test analysis without brand file (should use database rules)
      const response = await fetch(`/api/user/files/${fileId}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Empty body = no brand file
      })

      const responseText = await response.text()
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch {
        data = { 
          error: 'Non-JSON response', 
          response: responseText.substring(0, 300),
          status: response.status
        }
      }

      setResult({
        status: response.status,
        ok: response.ok,
        data: data
      })

    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Test failed'
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-yellow-900">🧪 Quick Analysis Test</h3>
        <button
          onClick={testAnalysisWithoutBrandFile}
          disabled={testing}
          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Analysis (No Brand File)'}
        </button>
      </div>

      <p className="text-sm text-yellow-800 mb-3">
        This will test analysis using database rules instead of brand file parsing.
        File ID: <code className="bg-yellow-100 px-1 rounded">{fileId}</code>
      </p>

      {result && (
        <div className="bg-white p-3 rounded border">
          <pre className="text-xs overflow-auto max-h-64">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}