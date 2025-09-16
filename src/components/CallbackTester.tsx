'use client'

import { useState } from 'react'

export const CallbackTester = () => {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testRoutes = async () => {
    setLoading(true)
    const results: any = {}

    // Test different routes to see which ones are accessible
    const routesToTest = [
      '/api/drive/callback/test',
      '/api/drive/test-redirect',
      '/api/drive/auth'
    ]

    for (const route of routesToTest) {
      try {
        const response = await fetch(route)
        const isJson = response.headers.get('content-type')?.includes('json')
        
        if (isJson && response.ok) {
          const data = await response.json()
          results[route] = { status: response.status, data }
        } else {
          const text = await response.text()
          results[route] = { 
            status: response.status, 
            data: text.substring(0, 200) + '...',
            isHtml: text.includes('<html')
          }
        }
      } catch (err) {
        results[route] = { 
          error: err instanceof Error ? err.message : 'Unknown error' 
        }
      }
    }

    setTestResults(results)
    setLoading(false)
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">🧪 Route Tester</h4>
        <button
          onClick={testRoutes}
          disabled={loading}
          className="btn-secondary text-xs"
        >
          {loading ? 'Testing...' : 'Test API Routes'}
        </button>
      </div>

      {testResults && (
        <div className="space-y-3">
          {Object.entries(testResults).map(([route, result]: [string, any]) => (
            <div key={route} className="bg-white p-3 rounded border">
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs font-mono">{route}</code>
                <span className={`text-xs px-2 py-1 rounded ${
                  result.error ? 'bg-red-100 text-red-800' :
                  result.status === 200 ? 'bg-green-100 text-green-800' :
                  result.status === 404 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {result.error ? 'ERROR' : `${result.status}`}
                </span>
              </div>
              
              <div className="text-xs text-gray-600">
                {result.error ? (
                  <span className="text-red-600">❌ {result.error}</span>
                ) : result.isHtml ? (
                  <span className="text-yellow-600">📄 Returns HTML (might be 404 page)</span>
                ) : (
                  <pre className="whitespace-pre-wrap">
                    {typeof result.data === 'object' ? 
                      JSON.stringify(result.data, null, 2) : 
                      result.data
                    }
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600">
        <p><strong>What this tests:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li><code>/api/drive/callback/test</code> - Tests if callback route structure works</li>
          <li><code>/api/drive/test-redirect</code> - Shows your redirect URI configuration</li>
          <li><code>/api/drive/auth</code> - Tests if auth route responds (should need authentication)</li>
        </ul>
      </div>
    </div>
  )
}