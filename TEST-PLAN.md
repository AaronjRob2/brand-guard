# Brand Guard Test Plan

## 🧪 Testing Checklist

### 1. Basic Access & Authentication
- [ ] Visit `http://localhost:3000`
- [ ] Should see login screen with Google OAuth button
- [ ] Try logging in with non-@danielbrian.com email (should be rejected)
- [ ] Try logging in with @danielbrian.com email (should work)
- [ ] Verify redirect to dashboard after successful login

### 2. Dashboard Navigation  
- [ ] Verify three tabs: Upload Files, Analysis Results, Settings
- [ ] Check responsive design on different screen sizes
- [ ] Verify header shows user info and logout button

### 3. File Upload Testing
- [ ] Test drag & drop functionality
- [ ] Test file selection via button
- [ ] Try unsupported file types (should show error)
- [ ] Upload supported files: PDF, DOC, DOCX, TXT, JPG, PNG
- [ ] Verify progress indicators during upload
- [ ] Check file list displays correctly

### 4. Analysis Testing
- [ ] Switch to Analysis Results tab
- [ ] Verify uploaded files appear in the list
- [ ] Click "Analyze" button on completed files
- [ ] Watch for analysis progress indicators
- [ ] Check if results appear with compliance scores
- [ ] View detailed issues and suggestions

### 5. Admin Features (if admin user)
- [ ] Admin should see additional admin interface
- [ ] Test user management functionality
- [ ] Test brand rules configuration
- [ ] Test file queue management

### 6. Settings Tab
- [ ] Verify email preferences toggle works
- [ ] Check account information displays correctly
- [ ] Test preference saving functionality

### 7. Error Handling
- [ ] Test with poor network connection
- [ ] Try uploading very large files
- [ ] Test malformed file uploads
- [ ] Verify error messages are user-friendly

### 8. Security Testing
- [ ] Try accessing admin URLs as regular user
- [ ] Test session timeout behavior
- [ ] Verify auto-logout for unauthorized domains
- [ ] Check API endpoints require proper authentication

## 🚨 Known Issues to Watch For

1. **File Processing**: Large files may take time to process
2. **Claude API**: Requires valid Anthropic API key
3. **Google Drive**: May need OAuth setup for Drive integration
4. **Email**: SendGrid configuration needed for notifications

## 🔧 Quick Fixes if Issues Found

### If OAuth doesn't work:
```bash
# Check environment variables
cat /home/aastro/brand-guard/.env.local
```

### If file upload fails:
- Check file size limits (should be <10MB)
- Verify Supabase storage is configured
- Check browser console for errors

### If analysis fails:
- Verify ANTHROPIC_API_KEY is set
- Check Claude API credits/quota
- Review browser network tab for API errors

## 📊 Success Criteria

✅ **Basic functionality works**
✅ **Security restrictions enforced** 
✅ **File upload/analysis pipeline functional**
✅ **User interface responsive and intuitive**
✅ **Error handling graceful**

## 🐛 Found Issues?

Document any issues found during testing:

1. **Issue**: [Description]
   **Steps**: [How to reproduce]
   **Expected**: [What should happen]
   **Actual**: [What actually happens]

2. **Issue**: [Next issue...]