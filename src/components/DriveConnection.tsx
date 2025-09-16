'use client'

import { useState, useEffect } from 'react'
import { connectDrive, handleOAuthCallback } from '@/lib/drive-oauth'

export const DriveConnection = () => {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Handle OAuth callback on page load
  useEffect(() => {
    const result = handleOAuthCallback()
    
    if (result.connected) {
      setSuccess(result.message || 'Google Drive connected successfully!')
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } else if (result.error) {
      setError(result.message || 'Failed to connect to Google Drive')
    }
  }, [])

  const handleConnect = async () => {
    try {
      setConnecting(true)
      setError(null)
      setSuccess(null)
      
      await connectDrive()
      // connectDrive will redirect, so this won't be reached normally
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect to Google Drive')
      setConnecting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Google Drive Integration</h3>
        <p className="text-sm text-gray-600">
          Connect your Google Drive to access brand guidelines and store analysis results.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center space-x-3">
            <span className="text-green-600">✅</span>
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center space-x-3">
            <span className="text-red-600">❌</span>
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            connecting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {connecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Connect Google Drive
            </>
          )}
        </button>

        {success && (
          <span className="text-sm text-green-600 font-medium">
            ✓ Connected
          </span>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>What happens when you connect:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>You'll be redirected to Google's secure consent screen</li>
          <li>You'll grant permission to read and create files in your Drive</li>
          <li>Your authentication tokens will be securely stored</li>
          <li>You'll be redirected back here upon success</li>
        </ul>
      </div>
    </div>
  )
}