'use client'

import { DriveConnection } from '@/components/DriveConnection'

export default function TestOAuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Test Google OAuth Integration
          </h1>
          
          <DriveConnection />
          
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              OAuth Flow Testing
            </h2>
            
            <div className="space-y-4 text-sm text-gray-600">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">✅ Setup Checklist:</h3>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Google Cloud Console OAuth client configured</li>
                  <li>Redirect URI: http://localhost:3000/api/google/oauth/callback</li>
                  <li>Environment variables set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)</li>
                  <li>Supabase drive_tokens table created with RLS policies</li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">🔄 OAuth Flow:</h3>
                <ol className="list-decimal list-inside space-y-1 text-yellow-800">
                  <li>Click "Connect Google Drive" button</li>
                  <li>Redirected to /api/google/oauth/start</li>
                  <li>Server generates auth URL and CSRF state</li>
                  <li>Redirected to Google consent screen</li>
                  <li>User grants permissions</li>
                  <li>Google redirects to /api/google/oauth/callback</li>
                  <li>Server exchanges code for tokens</li>
                  <li>Tokens saved to database</li>
                  <li>User redirected back with success message</li>
                </ol>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">🔒 Security Features:</h3>
                <ul className="list-disc list-inside space-y-1 text-green-800">
                  <li>CSRF protection using state parameter and cookies</li>
                  <li>Secure token storage in database with RLS</li>
                  <li>Proper error handling and user feedback</li>
                  <li>Session validation before token storage</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}