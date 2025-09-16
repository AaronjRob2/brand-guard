'use client'

import { useState } from 'react'

export const OAuthTroubleshooter = () => {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testRedirectURI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/drive/test-redirect')
      const data = await response.json()
      setTestResult(data)
    } catch (err) {
      setTestResult({ error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('📋 Copied to clipboard!')
  }

  return (
    <div className="p-6 bg-red-50 rounded-lg border border-red-300">
      <h3 className="text-lg font-semibold text-red-900 mb-4">
        🚨 OAuth redirect_uri_mismatch Troubleshooter
      </h3>

      <div className="space-y-4">
        {/* Test Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={testRedirectURI}
            disabled={loading}
            className="btn-primary text-sm"
          >
            {loading ? 'Testing...' : '🔧 Test My Redirect URI'}
          </button>
          <span className="text-sm text-red-700">
            Click to see exactly what redirect URI your app is using
          </span>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="bg-white p-4 rounded border">
            {testResult.error ? (
              <div className="text-red-600">❌ Error: {testResult.error}</div>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-100 p-3 rounded border border-yellow-300">
                  <h4 className="font-semibold text-yellow-900 mb-2">📍 Your App's Redirect URI:</h4>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-3 py-2 rounded border font-mono text-sm flex-1">
                      {testResult.redirectUri}
                    </code>
                    <button
                      onClick={() => copyToClipboard(testResult.redirectUri)}
                      className="btn-secondary text-xs"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                <div className="bg-blue-100 p-3 rounded border border-blue-300">
                  <h4 className="font-semibold text-blue-900 mb-2">🔧 Environment Details:</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Google Client ID:</strong> {testResult.environment.GOOGLE_CLIENT_ID}</div>
                    <div><strong>Google Client Secret:</strong> {testResult.environment.GOOGLE_CLIENT_SECRET}</div>
                    <div><strong>Custom Redirect URI:</strong> {testResult.environment.GOOGLE_REDIRECT_URI}</div>
                    <div><strong>App Base URL:</strong> {testResult.environment.NEXT_PUBLIC_APP_URL}</div>
                    <div><strong>Request Host:</strong> {testResult.requestInfo.host}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white p-4 rounded border">
          <h4 className="font-semibold text-red-900 mb-3">🎯 Step-by-Step Fix:</h4>
          
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>
              <strong>Copy the redirect URI above</strong> (use the 📋 Copy button)
            </li>
            
            <li>
              <strong>Go to Google Cloud Console:</strong>{' '}
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Open Credentials Page →
              </a>
            </li>
            
            <li>
              <strong>Find your OAuth 2.0 Client ID</strong> (should start with the same characters as shown above)
            </li>
            
            <li>
              <strong>Click the Edit button</strong> (pencil icon) next to your Client ID
            </li>
            
            <li>
              <strong>In "Authorized redirect URIs" section:</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Delete any incorrect URIs that look similar</li>
                <li>Add the exact URI you copied above</li>
                <li>Make sure there are no extra spaces or characters</li>
              </ul>
            </li>
            
            <li>
              <strong>Click "Save"</strong>
            </li>
            
            <li>
              <strong>Wait 5-10 minutes</strong> for Google's servers to propagate the changes
            </li>
            
            <li>
              <strong>Try "Connect Drive" again</strong>
            </li>
          </ol>
        </div>

        {/* Common Issues */}
        <div className="bg-gray-100 p-4 rounded border">
          <h4 className="font-semibold text-gray-900 mb-2">🐛 Common Issues:</h4>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li><strong>Multiple Client IDs:</strong> Make sure you're editing the correct one (check the Client ID prefix)</li>
            <li><strong>Case sensitivity:</strong> URIs are case-sensitive, copy exactly</li>
            <li><strong>Protocol mismatch:</strong> Localhost should use <code>http://</code> not <code>https://</code></li>
            <li><strong>Propagation delay:</strong> Google changes can take up to 10 minutes to take effect</li>
            <li><strong>Browser cache:</strong> Try in an incognito window or clear browser cache</li>
            <li><strong>Wrong project:</strong> Make sure you're in the correct Google Cloud project</li>
          </ul>
        </div>

        {/* Emergency Fallback */}
        <div className="bg-yellow-100 p-4 rounded border border-yellow-300">
          <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Still Not Working?</h4>
          <p className="text-sm text-yellow-800 mb-2">
            If you're still getting the error after following all steps:
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside text-yellow-800">
            <li>Try creating a completely new OAuth 2.0 Client ID in Google Cloud Console</li>
            <li>Use the new Client ID and Secret in your <code>.env.local</code> file</li>
            <li>Restart your development server</li>
            <li>Or continue using the app without Google Drive by clicking "Use Database Rules Instead"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}