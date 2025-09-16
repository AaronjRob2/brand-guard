# Brand Guard Configuration Guide

## 🗄️ 1. Supabase Setup

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login and click "New Project"
3. Choose organization, name your project "brand-guard"
4. Select a region close to your users
5. Create strong database password and save it

### Get Supabase Credentials
1. Go to Project Settings → API
2. Copy these values:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon public key**: `eyJhbGciOi...` (starts with eyJ)
   - **Service role key**: `eyJhbGciOi...` (different from anon key)

### Run Database Migrations
1. Go to SQL Editor in Supabase dashboard
2. Run each migration file from `/supabase/migrations/` in order:
   - `001_create_users_table.sql`
   - `002_add_drive_folders_table.sql` 
   - `003_add_uploaded_files_table.sql`
   - `004_add_analysis_results_table.sql`
   - `005_add_caching_optimization.sql`
   - `006_add_email_preferences.sql`

### Configure Storage
1. Go to Storage in Supabase dashboard
2. Create bucket named "uploads"
3. Set bucket to private (files accessible only to authenticated users)

---

## 🔐 2. Google OAuth Setup

### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing one
3. Enable Google+ API and Google Drive API

### Configure OAuth Consent Screen
1. Go to APIs & Services → OAuth consent screen
2. Choose "External" user type
3. Fill in application details:
   - **App name**: Brand Guard
   - **User support email**: your-email@danielbrian.com
   - **Developer email**: your-email@danielbrian.com
4. Add scopes: `email`, `profile`, `openid`
5. Add test users: your-email@danielbrian.com

### Create OAuth Credentials
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Name: "Brand Guard Web Client"
5. Authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.vercel.app/auth/callback` (for production)
6. Save and copy:
   - **Client ID**: `123456789-abc.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-abcdef123456`

---

## 🤖 3. Anthropic API Setup

### Get API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up/login to your account
3. Go to API Keys section
4. Click "Create Key"
5. Name it "Brand Guard" and copy the key: `sk-ant-api03-...`

### Add Credits (If Needed)
1. Go to Billing section
2. Add payment method
3. Purchase credits for API usage
4. Typical usage: $0.01-0.10 per analysis

---

## 📧 4. SendGrid Setup (Optional)

### Create SendGrid Account
1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up for free account
3. Verify your email address

### Create API Key
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Choose "Full Access" or create restricted key with Mail Send permissions
4. Name: "Brand Guard" and copy key: `SG.abc123...`

### Verify Sender Identity
1. Go to Settings → Sender Authentication
2. Verify single sender: `noreply@danielbrian.com`
3. Or verify entire domain: `danielbrian.com`

---

## 🔧 5. Configure Environment Variables

Update your `.env.local` file with the actual values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth Configuration  
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdef123456
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Anthropic AI Configuration
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# SendGrid Configuration (Optional)
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@danielbrian.com
SENDGRID_FROM_NAME=Brand Guard

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✅ 6. Verification Steps

### Test Database Connection
```bash
# Check if Supabase is accessible
curl -H "apikey: your-anon-key" https://your-project.supabase.co/rest/v1/users
```

### Test Google OAuth
1. Visit your app at localhost:3000
2. Click "Sign in with Google"  
3. Should redirect to Google OAuth screen
4. Should show only @danielbrian.com domain

### Test Anthropic API
```bash
# Test API key (replace with your key)
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: sk-ant-api03-your-key" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

### Test SendGrid (Optional)
```bash
# Test API key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer SG.your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@danielbrian.com"}]}],"from":{"email":"noreply@danielbrian.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test email"}]}'
```

---

## 🚨 Troubleshooting

### Common Issues:
1. **Supabase RLS**: Make sure Row Level Security policies are set up
2. **Google OAuth**: Redirect URIs must match exactly
3. **CORS**: Add your domain to Supabase CORS settings
4. **API Keys**: Double-check all keys are copied correctly

### Need Help?
- Check browser console for errors
- Review Supabase logs
- Verify all environment variables are set
- Restart dev server after changing .env.local