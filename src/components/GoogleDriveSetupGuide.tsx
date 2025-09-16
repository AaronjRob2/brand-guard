'use client'

export const GoogleDriveSetupGuide = () => {
  return (
    <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">
        🔧 Google Drive Setup Required
      </h3>
      
      <p className="text-sm text-blue-800 mb-4">
        To enable Google Drive integration, you need to set up Google API credentials. Follow these steps:
      </p>

      <div className="space-y-4">
        <div className="bg-white rounded p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Step 1: Create Google Cloud Project</h4>
          <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
            <li>Create a new project or select an existing one</li>
            <li>Enable the Google Drive API for your project</li>
          </ol>
        </div>

        <div className="bg-white rounded p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Step 2: Create OAuth 2.0 Credentials</h4>
          <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
            <li>In the Google Cloud Console, go to "Credentials"</li>
            <li>Click "Create Credentials" → "OAuth 2.0 Client IDs"</li>
            <li>Choose "Web application" as the application type</li>
            <li><strong>IMPORTANT:</strong> Add these exact authorized redirect URIs:</li>
          </ol>
          
          <div className="mt-2 p-3 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-xs font-semibold text-yellow-800 mb-2">⚠️ Copy these URIs exactly:</p>
            <div className="space-y-1">
              <div className="bg-white p-2 rounded border font-mono text-xs">
                http://localhost:3000/api/drive/callback
              </div>
              <div className="bg-white p-2 rounded border font-mono text-xs">
                https://your-domain.com/api/drive/callback
              </div>
            </div>
            <p className="text-xs text-yellow-700 mt-2">
              Replace "your-domain.com" with your actual production domain. For local development, use exactly "localhost:3000".
            </p>
          </div>
        </div>

        <div className="bg-white rounded p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Step 3: Add Environment Variables</h4>
          <p className="text-xs text-blue-700 mb-2">Add these to your <code className="bg-gray-100 px-1 rounded">.env.local</code> file:</p>
          <div className="bg-gray-100 p-3 rounded text-xs font-mono">
            <div>GOOGLE_CLIENT_ID=your_client_id_here</div>
            <div>GOOGLE_CLIENT_SECRET=your_client_secret_here</div>
            <div>GOOGLE_REDIRECT_URI=http://localhost:3000/api/drive/callback</div>
          </div>
        </div>

        <div className="bg-white rounded p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Step 4: Restart Your App</h4>
          <p className="text-xs text-blue-700">After adding the environment variables, restart your development server for changes to take effect.</p>
        </div>

        <div className="bg-white rounded p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Step 5: Create Brand Guidelines Folder</h4>
          <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
            <li>Go to your Google Drive</li>
            <li>Create a new folder named exactly: <strong>"Brand Guidelines Test"</strong></li>
            <li>Add your brand guideline files (PDF, DOC, TXT, etc.)</li>
          </ol>
        </div>
      </div>

      <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
        <h4 className="font-semibold text-red-900 mb-2">🚨 Getting "redirect_uri_mismatch" Error?</h4>
        <div className="text-xs text-red-800 space-y-2">
          <p><strong>This means your Google OAuth settings don't match your app's redirect URI.</strong></p>
          
          <div>
            <p className="font-semibold">Quick Fix:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to your Google Cloud Console → Credentials</li>
              <li>Find your OAuth 2.0 Client ID</li>
              <li>Click "Edit" (pencil icon)</li>
              <li>In "Authorized redirect URIs", make sure you have exactly:</li>
              <div className="bg-white p-2 rounded border font-mono text-xs mt-1 mb-1">
                http://localhost:3000/api/drive/callback
              </div>
              <li>Click "Save"</li>
              <li>Wait a few minutes for changes to propagate</li>
              <li>Try connecting again</li>
            </ol>
          </div>
          
          <div>
            <p className="font-semibold">Common Mistakes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Using <code>127.0.0.1</code> instead of <code>localhost</code></li>
              <li>Wrong port number (make sure it's <code>3000</code>)</li>
              <li>Missing <code>http://</code> protocol</li>
              <li>Wrong path (should be <code>/api/drive/callback</code>)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
        <p className="text-xs text-yellow-800">
          <strong>💡 Tip:</strong> You can also continue using the app without Google Drive by selecting "Use Database Rules Instead" for brand analysis.
        </p>
      </div>
    </div>
  )
}