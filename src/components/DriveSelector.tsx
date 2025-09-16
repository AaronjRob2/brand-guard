'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface DriveFolder {
  id: string
  drive_folder_id: string
  name: string
  web_view_link: string | null
  shared: boolean
  is_active: boolean
}

interface DriveSelectorProps {
  onFolderSelect: (folderId: string, folderName: string) => void
}

export const DriveSelector = ({ onFolderSelect }: DriveSelectorProps) => {
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    loadFolders()
  }, [])

  // Check URL for success/error parameters and refresh if needed
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'drive_connected' || urlParams.get('success') === 'drive_created') {
      // Refresh folders after successful connection
      setTimeout(() => {
        loadFolders()
      }, 1000) // Small delay to ensure database is updated
    }
  }, [])

  const loadFolders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Please sign in first')
      }
      
      // Use the authenticated API endpoint instead of direct Supabase query
      const response = await fetch('/api/drive/folders', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load folders')
      }
      
      const { folders } = await response.json()
      setFolders(folders || [])
    } catch (err) {
      console.error('Error loading folders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load folders')
    } finally {
      setLoading(false)
    }
  }


  const handleConnectDrive = async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      // Get the current session token
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
      
      // Redirect to Google OAuth
      // Note: After redirect, the page will reload and useEffect will call loadFolders
      window.location.href = authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Drive')
      setIsConnecting(false)
    }
  }

  const handleFolderSelect = async (folder: DriveFolder) => {
    try {
      setLoading(true)
      setError(null)

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Please sign in first')
      }

      // Activate the selected folder
      const response = await fetch('/api/drive/activate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folderId: folder.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to activate folder')
      }

      // Reload folders to show updated active status
      await loadFolders()
      
      // Call the parent callback
      onFolderSelect(folder.id, folder.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select folder')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>Google Drive Folder</h3>
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
          <h3 className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>Google Drive Folder</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--gray-600)' }}>
            Connect your Drive folder containing brand guidelines
          </p>
        </div>
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
      </div>

      {error && (
        <div className="status-error p-4 rounded-lg border">
          <div className="flex items-start space-x-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {folders.length === 0 ? (
        <div className="text-center py-12 px-6 border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--border)' }}>
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" 
               style={{ backgroundColor: 'var(--gray-100)' }}>
            <span className="text-3xl">📁</span>
          </div>
          <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>No Drive folders connected</h3>
          <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
            Connect your Google Drive to access and select folders containing brand guidelines.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="folder-select" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Choose which folder contains your brand guidelines:
            </label>
            <div className="relative">
              <select
                id="folder-select"
                value={folders.find(f => f.is_active)?.id || ''}
                onChange={(e) => {
                  const selectedFolder = folders.find(f => f.id === e.target.value)
                  if (selectedFolder) {
                    handleFolderSelect(selectedFolder)
                  }
                }}
                className="input-field pr-10 cursor-pointer"
              >
                <option value="" disabled>
                  Select a folder...
                </option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name} {folder.shared ? '(Shared)' : ''} {folder.is_active ? '✓' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--primary)' }}>
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Show details for selected folder */}
          {(() => {
            const activeFolder = folders.find(f => f.is_active)
            if (!activeFolder) return null
            
            return (
              <div className="status-success p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--success)' }}>
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium">{activeFolder.name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                              style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                          ✓ Active
                        </span>
                        {activeFolder.shared && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                                style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                            Shared
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {activeFolder.web_view_link && (
                    <a
                      href={activeFolder.web_view_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs"
                    >
                      Open in Drive
                      <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )
          })()}

          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            <div className="flex items-start space-x-3">
              <span className="text-lg">💡</span>
              <div className="text-sm">
                <p className="font-medium">Tip:</p>
                <p className="mt-1">The selected folder will be scanned for brand guidelines files. Only one folder can be active at a time.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <p className="text-xs" style={{ color: 'var(--gray-500)' }}>
          Brand files from the selected folder will be used to analyze your uploads for compliance.
        </p>
      </div>
    </div>
  )
}