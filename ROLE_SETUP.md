# Role-Based Access Control Setup

## Manual Admin Assignment

Since all users default to "user" role, you'll need to manually assign admin privileges. Here are two methods:

### Method 1: Direct Database Update (Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to Table Editor > users
3. Find the user you want to make admin
4. Edit the row and change `role` from "user" to "admin"
5. Save the changes

### Method 2: SQL Command (Supabase SQL Editor)

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin-email@danielbrian.com';
```

## Testing Role-Based Access

### As a User:
- Login with @danielbrian.com email
- Should see: Upload interface with file upload and analysis tabs
- Should NOT see: Admin dashboard, user management, drive settings

### As an Admin:
- Login with @danielbrian.com email (after role assignment)
- Should see: Full admin dashboard with 4 tabs:
  - Dashboard (statistics)
  - Users (user management with role changes)
  - File Upload (admin file management)
  - Drive Settings (Google Drive configuration)

## Role Features

### User Role:
- ✅ File upload interface
- ✅ Analysis results viewing
- ❌ User management
- ❌ Admin dashboard
- ❌ Drive settings

### Admin Role:
- ✅ All user features
- ✅ User management (view/edit roles)
- ✅ Dashboard with statistics
- ✅ File upload management
- ✅ Google Drive settings
- ✅ View all users and their roles

## API Route Protection

All admin routes are protected by middleware:
- `/api/admin/users` - Requires admin role
- `/api/admin/dashboard` - Requires admin role
- `/api/user/upload` - Requires authentication (any role)

Unauthorized access returns 403 Forbidden.

## Role Management

Admins can change user roles through the Users tab:
1. Navigate to Users tab in admin dashboard
2. Use dropdown to change user roles
3. Changes are applied immediately
4. User will see new interface on next page refresh