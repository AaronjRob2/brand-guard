# 🚀 Brand Guard Quick Start Guide

## ⚡ Fast Setup (5-10 minutes)

### Step 1: Run the Setup Script
```bash
cd /home/aastro/brand-guard
./setup-env.sh
```
This will guide you through entering all API keys and credentials.

### Step 2: Set Up Services (in order)

#### 🗄️ Supabase (2-3 minutes)
1. Visit [supabase.com](https://supabase.com) → New Project
2. Copy Project URL and API keys to the setup script
3. Run database migrations (copy/paste SQL files in Supabase SQL Editor)

#### 🔐 Google OAuth (2-3 minutes)  
1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth credentials with redirect: `http://localhost:3000/auth/callback`
3. Copy Client ID and Secret to setup script

#### 🤖 Anthropic API (1 minute)
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create API key and copy to setup script

### Step 3: Test the Application
```bash
# Restart the dev server
npm run dev

# Visit the app
open http://localhost:3000
```

---

## 📋 Configuration Checklist

- [ ] **Supabase project created** and database migrated
- [ ] **Google OAuth app** configured with correct redirect URI
- [ ] **Anthropic API key** created with credits
- [ ] **Environment variables** updated in `.env.local`
- [ ] **Development server** restarted
- [ ] **Login test** with @danielbrian.com email successful

---

## 🧪 Quick Test Sequence

1. **Visit localhost:3000** → Should see login screen
2. **Click "Sign in with Google"** → Should redirect to Google
3. **Login with @danielbrian.com email** → Should redirect to dashboard
4. **Upload a test file** → Should process successfully
5. **Click "Analyze"** → Should generate compliance report

---

## 📚 Detailed Guides

- **CONFIGURATION-GUIDE.md** - Step-by-step service setup
- **TEST-PLAN.md** - Comprehensive testing procedures  
- **DEPLOYMENT.md** - Production deployment guide

---

## 🆘 Need Help?

### Common Issues:
- **Login fails**: Check Google OAuth redirect URI matches exactly
- **Upload fails**: Verify Supabase storage bucket is created
- **Analysis fails**: Check Anthropic API key and credits
- **Database errors**: Ensure all migration files were run

### Quick Fixes:
```bash
# Check environment variables
cat .env.local

# Check logs in browser console
# Open Developer Tools → Console

# Restart server
npm run dev
```

### Still stuck?
1. Check browser console for errors
2. Review the detailed CONFIGURATION-GUIDE.md
3. Verify all services are properly configured
4. Make sure dev server restarted after env changes

---

## 🎯 Success Criteria

✅ Can login with @danielbrian.com email  
✅ Can upload files successfully  
✅ Can run analysis and see results  
✅ Unauthorized users are blocked  
✅ All features work smoothly  

**You're ready to test Brand Guard! 🛡️**