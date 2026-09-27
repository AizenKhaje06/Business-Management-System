# Setup Test Accounts

This guide will help you create test accounts for all user roles in the Business Management System.

## Prerequisites

1. ✅ Supabase project created
2. ✅ Database migrations run
3. ✅ `.env.local` file configured with Supabase credentials

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Create Users in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add User"** (or **"Invite User"**)
4. Create the following accounts one by one:

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| `owner@bizmanage.com` | `Password123!` | OWNER | Full system access |
| `admin@bizmanage.com` | `Password123!` | ADMIN | User management & config |
| `manager@bizmanage.com` | `Password123!` | MANAGER | Operations & reports |
| `accountant@bizmanage.com` | `Password123!` | ACCOUNTANT | Financial records |
| `staff@bizmanage.com` | `Password123!` | STAFF | Day-to-day tasks |
| `viewer@bizmanage.com` | `Password123!` | VIEWER | Read-only access |

### Step 2: Assign Roles via SQL

After creating all users in the dashboard, run this SQL script in the Supabase SQL Editor:

```sql
-- Navigate to: Supabase Dashboard > SQL Editor > New Query
-- Copy and paste this entire block, then click RUN

DO $$
DECLARE
  v_owner_role_id uuid;
  v_admin_role_id uuid;
  v_manager_role_id uuid;
  v_accountant_role_id uuid;
  v_staff_role_id uuid;
  v_viewer_role_id uuid;
BEGIN
  -- Get role IDs
  SELECT id INTO v_owner_role_id FROM roles WHERE name = 'OWNER';
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'ADMIN';
  SELECT id INTO v_manager_role_id FROM roles WHERE name = 'MANAGER';
  SELECT id INTO v_accountant_role_id FROM roles WHERE name = 'ACCOUNTANT';
  SELECT id INTO v_staff_role_id FROM roles WHERE name = 'STAFF';
  SELECT id INTO v_viewer_role_id FROM roles WHERE name = 'VIEWER';

  -- Assign roles to users
  UPDATE profiles SET role_id = v_owner_role_id, first_name = 'Owner', last_name = 'Demo' 
  WHERE email = 'owner@bizmanage.com';
  
  UPDATE profiles SET role_id = v_admin_role_id, first_name = 'Admin', last_name = 'Demo' 
  WHERE email = 'admin@bizmanage.com';
  
  UPDATE profiles SET role_id = v_manager_role_id, first_name = 'Manager', last_name = 'Demo' 
  WHERE email = 'manager@bizmanage.com';
  
  UPDATE profiles SET role_id = v_accountant_role_id, first_name = 'Accountant', last_name = 'Demo' 
  WHERE email = 'accountant@bizmanage.com';
  
  UPDATE profiles SET role_id = v_staff_role_id, first_name = 'Staff', last_name = 'Demo' 
  WHERE email = 'staff@bizmanage.com';
  
  UPDATE profiles SET role_id = v_viewer_role_id, first_name = 'Viewer', last_name = 'Demo' 
  WHERE email = 'viewer@bizmanage.com';

  RAISE NOTICE '✅ Test user profiles updated successfully!';
END $$;
```

### Step 3: Verify

Run this query to verify all accounts were created:

```sql
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  r.name as role,
  r.level as role_level,
  p.is_active
FROM profiles p
LEFT JOIN roles r ON p.role_id = r.id
WHERE p.email LIKE '%@bizmanage.com'
ORDER BY r.level;
```

You should see all 6 test accounts with their assigned roles.

---

## Method 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed locally:

```bash
# Create users via CLI
supabase auth users create owner@bizmanage.com --password Password123!
supabase auth users create admin@bizmanage.com --password Password123!
supabase auth users create manager@bizmanage.com --password Password123!
supabase auth users create accountant@bizmanage.com --password Password123!
supabase auth users create staff@bizmanage.com --password Password123!
supabase auth users create viewer@bizmanage.com --password Password123!

# Then run the SQL script from Method 1 Step 2
```

---

## Method 3: Using the Application's Sign-Up Flow

If you enable self-registration:

1. Start the dev server: `npm run dev`
2. Go to the sign-up page (if implemented)
3. Register with the test emails
4. Manually update roles via Supabase SQL Editor (Method 1 Step 2)

---

## Testing Each Role

Once all accounts are created, test them:

### 🔑 Login Credentials

```
Owner Account:
  Email: owner@bizmanage.com
  Password: Password123!
  Expected: Full access to everything

Admin Account:
  Email: admin@bizmanage.com
  Password: Password123!
  Expected: User management, most features

Manager Account:
  Email: manager@bizmanage.com
  Password: Password123!
  Expected: Operations, reports, approvals

Accountant Account:
  Email: accountant@bizmanage.com
  Password: Password123!
  Expected: Financial records, reports

Staff Account:
  Email: staff@bizmanage.com
  Password: Password123!
  Expected: Create/view records, no approvals

Viewer Account:
  Email: viewer@bizmanage.com
  Password: Password123!
  Expected: Read-only access
```

### 🧪 What to Test

| Feature | Owner | Admin | Manager | Accountant | Staff | Viewer |
|---------|-------|-------|---------|------------|-------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Clients | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Delete Clients | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Projects | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Approve Expenses | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Export Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Audit Trail | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Troubleshooting

### "User already exists" error
- Users were already created. Skip to Method 1 Step 2 to assign roles.

### "No rows updated" after running SQL
- Users don't exist in auth.users table yet
- Create them in Supabase Dashboard first (Method 1 Step 1)

### Can't login after creating users
1. Check email confirmation settings in Supabase Dashboard
2. Go to Authentication > Settings > Email Auth
3. Disable "Confirm email" for testing
4. Or manually confirm users in Dashboard

### Users have "Viewer" role by default
- This is expected! The trigger auto-assigns VIEWER role
- Run the SQL script (Method 1 Step 2) to assign correct roles

### Wrong permissions after login
1. Clear browser cookies/localStorage
2. Logout and login again
3. Verify roles in database with the verification query

---

## Security Notes

⚠️ **These are TEST accounts only!**

- **DO NOT use these in production**
- Change all passwords before deploying
- Consider using stronger passwords (12+ characters, symbols)
- Enable MFA for production accounts
- Use different emails for production

---

## Quick Start Summary

1. Create 6 users in Supabase Dashboard (Method 1 Step 1)
2. Run SQL script to assign roles (Method 1 Step 2)
3. Login with any test account
4. Test permissions specific to each role

Done! 🎉
