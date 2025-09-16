'use client'

import { useState } from 'react'
import * as React from 'react'
import { useAdminData } from '@/hooks/useAdminData'
import { supabase } from '@/lib/supabase'
import { BrandRules } from '@/lib/brandRules'
import { stableKey } from '@/utils/keys'

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'files' | 'rules' | 'guidelines' | 'settings' | 'email'>('dashboard')
  const { users, stats, loading, updateUserRole } = useAdminData()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {[
                  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
                  { id: 'users', name: 'Users', icon: '👥' },
                  { id: 'files', name: 'File Upload', icon: '📁' },
                  { id: 'rules', name: 'Brand Rules', icon: '📋' },
                  { id: 'guidelines', name: 'Manage Guidelines', icon: '📚' },
                  { id: 'settings', name: 'Drive Settings', icon: '⚙️' },
                  { id: 'email', name: 'Email Settings', icon: '📧' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'dashboard' | 'users' | 'files' | 'rules' | 'guidelines' | 'settings' | 'email')}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'dashboard' && <DashboardTab stats={stats} loading={loading} />}
              {activeTab === 'users' && <UsersTab users={users} loading={loading} updateUserRole={updateUserRole} />}
              {activeTab === 'files' && <FileUploadTab />}
              {activeTab === 'rules' && <BrandRulesTab />}
              {activeTab === 'guidelines' && <ManageGuidelinesTab />}
              {activeTab === 'settings' && <DriveSettingsTab />}
              {activeTab === 'email' && <EmailSettingsTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DashboardStats {
  totalUsers: number
  filesProcessed: number
  storageUsed: number
  recentActivity: Array<Record<string, unknown>>
}

interface DashboardTabProps {
  stats: DashboardStats | null
  loading: boolean
}

const DashboardTab = ({ stats, loading }: DashboardTabProps) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900">Total Users</h3>
        <p className="text-3xl font-bold text-blue-600">
          {loading ? '--' : stats?.totalUsers || 0}
        </p>
        <p className="text-sm text-blue-700">Active users</p>
      </div>
      
      <div className="bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-green-900">Files Processed</h3>
        <p className="text-3xl font-bold text-green-600">
          {loading ? '--' : stats?.filesProcessed || 0}
        </p>
        <p className="text-sm text-green-700">This month</p>
      </div>
      
      <div className="bg-purple-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-purple-900">Storage Used</h3>
        <p className="text-3xl font-bold text-purple-600">
          {loading ? '--' : stats?.storageUsed || 0}
        </p>
        <p className="text-sm text-purple-700">MB total</p>
      </div>
    </div>

    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
      <div className="text-gray-500 text-center py-8">
        No recent activity to display
      </div>
    </div>
  </div>
)

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

interface UsersTabProps {
  users: User[]
  loading: boolean
  updateUserRole: (email: string, role: 'user' | 'admin') => Promise<boolean>
}

const UsersTab = ({ users, loading, updateUserRole }: UsersTabProps) => {
  const handleRoleChange = async (email: string, newRole: 'user' | 'admin') => {
    await updateUserRole(email, newRole)
  }

  return (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
      <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
        Add User
      </button>
    </div>
    
    <div className="bg-white border rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                Loading users...
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                No users found
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.email, e.target.value as 'user' | 'admin')}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-red-600 hover:text-red-800">
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
  )
}

const FileUploadTab = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">File Upload & Management</h2>
    
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
      <div className="text-center">
        <div className="text-4xl mb-4">📁</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Brand Files</h3>
        <p className="text-gray-500 mb-4">
          Drag and drop files here, or click to select files
        </p>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
          Select Files
        </button>
      </div>
    </div>

    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Uploads</h3>
      <div className="text-gray-500 text-center py-8">
        No files uploaded yet
      </div>
    </div>
  </div>
)

const DriveSettingsTab = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Integration Settings</h2>
      
      <div className="bg-white border rounded-lg p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔧</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Integration Setup Required</h3>
          <p className="text-gray-500 mb-4">
            Configure authentication system to enable integrations.
          </p>
        </div>
      </div>
    </div>
  )
}

