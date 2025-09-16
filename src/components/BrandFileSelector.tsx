'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DriveSetupWizard } from './DriveSetupWizard'
import { DriveAuthStatus } from './DriveAuthStatus'
import { OAuthTroubleshooter } from './OAuthTroubleshooter'
import { CallbackTester } from './CallbackTester'

interface BrandFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  downloadUrl?: string
  size?: string
}

interface BrandFolder {
  id: string
  name: string
  drive_folder_id: string
}

interface BrandFileSelectorProps {
  onFileSelect: (fileId: string, fileName: string) => void
  selectedFileId?: string
}

export const BrandFileSelector = ({ onFileSelect, selectedFileId }: BrandFileSelectorProps) => {
  const [files, setFiles] = useState<BrandFile[]>([])
  const [folder, setFolder] = useState<BrandFolder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    loadBrandFiles()
  }, [])

  // Auto-run diagnostic on mount if there are issues
  useEffect(() => {
    if (error && !diagnostic) {
      setTimeout(() => {
        runDiagnostic()
      }, 1000)
    }
  }, [error, diagnostic])

  // Check URL for success/error parameters and refresh if needed
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'drive_connected' || urlParams.get('success') === 'drive_created') {
      setTimeout(() => {
        loadBrandFiles()
      }, 1000)
    }
  }, [])

  const loadBrandFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('Authentication required - please sign in to continue')
        return
      }
      
      console.log('🔍 Loading brand files from Drive...')
      const response = await fetch('/api/drive/brand-files', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        let errorData: any = { error: `HTTP ${response.status}: ${response.statusText}` }
        
        try {
          const responseText = await response.text()
          
          // Check if response is JSON
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            errorData = JSON.parse(responseText)
          } else if (responseText.includes('<!DOCTYPE')) {
            // HTML error page returned
            errorData = { 
              error: `Server returned HTML error page (${response.status})`,
              html: responseText.substring(0, 200) + '...',
              diagnostic: 'HTML_RESPONSE'
            }
          } else {
            // Plain text or other format
            errorData = { 
              error: `Unexpected response format: ${responseText.substring(0, 100)}`,
              diagnostic: 'INVALID_RESPONSE'
            }
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorData = { 
            error: `Failed to parse server response (${response.status})`,
            diagnostic: 'PARSE_ERROR'
          }
        }
        
        console.error('❌ Brand files API error:', errorData)
        
        // Provide more specific error messages based on diagnostic
        if (errorData.diagnostic === 'NO_DRIVE_CONNECTION') {
          setError('No Google Drive connection found. Please connect to Google Drive first.')
        } else if (errorData.diagnostic === 'MISSING_BRAND_FOLDER') {
          const foldersList = errorData.availableFolders?.length > 0 
            ? `Available folders: ${errorData.availableFolders.join(', ')}`
            : 'No folders found in your connected Drive'
          setError(`Brand Guidelines Test folder not found. ${foldersList}. Please create this folder and add your brand guideline files.`)
        } else if (errorData.diagnostic === 'MISSING_DRIVE_TOKENS') {
          setError('Google Drive authentication expired or missing. Please reconnect to Google Drive.')
        } else if (errorData.diagnostic === 'HTML_RESPONSE') {
          setError(`Server error: The API returned an HTML error page instead of data. This usually indicates a server configuration issue or authentication problem. (Status: ${response.status})`)
        } else if (errorData.diagnostic === 'INVALID_RESPONSE' || errorData.diagnostic === 'PARSE_ERROR') {
          setError(`Server communication error: Received unexpected response format. This may be a temporary server issue. (Status: ${response.status})`)
        } else if (response.status === 401) {
          setError('Google Drive authentication expired. Please reconnect to Google Drive.')
        } else if (response.status === 404) {
          setError(errorData.error || 'Brand Guidelines Test folder not found in your Google Drive.')
        } else {
          setError(errorData.error || `Failed to load brand files (${response.status})`)
        }
        return
      }
      
      // Parse successful response
      let responseData
      try {
        const responseText = await response.text()
        
        if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          responseData = JSON.parse(responseText)
        } else if (responseText.includes('<!DOCTYPE')) {
          throw new Error('Server returned HTML page instead of JSON data')
        } else {
          throw new Error(`Unexpected response format: ${responseText.substring(0, 100)}`)
        }
      } catch (parseError) {
        console.error('Failed to parse successful response:', parseError)
        setError(`Server returned invalid data format. This may be a server configuration issue.`)
        return
      }

      const { files: brandFiles, folder: brandFolder } = responseData
      console.log('✅ Brand files loaded:', { files: brandFiles?.length || 0, folder: brandFolder?.name })
      setFiles(brandFiles || [])
      setFolder(brandFolder)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('❌ Error loading brand files:', err)
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          setError('Connection error - please check your internet connection and try again')
        } else {
          setError(err.message)
        }
      } else {
        setError('An unexpected error occurred while loading brand files')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshFiles = async () => {
    setRefreshing(true)
    setError(null)
    
    try {
      console.log('🔄 Refreshing brand files from Drive...')
      await loadBrandFiles()
      setLastRefresh(new Date())
      console.log('✅ Files refreshed successfully')
    } catch (error) {
      console.error('❌ Error refreshing files:', error)
      setError('Failed to refresh files. Please try again.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleConnectDrive = async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Please sign in first')
      }
      
      const response = await fetch('/api/drive/auth', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initialize Google Drive connection')
      }
      
      const { authUrl } = await response.json()
      window.location.href = authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Drive')
      setIsConnecting(false)
    }
  }

  const runDiagnostic = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setDiagnostic({ error: 'Please sign in first' })
        setShowDiagnostic(true)
        return
      }
      
      const response = await fetch('/api/drive/diagnostic', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      let diagnosticData
      try {
        const responseText = await response.text()
        
        if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          diagnosticData = JSON.parse(responseText)
        } else {
          diagnosticData = { 
            error: `Diagnostic API returned unexpected format (${response.status}): ${responseText.substring(0, 100)}...`
          }
        }
      } catch (parseError) {
        diagnosticData = { 
          error: `Failed to parse diagnostic response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        }
      }
      
      setDiagnostic(diagnosticData)
      setShowDiagnostic(true)
    } catch (err) {
      setDiagnostic({ error: 'Failed to run diagnostic' })
      setShowDiagnostic(true)
    }
  }

  const formatFileSize = (sizeStr?: string) => {
    if (!sizeStr) return ''
    const size = parseInt(sizeStr)
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string) => {
    // Images
    if (mimeType.startsWith('image/')) {
      if (mimeType === 'image/svg+xml') return '🎨'
      return '🖼️'
    }
    
    // PDFs
    if (mimeType === 'application/pdf') return '📄'
    
    // Documents
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝'
    if (mimeType === 'application/vnd.google-apps.document') return '📝'
    if (mimeType.includes('opendocument.text')) return '📝'
    
    // Presentations
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊'
    if (mimeType === 'application/vnd.google-apps.presentation') return '📊'
    
    // Spreadsheets
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📈'
    if (mimeType === 'application/vnd.google-apps.spreadsheet') return '📈'
    
    // Text files
    if (mimeType.startsWith('text/')) {
      if (mimeType === 'text/html') return '🌐'
      if (mimeType === 'text/css') return '🎨'
      if (mimeType === 'text/markdown') return '📋'
      return '📄'
    }
    
    // Data files
    if (mimeType === 'application/json') return '🔧'
    if (mimeType.includes('xml')) return '📋'
    
    // Archives
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦'
    
    // Adobe files
    if (mimeType.includes('photoshop')) return '🎨'
    if (mimeType === 'application/postscript') return '🎨'
    
    // RTF
    if (mimeType.includes('rtf')) return '📝'
    
    // Default
    return '📄'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>Brand Guidelines</h3>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>Brand Guidelines</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--gray-600)' }}>
            Select which brand guidelines to use for analysis
          </p>
        </div>
        {!folder && (
          <button
            onClick={handleConnectDrive}
            disabled={isConnecting}
            className="btn-primary text-sm"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 rounded-full border-2 border-white border-b-transparent"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Connect Drive
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="status-error p-4 rounded-lg border">
          <div className="flex items-start space-x-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{error}</p>
              
              {/* Specific help for different error types */}
              {error.includes('authentication expired') && (
                <div className="mt-3 p-3 rounded bg-yellow-50 border border-yellow-200">
                  <p className="text-xs font-medium text-yellow-800">How to fix:</p>
                  <ol className="text-xs mt-1 text-yellow-700 list-decimal list-inside space-y-1">
                    <li>Click the &quot;Connect Drive&quot; button above</li>
                    <li>Sign in to your Google account again</li>
                    <li>Grant permissions to access your Google Drive</li>
                  </ol>
                </div>
              )}
              
              {error.includes('Brand Guidelines Test folder not found') && (
                <div className="mt-3 p-3 rounded bg-blue-50 border border-blue-200">
                  <p className="text-xs font-medium text-blue-800">Setup required:</p>
                  <ol className="text-xs mt-1 text-blue-700 list-decimal list-inside space-y-1">
                    <li>Go to your Google Drive</li>
                    <li>Create a new folder named exactly: &quot;Brand Guidelines Test&quot;</li>
                    <li>Add your brand guideline files (PDF, DOC, TXT, etc.)</li>
                    <li>Return here and refresh</li>
                  </ol>
                </div>
              )}
              
              {error.includes('Authentication required') && (
                <div className="mt-3 p-3 rounded bg-red-50 border border-red-200">
                  <p className="text-xs font-medium text-red-800">Please sign in first:</p>
                  <p className="text-xs mt-1 text-red-700">
                    You need to be logged in to access Google Drive integration.
                  </p>
                </div>
              )}

              {error.includes('Connection error') && (
                <div className="mt-3 p-3 rounded bg-gray-50 border border-gray-200">
                  <p className="text-xs font-medium text-gray-800">Troubleshooting:</p>
                  <ul className="text-xs mt-1 text-gray-700 list-disc list-inside space-y-1">
                    <li>Check your internet connection</li>
                    <li>Try refreshing the page</li>
                    <li>Clear browser cache if the problem persists</li>
                  </ul>
                </div>
              )}

              {(error.includes('HTML error page') || error.includes('unexpected response format') || error.includes('invalid data format')) && (
                <div className="mt-3 p-3 rounded bg-red-50 border border-red-200">
                  <p className="text-xs font-medium text-red-800">Server Issue Detected:</p>
                  <ul className="text-xs mt-1 text-red-700 list-disc list-inside space-y-1">
                    <li>The server returned an HTML error page instead of data</li>
                    <li>This usually indicates a server configuration issue</li>
                    <li>Try running the diagnostic tool below</li>
                    <li>If the problem persists, check server logs</li>
                  </ul>
                </div>
              )}

              {/* Debug diagnostic button for troubleshooting */}
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={runDiagnostic}
                  className="btn-secondary text-xs"
                >
                  🔧 Quick Diagnostic
                </button>
                <button
                  onClick={() => setShowSetupWizard(true)}
                  className="btn-primary text-xs"
                >
                  🧙‍♂️ Setup Wizard
                </button>
                <button
                  onClick={() => setError(null)}
                  className="btn-secondary text-xs"
                >
                  ✕ Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Results */}
      {showDiagnostic && diagnostic && (
        <div className="p-4 rounded-lg border bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">🔧 System Diagnostic</h4>
            <button
              onClick={() => setShowDiagnostic(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </button>
          </div>
          
          {diagnostic.error ? (
            <p className="text-sm text-red-600">{diagnostic.error}</p>
          ) : (
            <div className="space-y-3">
              <div className="text-xs">
                <p><strong>User:</strong> {diagnostic.diagnostic.user.email}</p>
                <p><strong>Google API:</strong> {diagnostic.diagnostic.googleApi.clientIdConfigured ? '✅' : '❌'} Client configured</p>
                <p><strong>Drive Folders:</strong> {diagnostic.diagnostic.drive.foldersConnected} connected</p>
                <p><strong>Brand Folder:</strong> {diagnostic.diagnostic.drive.brandGuidelinesFolder ? '✅' : '❌'}</p>
                <p><strong>Auth Tokens:</strong> {diagnostic.diagnostic.drive.tokenExists ? '✅' : '❌'}</p>
              </div>
              
              {diagnostic.recommendations && diagnostic.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2">Recommendations:</p>
                  {diagnostic.recommendations.map((rec: any, index: number) => (
                    <div key={index} className={`text-xs p-2 rounded mb-1 ${
                      rec.type === 'error' ? 'bg-red-100 text-red-800' :
                      rec.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      rec.type === 'success' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      <p className="font-medium">{rec.message}</p>
                      <p className="mt-1">{rec.action}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Google Drive Setup Wizard</h3>
              <button
                onClick={() => setShowSetupWizard(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4">
              <DriveSetupWizard />
            </div>
          </div>
        </div>
      )}

      {/* Auth Status Checker - shown when there are errors */}
      {error && (
        <div className="mt-4 space-y-4">
          <DriveAuthStatus />
          <CallbackTester />
          
          {/* Show comprehensive OAuth troubleshooter for OAuth errors */}
          {(error.includes('redirect_uri') || error.includes('OAuth') || error.includes('authentication')) && (
            <OAuthTroubleshooter />
          )}
        </div>
      )}

      {folder && files.length === 0 && (
        <div className="space-y-4">
          <div className="text-center py-12 px-6 border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--border)' }}>
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" 
                 style={{ backgroundColor: 'var(--gray-100)' }}>
              <span className="text-3xl">📄</span>
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>No brand files found</h3>
            <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
              Add brand guideline files to your &quot;Brand Guidelines Test&quot; folder in Google Drive.
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--gray-500)' }}>
              Supported formats: PDF, Word/Google Docs, PowerPoint/Slides, Excel/Google Sheets (with full content analysis), images (JPG, PNG, GIF, WebP, SVG), text files (TXT, MD, HTML, CSS, RTF), JSON, XML, and archive files
            </p>
            <div className="mt-4">
              <button
                onClick={handleRefreshFiles}
                disabled={refreshing || loading}
                className="btn-primary text-sm flex items-center space-x-2 mx-auto"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Checking for files...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Check for New Files</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--gray-50)', borderColor: 'var(--border)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Alternative: Use Database Rules</p>
            <p className="text-xs" style={{ color: 'var(--gray-600)' }}>
              You can still analyze files using the default brand rules stored in the database. Simply proceed to upload your content without selecting a brand file.
            </p>
          </div>
        </div>
      )}

      {!folder && !error && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--gray-50)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>No Google Drive Connected</p>
          <p className="text-xs mb-3" style={{ color: 'var(--gray-600)' }}>
            Connect Google Drive to select specific brand guideline files, or continue with database-stored rules.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onFileSelect('', 'Database Rules (Fallback)')}
              className="btn-secondary text-xs"
            >
              Use Database Rules Instead
            </button>
            <button
              onClick={() => setShowSetupWizard(true)}
              className="btn-primary text-xs"
            >
              🧙‍♂️ Setup Guide
            </button>
          </div>
        </div>
      )}

      {folder && files.length > 0 && (
        <div className="space-y-4">
          <div className="status-success p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--success)' }}>
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <div>
                  <p className="text-sm font-medium">{folder.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--success-dark)' }}>
                    {files.length} brand guideline file{files.length !== 1 ? 's' : ''} found
                  </p>
                  {lastRefresh && (
                    <p className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleRefreshFiles}
                disabled={refreshing || loading}
                className="btn-secondary text-xs flex items-center space-x-1"
                title="Check for new files in your Google Drive folder"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="file-select" className="block text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
              Choose brand guidelines to use for analysis:
            </label>
            <div className="grid gap-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedFileId === file.id 
                      ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                  onClick={() => onFileSelect(file.id, file.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-xl">{getFileIcon(file.mimeType)}</span>
                      <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                        {file.name}
                      </p>
                    </div>
                    {selectedFileId === file.id && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            <div className="flex items-start space-x-3">
              <span className="text-lg">💡</span>
              <div className="text-sm">
                <p className="font-medium">How it works:</p>
                <p className="mt-1">
                  Select a brand guidelines file above. When you upload content for analysis, it will be compared against the selected brand guidelines to check for compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}