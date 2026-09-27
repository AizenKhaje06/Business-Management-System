# 🎯 Username-Based Login Setup

Your system now supports **username + password** login instead of email!

---

## ✅ Step 1: Run the Migration

Copy and paste this SQL in **Supabase SQL Editor**:

```sql
-- Add username column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Update existing profiles with default usernames (based on email prefix)
UPDATE profiles 
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL;

-- Function to get email by username (for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM profiles WHERE LOWER(username) = LOWER(p_username) LIMIT 1;
$$;

-- Update the handle_new_user trigger to auto-generate username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_role_id uuid;
  default_username text;
BEGIN
  -- Get the VIEWER role ID
  SELECT id INTO viewer_role_id FROM roles WHERE name = 'VIEWER' LIMIT 1;

  -- Generate default username from email (part before @)
  default_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  
  -- Make username unique if it already exists
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = default_username) LOOP
    default_username := default_username || '_' || (random() * 1000)::int;
  END LOOP;

  -- Insert new profile with VIEWER role and username
  INSERT INTO public.profiles (id, email, username, role_id)
  VALUES (NEW.id, NEW.email, default_username, viewer_role_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Revoke public access then grant to authenticated/anon only
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO authenticated, anon;
```

---

## ✅ Step 2: Create Test Users

### Option A: Via Supabase Dashboard (Recommended)

1. **Authentication** → **Users** → **Add User**
2. Create these users:

```
Email: owner@test.com     → auto-generates username: owner
Email: admin@test.com     → auto-generates username: admin
Email: manager@test.com   → auto-generates username: manager
```

3. ✅ Check **"Auto Confirm User"** for each

### Option B: Manually Set Custom Usernames

If you want specific usernames:

```sql
-- After creating users, update their usernames:
UPDATE profiles SET username = 'owner' WHERE email = 'owner@test.com';
UPDATE profiles SET username = 'admin' WHERE email = 'admin@test.com';
UPDATE profiles SET username = 'manager' WHERE email = 'manager@test.com';
UPDATE profiles SET username = 'accountant' WHERE email = 'accountant@test.com';
UPDATE profiles SET username = 'staff' WHERE email = 'staff@test.com';
UPDATE profiles SET username = 'viewer' WHERE email = 'viewer@test.com';
```

---

## ✅ Step 3: Assign Roles

```sql
DO $$
DECLARE
  v_owner uuid;
  v_admin uuid;
  v_manager uuid;
  v_accountant uuid;
  v_staff uuid;
  v_viewer uuid;
BEGIN
  SELECT id INTO v_owner FROM roles WHERE name = 'OWNER';
  SELECT id INTO v_admin FROM roles WHERE name = 'ADMIN';
  SELECT id INTO v_manager FROM roles WHERE name = 'MANAGER';
  SELECT id INTO v_accountant FROM roles WHERE name = 'ACCOUNTANT';
  SELECT id INTO v_staff FROM roles WHERE name = 'STAFF';
  SELECT id INTO v_viewer FROM roles WHERE name = 'VIEWER';

  UPDATE profiles SET role_id = v_owner, first_name = 'Owner', last_name = 'Demo' WHERE username = 'owner';
  UPDATE profiles SET role_id = v_admin, first_name = 'Admin', last_name = 'Demo' WHERE username = 'admin';
  UPDATE profiles SET role_id = v_manager, first_name = 'Manager', last_name = 'Demo' WHERE username = 'manager';
  UPDATE profiles SET role_id = v_accountant, first_name = 'Accountant', last_name = 'Demo' WHERE username = 'accountant';
  UPDATE profiles SET role_id = v_staff, first_name = 'Staff', last_name = 'Demo' WHERE username = 'staff';
  UPDATE profiles SET role_id = v_viewer, first_name = 'Viewer', last_name = 'Demo' WHERE username = 'viewer';
END $$;
```

---

## ✅ Step 4: Restart Dev Server

```bash
npm run dev
```

---

## 🎉 Step 5: Login with Username!

Go to: **http://localhost:3000/login**

### Test Accounts:

```
👑 OWNER
   Username: owner
   Password: [password you set in dashboard]

👔 ADMIN
   Username: admin
   Password: [password you set in dashboard]

📊 MANAGER
   Username: manager
   Password: [password you set in dashboard]
```

**Example:**
```
Username: owner
Password: test123456
```

---

## 🔍 Verify Everything Works

Run this to check usernames were created:

```sql
SELECT 
  p.username,
  p.email,
  p.first_name,
  r.name as role,
  au.email_confirmed_at
FROM profiles p
LEFT JOIN roles r ON p.role_id = r.id
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY r.level;
```

Expected output:
```
username | email              | first_name | role       | email_confirmed_at
---------|-------------------|------------|------------|-------------------
owner    | owner@test.com    | Owner      | OWNER      | [timestamp]
admin    | admin@test.com    | Admin      | ADMIN      | [timestamp]
manager  | manager@test.com  | Manager    | MANAGER    | [timestamp]
...
```

---

## 💡 How It Works

1. User enters **username** + password
2. System calls `get_email_by_username(username)` → returns email
3. System uses email to authenticate with Supabase Auth
4. User logs in successfully!

**Benefits:**
- ✅ Users remember "owner" easier than "owner@bizmanage.com"
- ✅ More professional looking
- ✅ Still uses Supabase Auth (secure!)

---

## 🎨 Customization

### Change Username for Existing User

```sql
UPDATE profiles 
SET username = 'newusername' 
WHERE email = 'user@example.com';
```

### Check if Username is Available

```sql
SELECT EXISTS(SELECT 1 FROM profiles WHERE username = 'testuser');
-- Returns: false (available) or true (taken)
```

---

## 🆘 Troubleshooting

### "Invalid username or password"
1. Check if username exists:
   ```sql
   SELECT username, email FROM profiles WHERE username = 'owner';
   ```
2. If empty, user doesn't exist or username not set
3. Set username manually or recreate user

### Username field is NULL
```sql
-- Auto-generate usernames from emails:
UPDATE profiles 
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL;
```

### Function not found error
```sql
-- Verify function exists:
SELECT proname FROM pg_proc WHERE proname = 'get_email_by_username';
```

If empty, re-run Step 1 migration.

---

## 🎯 Quick Setup Summary

1. ✅ Run SQL migration (add username field + function)
2. ✅ Create users in Supabase Dashboard
3. ✅ Usernames auto-generate (or set custom ones)
4. ✅ Assign roles
5. ✅ Restart dev server
6. ✅ Login with: username + password

Done! 🚀