const BrandRulesTab = () => {
  const [brandRules, setBrandRules] = useState<BrandRules | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrandRules = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/brand-rules', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch brand rules')

      const data = await response.json()
      setBrandRules(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch brand rules')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchBrandRules()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Brand Rules</h2>
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center py-8">
            <div className="text-lg text-gray-500">Loading brand rules...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Brand Rules</h2>
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center py-8">
            <div className="text-red-600">{error}</div>
            <button 
              onClick={fetchBrandRules}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const rules = brandRules?.brandRules
  const summary = brandRules?.summary

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Brand Rules Management</h2>
        <button 
          onClick={fetchBrandRules}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh Rules
        </button>
      </div>

      {/* Rules Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rules Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary?.grammarRules || 0}</div>
            <div className="text-sm text-gray-600">Grammar Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary?.bannedWords || 0}</div>
            <div className="text-sm text-gray-600">Banned Words</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary?.approvedColors || 0}</div>
            <div className="text-sm text-gray-600">Approved Colors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{summary?.imageRestrictions || 0}</div>
            <div className="text-sm text-gray-600">Image Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{summary?.totalRules || 0}</div>
            <div className="text-sm text-gray-600">Total Rules</div>
          </div>
        </div>
      </div>

      {/* Grammar Rules */}
      {rules?.grammar && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Grammar & Writing Rules</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 font-medium">Expectations:</p>
            <p className="text-gray-800">{rules.grammar.expectations}</p>
          </div>
          {rules.grammar.rules.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 font-medium mb-2">Rules:</p>
              <ul className="space-y-1">
                {rules.grammar.rules.map((rule: string, index: number) => (
                  <li key={stableKey({rule}, index, 'grammar-rule')} className="text-gray-800 text-sm">• {rule}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Banned Words */}
      {rules?.bannedWords && rules.bannedWords.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Banned Words ({rules.bannedWords.length})</h3>
          <div className="flex flex-wrap gap-2">
            {rules.bannedWords.map((word: string, index: number) => (
              <span key={stableKey({word}, index, 'banned-word')} className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Approved Colors */}
      {rules?.approvedColors && rules.approvedColors.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Approved Colors ({rules.approvedColors.length})</h3>
          <div className="flex flex-wrap gap-3">
            {rules.approvedColors.map((color: string, index: number) => (
              <div key={stableKey({color}, index, 'approved-color')} className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-sm font-mono text-gray-700">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Restrictions */}
      {rules?.imageRestrictions && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Image Guidelines</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 font-medium">Allowed Formats:</p>
              <div className="flex space-x-2 mt-1">
                {rules.imageRestrictions.allowedFormats.map((format: string, index: number) => (
                  <span key={stableKey({format}, index, 'image-format')} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                    {format.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Size Requirements:</p>
              <p className="text-gray-800 text-sm">{rules.imageRestrictions.sizeRequirements}</p>
            </div>
            {rules.imageRestrictions.rules.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2">Rules:</p>
                <ul className="space-y-1">
                  {rules.imageRestrictions.rules.map((rule: string, index: number) => (
                    <li key={stableKey({rule}, index, 'image-rule')} className="text-gray-800 text-sm">• {rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice & Tone */}
      {rules?.voiceAndTone && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Voice & Tone Guidelines</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 font-medium">Description:</p>
              <p className="text-gray-800">{rules.voiceAndTone.description}</p>
            </div>
            {rules.voiceAndTone.examples.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2">Examples:</p>
                <ul className="space-y-1">
                  {rules.voiceAndTone.examples.map((example: string, index: number) => (
                    <li key={stableKey({example}, index, 'voice-example')} className="text-gray-800 text-sm">• {example}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Rules */}
      {rules?.additionalRules && rules.additionalRules.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Rules ({rules.additionalRules.length})</h3>
          <ul className="space-y-2">
            {rules.additionalRules.map((rule: string, index: number) => (
              <li key={stableKey({rule}, index, 'additional-rule')} className="text-gray-800 text-sm p-2 bg-gray-50 rounded">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!rules || summary?.totalRules === 0) && (
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Brand Rules Found</h3>
            <p className="text-gray-500 mb-4">
              Connect a Google Drive folder with brand guidelines to see rules here.
            </p>
            <div className="text-blue-600 font-medium">
              Connect integration to see rules
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const EmailSettingsTab = () => {
  const [testEmail, setTestEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSendTestEmail = async () => {
    setIsSending(true)
    setTestResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No auth token')

      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ testEmail: testEmail || undefined })
      })

      const result = await response.json()
      setTestResult({
        success: result.success,
        message: result.message || result.error
      })
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test email'
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Email Settings</h2>
      
      {/* Email Service Status */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Service Configuration</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Service Provider</label>
              <p className="text-gray-900">SendGrid</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <p className="text-green-600 font-medium">✅ Configured</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">From Email</label>
              <p className="text-gray-900">{process.env.SENDGRID_FROM_EMAIL || 'Not configured'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">From Name</label>
              <p className="text-gray-900">{process.env.SENDGRID_FROM_NAME || 'Brand Guard'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Email Section */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Send Test Email</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="test-email" className="block text-sm font-medium text-gray-700 mb-2">
              Test Email Address (optional)
            </label>
            <input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Leave empty to send to your own email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              If left empty, the test email will be sent to your account email
            </p>
          </div>

          <button
            onClick={handleSendTestEmail}
            disabled={isSending}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Sending...' : 'Send Test Email'}
          </button>

          {testResult && (
            <div className={`p-4 rounded-md ${
              testResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.success ? '✅' : '❌'} {testResult.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Email Template Preview */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Template Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Analysis Results Email Includes:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>✓ Compliance score with color coding</li>
              <li>✓ Summary of issues by severity</li>
              <li>✓ Detailed issue descriptions and suggestions</li>
              <li>✓ File information and analysis date</li>
              <li>✓ Download link for original file</li>
              <li>✓ Brand guidelines folder reference</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Template Features:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>✓ Professional HTML design</li>
              <li>✓ Mobile-responsive layout</li>
              <li>✓ Plain text fallback</li>
              <li>✓ Brand-consistent styling</li>
              <li>✓ Clear visual hierarchy</li>
              <li>✓ Actionable insights</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Email Configuration Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">📧 Email Configuration</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Required Environment Variables:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><code>SENDGRID_API_KEY</code> - Your SendGrid API key</li>
            <li><code>SENDGRID_FROM_EMAIL</code> - Verified sender email address</li>
            <li><code>SENDGRID_FROM_NAME</code> - Display name for emails</li>
            <li><code>NEXT_PUBLIC_APP_URL</code> - Application URL for email links</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const ManageGuidelinesTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manage Brand Guidelines</h2>
      </div>
      <div className="bg-white border rounded-lg p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Guidelines Management</h3>
          <p className="text-gray-500 mb-4">
            Set up authentication and integrations to manage brand guidelines.
          </p>
        </div>
      </div>
      {/* Guidelines Management Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-3">📚 Managing Brand Guidelines</h4>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>Best Practices:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Name files clearly (e.g., &quot;grammar-rules.txt&quot;, &quot;banned-words.json&quot;, &quot;brand-colors.txt&quot;)</li>
            <li>Use consistent formats: TXT for rules, JSON for structured data</li>
            <li>Keep files updated - changes sync automatically</li>
            <li>Organize by category: grammar, colors, voice-tone, images</li>
            <li>Include examples and explanations in your guidelines</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="font-medium">File Examples:</p>
            <ul className="text-xs mt-2 space-y-1">
              <li><code>grammar-rules.txt</code> - Writing style and grammar requirements</li>
              <li><code>banned-words.json</code> - Prohibited terms and phrases</li>
              <li><code>brand-colors.txt</code> - Approved hex color codes</li>
              <li><code>voice-tone-guide.txt</code> - Brand voice guidelines</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}