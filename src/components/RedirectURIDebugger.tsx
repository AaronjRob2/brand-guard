'use client'

import { useState } from 'react'

export const RedirectURIDebugger = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkRedirectURI = async () => {
    setLoading(true)
    try {
      // Get current page URL to determine what the app thinks the base URL is
      const currentUrl = window.location.origin
      const expectedRedirectUri = `${currentUrl}/api/drive/callback`
      
      setDebugInfo({
        currentPageUrl: window.location.href,
        detectedBaseUrl: currentUrl,
        expectedRedirectUri,
        isLocalhost: currentUrl.includes('localhost'),
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
        envVarsCheck: 'Check server console for env vars when you click Connect Drive'
      })
    } catch (err) {
      setDebugInfo({ error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-blue-900">🔧 Redirect URI Debugger</h4>
        <button
          onClick={checkRedirectURI}
          disabled={loading}
          className="btn-primary text-xs"
        >
          {loading ? 'Checking...' : 'Check My URLs'}
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-3">
          {debugInfo.error ? (
            <div className="text-red-600 text-sm">❌ {debugInfo.error}</div>
          ) : (
            <>
              <div className="bg-white p-3 rounded border">
                <h5 className="font-medium text-sm mb-2">📍 What Your App Should Use:</h5>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded flex items-center justify-between">
                  <code>{debugInfo.expectedRedirectUri}</code>
                  <button
                    onClick={() => copyToClipboard(debugInfo.expectedRedirectUri)}
                    className="btn-secondary text-xs ml-2"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div className="bg-white p-3 rounded border">
                <h5 className="font-medium text-sm mb-2">🌐 Current Environment:</h5>
                <div className="text-xs space-y-1">
                  <div><strong>Base URL:</strong> {debugInfo.detectedBaseUrl}</div>
                  <div><strong>Protocol:</strong> {debugInfo.protocol}</div>
                  <div><strong>Hostname:</strong> {debugInfo.hostname}</div>
                  <div><strong>Port:</strong> {debugInfo.port || 'default'}</div>
                  <div><strong>Is Localhost:</strong> {debugInfo.isLocalhost ? '✅ Yes' : '❌ No'}</div>
                </div>
              </div>

              <div className="bg-yellow-100 p-3 rounded border border-yellow-300">
                <h5 className="font-medium text-sm mb-2">⚙️ Google Cloud Console Setup:</h5>
                <ol className="text-xs space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Credentials</a></li>
                  <li>Find your OAuth 2.0 Client ID</li>
                  <li>Click "Edit" (pencil icon)</li>
                  <li>In "Authorized redirect URIs", add exactly:</li>
                  <div className="bg-white p-2 rounded border font-mono text-xs my-1">
                    {debugInfo.expectedRedirectUri}
                  </div>
                  <li>Click "Save" and wait 2-3 minutes</li>
                </ol>
              </div>

              <div className="bg-red-100 p-3 rounded border border-red-300">
                <h5 className="font-medium text-sm mb-2">🚨 Common Mistakes:</h5>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>Using <code>https://</code> instead of <code>http://</code> for localhost</li>
                  <li>Using <code>127.0.0.1</code> instead of <code>localhost</code></li>
                  <li>Wrong port number (yours should be {debugInfo.port || '80'})</li>
                  <li>Wrong path (should end with <code>/api/drive/callback</code>)</li>
                  <li>Extra trailing slash</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-blue-700">
        <strong>💡 Pro Tip:</strong> After updating Google Cloud Console, click "Connect Drive" and check the browser console for server-side environment variable info.
      </div>
    </div>
  )
}