'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export const DriveAuthStatus = () => {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkAuthStatus = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setStatus({ error: 'Not signed in' })
        return
      }

      // Check drive tokens
      const tokensResponse = await fetch('/api/drive/diagnostic', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (tokensResponse.ok) {
        const responseText = await tokensResponse.text()
        if (responseText.trim().startsWith('{')) {
          const diagnosticData = JSON.parse(responseText)
          setStatus(diagnosticData.diagnostic || { error: 'No diagnostic data' })
        } else {
          setStatus({ error: 'API returned non-JSON response' })
        }
      } else {
        setStatus({ error: `API error: ${tokensResponse.status}` })
      }

    } catch (err) {
      setStatus({ error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const clearTokens = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        alert('Not signed in')
        return
      }

      // This would require a new API endpoint to clear tokens
      // For now, just show instructions
      alert('To clear tokens: Go to Supabase Dashboard → SQL Editor and run:\nDELETE FROM public.drive_tokens WHERE user_id = auth.uid();')
      
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">🔍 Drive Auth Status</h4>
        <div className="flex gap-2">
          <button
            onClick={checkAuthStatus}
            disabled={loading}
            className="btn-secondary text-xs"
          >
            {loading ? 'Checking...' : 'Check Status'}
          </button>
          {status && (
            <button
              onClick={() => setStatus(null)}
              className="btn-secondary text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className="text-xs font-mono bg-white p-3 rounded border">
          <div className="space-y-1">
            {status.error ? (
              <div className="text-red-600">❌ Error: {status.error}</div>
            ) : (
              <>
                <div>👤 User: {status.user?.email || 'Unknown'}</div>
                <div>🔑 Google API: {status.googleApi?.clientIdConfigured ? '✅' : '❌'} Configured</div>
                <div>🗄️ Drive Tokens: {status.drive?.tokenExists ? '✅' : '❌'} Exist</div>
                <div>📁 Drive Folders: {status.drive?.foldersConnected || 0} Connected</div>
                <div>📋 Brand Folder: {status.drive?.brandGuidelinesFolder ? '✅' : '❌'} Found</div>
                {status.drive?.availableFolders?.length > 0 && (
                  <div>📂 Available: {status.drive.availableFolders.join(', ')}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600">
        <p><strong>Next Steps:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>If tokens are missing: Click "Connect Drive" and complete OAuth</li>
          <li>If API not configured: Add Google credentials to .env.local</li>
          <li>If brand folder missing: Create "Brand Guidelines Test" in Drive</li>
        </ul>
      </div>
    </div>
  )
}