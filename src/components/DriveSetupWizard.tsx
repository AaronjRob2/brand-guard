'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GoogleDriveSetupGuide } from './GoogleDriveSetupGuide'

interface SetupStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'checking' | 'completed' | 'failed'
  error?: string
  action?: () => Promise<void>
  details?: string[]
}

export const DriveSetupWizard = () => {
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'auth',
      title: 'User Authentication',
      description: 'Check if user is signed in',
      status: 'pending'
    },
    {
      id: 'env',
      title: 'Environment Variables',
      description: 'Check if Google API credentials are configured',
      status: 'pending'
    },
    {
      id: 'database',
      title: 'Database Tables',
      description: 'Verify drive_tokens and drive_folders tables exist',
      status: 'pending'
    },
    {
      id: 'connection',
      title: 'Drive Connection',
      description: 'Check if user has connected their Google Drive',
      status: 'pending'
    },
    {
      id: 'folder',
      title: 'Brand Guidelines Folder',
      description: 'Check if "Brand Guidelines Test" folder exists',
      status: 'pending'
    },
    {
      id: 'files',
      title: 'Brand Files',
      description: 'Check for brand guideline files in the folder',
      status: 'pending'
    }
  ])
  const [isRunning, setIsRunning] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  const updateStep = (id: string, updates: Partial<SetupStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ))
  }

  const runCompleteSetup = async () => {
    setIsRunning(true)
    
    try {
      // Step 1: Check user authentication
      updateStep('auth', { status: 'checking' })
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        updateStep('auth', { 
          status: 'failed', 
          error: 'Not signed in',
          details: ['Please sign in to your account first']
        })
        return
      }
      
      updateStep('auth', { 
        status: 'completed',
        details: [`Signed in as: ${session.user?.email}`]
      })

      // Step 2: Check environment variables via diagnostic API
      updateStep('env', { status: 'checking' })
      const diagnosticResponse = await fetch('/api/drive/diagnostic', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      let diagnosticData: any = {}
      if (diagnosticResponse.ok) {
        const responseText = await diagnosticResponse.text()
        if (responseText.trim().startsWith('{')) {
          diagnosticData = JSON.parse(responseText)
        }
      }

      if (diagnosticData.diagnostic?.googleApi) {
        const { clientIdConfigured, clientSecretConfigured } = diagnosticData.diagnostic.googleApi
        
        if (clientIdConfigured && clientSecretConfigured) {
          updateStep('env', { 
            status: 'completed',
            details: ['Google API credentials are properly configured']
          })
        } else {
          updateStep('env', { 
            status: 'failed',
            error: 'Missing Google API credentials',
            details: [
              !clientIdConfigured ? 'GOOGLE_CLIENT_ID not set' : '',
              !clientSecretConfigured ? 'GOOGLE_CLIENT_SECRET not set' : '',
              'Add these to your .env.local file'
            ].filter(Boolean)
          })
          setShowSetupGuide(true)
          return
        }
      } else {
        updateStep('env', { 
          status: 'failed',
          error: 'Could not check environment variables',
          details: ['Diagnostic API is not responding properly']
        })
        return
      }

      // Step 3: Check database tables
      updateStep('database', { status: 'checking' })
      const { drive } = diagnosticData.diagnostic || {}
      
      if (drive !== undefined) {
        updateStep('database', { 
          status: 'completed',
          details: ['Database tables are properly configured']
        })
      } else {
        updateStep('database', { 
          status: 'failed',
          error: 'Database tables missing or inaccessible',
          details: ['Run the drive_tokens migration script']
        })
        return
      }

      // Step 4: Check Drive connection
      updateStep('connection', { status: 'checking' })
      
      if (drive.tokenExists && drive.foldersConnected > 0) {
        updateStep('connection', { 
          status: 'completed',
          details: [
            `${drive.foldersConnected} Drive folder(s) connected`,
            `Available folders: ${drive.availableFolders.join(', ')}`
          ]
        })
      } else if (drive.tokenExists) {
        updateStep('connection', { 
          status: 'failed',
          error: 'Drive authenticated but no folders connected',
          details: ['Try reconnecting to Google Drive']
        })
        return
      } else {
        updateStep('connection', { 
          status: 'failed',
          error: 'Google Drive not connected',
          details: ['Click "Connect Drive" to authenticate with Google Drive']
        })
        return
      }

      // Step 5: Check Brand Guidelines folder
      updateStep('folder', { status: 'checking' })
      
      if (drive.brandGuidelinesFolder) {
        updateStep('folder', { 
          status: 'completed',
          details: ['Brand Guidelines Test folder found']
        })
      } else {
        updateStep('folder', { 
          status: 'failed',
          error: 'Brand Guidelines Test folder not found',
          details: [
            'Create a folder named exactly "Brand Guidelines Test" in your Google Drive',
            `Available folders: ${drive.availableFolders.join(', ')}`
          ]
        })
        return
      }

      // Step 6: Check for brand files
      updateStep('files', { status: 'checking' })
      
      const brandFilesResponse = await fetch('/api/drive/brand-files', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (brandFilesResponse.ok) {
        const responseText = await brandFilesResponse.text()
        if (responseText.trim().startsWith('{')) {
          const brandFilesData = JSON.parse(responseText)
          const fileCount = brandFilesData.files?.length || 0
          
          if (fileCount > 0) {
            updateStep('files', { 
              status: 'completed',
              details: [
                `Found ${fileCount} brand guideline file(s)`,
                brandFilesData.files.slice(0, 3).map((f: any) => f.name).join(', ') + 
                (fileCount > 3 ? '...' : '')
              ]
            })
          } else {
            updateStep('files', { 
              status: 'failed',
              error: 'No brand files found',
              details: [
                'Add brand guideline files to your "Brand Guidelines Test" folder',
                'Supported formats: PDF, DOC, DOCX, TXT, images'
              ]
            })
          }
        } else {
          updateStep('files', { 
            status: 'failed',
            error: 'Could not load brand files',
            details: ['API returned unexpected response format']
          })
        }
      } else {
        updateStep('files', { 
          status: 'failed',
          error: `Could not load brand files (${brandFilesResponse.status})`,
          details: ['Check API logs for more details']
        })
      }

    } catch (error) {
      console.error('Setup wizard error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed': return '✅'
      case 'failed': return '❌'
      case 'checking': return '⏳'
      default: return '⚪'
    }
  }

  const getStatusColor = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'checking': return 'text-blue-600'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">🔧 Drive Setup Wizard</h3>
          <p className="text-sm text-gray-600">
            Complete diagnosis of your Google Drive integration
          </p>
        </div>
        <button
          onClick={runCompleteSetup}
          disabled={isRunning}
          className="btn-primary text-sm"
        >
          {isRunning ? (
            <>
              <div className="animate-spin -ml-1 mr-2 h-4 w-4 rounded-full border-2 border-white border-b-transparent"></div>
              Running...
            </>
          ) : (
            '▶️ Run Complete Setup Check'
          )}
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="border rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-lg">{getStatusIcon(step.status)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${getStatusColor(step.status)}`}>
                    {step.title}
                  </h4>
                  {step.status === 'checking' && (
                    <div className="animate-spin h-4 w-4 rounded-full border-2 border-blue-500 border-b-transparent"></div>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                
                {step.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <p className="text-xs font-medium text-red-800">{step.error}</p>
                  </div>
                )}

                {step.details && step.details.length > 0 && (
                  <div className={`mt-2 p-2 rounded border ${
                    step.status === 'completed' ? 'bg-green-50 border-green-200' :
                    step.status === 'failed' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    {step.details.map((detail, index) => (
                      <p key={index} className={`text-xs ${
                        step.status === 'completed' ? 'text-green-700' :
                        step.status === 'failed' ? 'text-red-700' :
                        'text-gray-700'
                      }`}>
                        {detail}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Google Drive Setup Guide */}
      {showSetupGuide && (
        <div className="mt-6">
          <GoogleDriveSetupGuide />
        </div>
      )}
    </div>
  )
}