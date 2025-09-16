# Brand Guard Setup Instructions

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

## 2. Database Setup

Run the SQL migration in the Supabase SQL editor:
```sql
-- Copy and paste the contents of supabase/migrations/001_create_users_table.sql
```

## 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials > Create OAuth 2.0 Client ID
5. Add your domain to authorized origins
6. Add `https://your-project-ref.supabase.co/auth/v1/callback` to redirect URIs
7. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google Client ID and Secret

## 4. Run the Application

```bash
npm install
npm run dev
```

## Features Implemented

✅ Google OAuth 2.0 authentication  
✅ Domain restriction (@danielbrian.com only)  
✅ User management with roles (user/admin)  
✅ Automatic user creation on first login  
✅ Protected routes with AuthGuard  
✅ Clean login/logout UI