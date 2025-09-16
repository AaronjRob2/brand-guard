# Brand Guard Deployment Guide

## 🚀 Backend Deployment (Vercel)

### Prerequisites
- Vercel CLI installed: `npm i -g vercel`
- Supabase project created and configured
- Google OAuth app configured
- Anthropic API key
- SendGrid account (for emails)

### 1. Environment Variables Setup
Add these to your Vercel project settings:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic AI
ANTHROPIC_API_KEY=your-anthropic-api-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# SendGrid Email
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@danielbrian.com
```

### 2. Deploy to Vercel
```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### 3. Custom Domain Setup (Optional)
```bash
# Add custom domain
vercel domains add your-domain.com
vercel alias your-deployment-url.vercel.app your-domain.com
```

## 🌐 Frontend Configuration

### Google OAuth Redirect URLs
Add these to your Google OAuth app:
- `https://your-domain.vercel.app/auth/callback`
- `https://your-custom-domain.com/auth/callback` (if using custom domain)

### Supabase Auth Settings
Update Supabase Auth settings:
- Site URL: `https://your-domain.vercel.app`
- Redirect URLs: 
  - `https://your-domain.vercel.app/auth/callback`
  - `https://your-domain.vercel.app/**`

## 📋 Deployment Checklist

### ✅ Pre-Deployment
- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied in Supabase
- [ ] Google OAuth app configured with correct redirect URLs
- [ ] Anthropic API key has sufficient credits
- [ ] SendGrid domain verified and API key active

### ✅ Post-Deployment
- [ ] Test login with @danielbrian.com email
- [ ] Test file upload and processing
- [ ] Test Claude analysis functionality
- [ ] Test admin dashboard access
- [ ] Test email notifications
- [ ] Verify unauthorized access is blocked

### ✅ Performance & Security
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Domain restriction working (@danielbrian.com only)
- [ ] API rate limiting in place
- [ ] Error logging configured
- [ ] Monitoring set up

## 🔧 Alternative Deployment Options

### Netlify Deployment
```bash
# Build command
npm run build

# Publish directory
.next

# Environment variables
# (Same as Vercel, add in Netlify dashboard)
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Monitoring & Maintenance

### Health Checks
- API endpoints responding correctly
- Database connections healthy
- External service integrations working
- File processing queue not backed up

### Regular Maintenance
- Monitor API usage limits (Anthropic, Google, SendGrid)
- Clean up old uploaded files (if needed)
- Review user access and roles
- Update dependencies and security patches

## 🆘 Troubleshooting

### Common Issues
1. **OAuth Error**: Check redirect URLs match exactly
2. **API Errors**: Verify environment variables are set
3. **File Upload Issues**: Check file size limits and processing
4. **Email Issues**: Verify SendGrid domain verification
5. **Domain Restriction**: Ensure all validation points are working

### Logs & Debugging
- Vercel Function logs: `vercel logs`
- Supabase logs: Check Supabase dashboard
- Browser console: Check for frontend errors
- Network tab: Verify API requests are successful