# Google Drive Integration Setup

## Prerequisites

1. **Google Cloud Console Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable the Google Drive API
   - Create OAuth 2.0 credentials

2. **OAuth Configuration:**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
   - Download credentials JSON or copy Client ID and Secret

3. **Environment Variables:**
   Update `.env.local` with your Google credentials:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

4. **Database Migration:**
   Run the Drive tables migration in Supabase SQL editor:
   ```sql
   -- Copy and paste contents of supabase/migrations/002_add_drive_folders_table.sql
   ```

## How to Connect Google Drive

### As Admin:

1. **Navigate to Drive Settings:**
   - Login as admin user
   - Go to "Drive Settings" tab in admin dashboard

2. **Connect to Google Drive:**
   - Click "Connect to Google Drive"
   - Authorize Brand Guard to access your Google Drive
   - You'll be redirected back with folder selection

3. **Select Brand Folder:**
   - Choose the folder containing your brand files
   - Click "Select" to connect the folder
   - Files will be automatically synced and cached

## Supported File Types

The integration will cache content for:
- ✅ Text files (`.txt`)
- ✅ JSON files (`.json`) 
- ✅ Markdown files (`.md`)
- ✅ Any `text/*` MIME type

Other files are indexed but content is not cached.

## Example Brand Folder Structure

```
Brand Guidelines/
├── grammar.txt          # Writing style rules
├── colors.json         # Brand color palette
├── banned_words.txt    # Words to avoid
├── logo_guidelines.pdf # Logo usage rules
└── voice_tone.md      # Brand voice guide
```

## Features

### Admin Features:
- 🔗 **Connect Drive Folder** - Link any accessible Google Drive folder
- 📁 **Folder Selection** - Browse and select from available folders
- 📄 **File Preview** - View all files in connected folder
- ✅ **Content Caching** - Automatic caching of text file contents
- 🔄 **Real-time Status** - Live connection status and file counts

### File Management:
- **Automatic Sync** - Files are cached when folder is connected
- **Metadata Storage** - File names, types, sizes, and modification dates
- **Content Extraction** - Full text content for supported file types
- **Link Preservation** - Direct links to view files in Google Drive

## Security

- **Admin-Only Access** - Only admin users can connect Drive folders
- **Token Storage** - Access and refresh tokens securely stored
- **Row-Level Security** - Database policies restrict access appropriately
- **OAuth Scopes** - Limited to read-only Drive access

## API Endpoints

- `GET /api/auth/google` - Get Google OAuth URL (admin only)
- `POST /api/admin/drive/folders` - List available folders (admin only)
- `POST /api/admin/drive/connect` - Connect selected folder (admin only)
- `GET /api/admin/drive/status` - Get connection status (admin only)

## Troubleshooting

**Common Issues:**

1. **"Failed to generate auth URL"**
   - Check Google Cloud Console credentials
   - Verify environment variables are set correctly

2. **"Failed to list folders"**
   - Ensure Google Drive API is enabled
   - Check OAuth scopes include Drive access

3. **"No folders showing"**
   - Make sure you have folders in your Google Drive
   - Verify the account has access to folders

4. **"Failed to connect folder"**
   - Check folder permissions (must be accessible)
   - Verify admin role in database

**Logs:** Check browser console and server logs for detailed error messages.