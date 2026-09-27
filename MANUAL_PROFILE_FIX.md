# 🔧 Manual Profile Creation Fix

The trigger isn't firing automatically. Let's manually create profiles.

---

## Step 1: Check if Users Exist in auth.users

```sql
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users
ORDER BY created_at DESC;
```

**Take note of the user IDs and emails.**

---

## Step 2: Manually Create Profiles

### Option A: If you have users in auth.users

Copy the user IDs from Step 1, then run:

```sql
-- Replace the UUIDs with actual user IDs from auth.users
DO $$
DECLARE
  v_viewer_role uuid;
  v_owner_role uuid;
BEGIN
  -- Get role IDs
  SELECT id INTO v_viewer_role FROM roles WHERE name = 'VIEWER';
  SELECT id INTO v_owner_role FROM roles WHERE name = 'OWNER';

  -- For EACH user in auth.users, create a profile
  -- Replace 'USER_ID_HERE' with actual UUID from auth.users
  
  INSERT INTO profiles (id, email, username, role_id, first_name, last_name)
  VALUES 
    (
      'PASTE_USER_ID_HERE'::uuid,  -- From auth.users
      'test@test.com',              -- Email from auth.users
      'owner',                      -- Username
      v_owner_role,                 -- OWNER role
      'Owner',
      'Demo'
    )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    role_id = EXCLUDED.role_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

END $$;
```

---

### Option B: Automatic Profile Creation for All Auth Users

This will auto-create profiles for ALL users in auth.users:

```sql
DO $$
DECLARE
  v_viewer_role uuid;
  auth_user RECORD;
  generated_username text;
BEGIN
  -- Get VIEWER role ID
  SELECT id INTO v_viewer_role FROM roles WHERE name = 'VIEWER';
  
  -- Loop through all auth.users and create profiles
  FOR auth_user IN 
    SELECT id, email FROM auth.users 
    WHERE id NOT IN (SELECT id FROM profiles)
  LOOP
    -- Generate username from email
    generated_username := LOWER(SPLIT_PART(auth_user.email, '@', 1));
    
    -- Make it unique if needed
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = generated_username) LOOP
      generated_username := generated_username || '_' || (random() * 1000)::int;
    END LOOP;
    
    -- Insert profile
    INSERT INTO profiles (id, email, username, role_id, first_name, last_name)
    VALUES (
      auth_user.id,
      auth_user.email,
      generated_username,
      v_viewer_role,
      INITCAP(SPLIT_PART(auth_user.email, '@', 1)),
      'User'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created profile for: % with username: %', auth_user.email, generated_username;
  END LOOP;
  
  RAISE NOTICE 'Profile creation complete!';
END $$;
```

---

## Step 3: Verify Profiles Were Created

```sql
SELECT 
  p.id,
  p.username,
  p.email,
  p.first_name,
  p.last_name,
  r.name as role
FROM profiles p
LEFT JOIN roles r ON p.role_id = r.id
ORDER BY p.created_at DESC;
```

**Expected:** Should see rows with usernames like "owner", "test", etc.

---

## Step 4: Upgrade Role to OWNER

```sql
UPDATE profiles 
SET role_id = (SELECT id FROM roles WHERE name = 'OWNER'),
    first_name = 'Owner',
    last_name = 'Demo'
WHERE username = 'test'  -- or whatever username was created
  OR email = 'test@test.com';
```

---

## Step 5: Final Verification

```sql
SELECT 
  au.id as user_id,
  au.email as auth_email,
  au.email_confirmed_at,
  p.username,
  p.first_name,
  p.last_name,
  r.name as role,
  r.level
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN roles r ON p.role_id = r.id
ORDER BY au.created_at DESC;
```

**Expected Output:**
```
user_id     | auth_email      | email_confirmed_at | username | first_name | role  | level
------------|-----------------|-------------------|----------|------------|-------|------
<uuid>      | test@test.com   | 2024-...          | owner    | Owner      | OWNER | 1
```

---

## 🚨 If Still Empty After Step 2

The trigger might be disabled. Let's fix it:

```sql
-- Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- If it exists but disabled (tgenabled = 'D'), enable it:
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- If it doesn't exist, recreate it:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 🎯 Complete Fresh Start (Nuclear Option)

If nothing works, start completely fresh:

```sql
-- 1. Delete all test users
DELETE FROM auth.users WHERE email LIKE '%test%';

-- 2. Verify trigger is enabled
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- 3. Now create ONE user via Dashboard:
--    Email: owner@test.com
--    Password: test123456
--    ✅ Auto Confirm User

-- 4. Check if profile auto-created
SELECT * FROM profiles WHERE email = 'owner@test.com';

-- 5. If still NULL, use Option B above to create manually
```

---

## 💡 Quick Test Script

Run this to test the trigger manually:

```sql
-- Test if trigger function works
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_email text := 'triggertest@test.com';
BEGIN
  -- Temporarily insert a test auth user
  -- (This won't work in production, just for testing logic)
  
  -- Instead, let's just test the function directly
  RAISE NOTICE 'Testing handle_new_user function...';
  
  -- Check if function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    RAISE NOTICE '✅ handle_new_user function exists';
  ELSE
    RAISE NOTICE '❌ handle_new_user function NOT FOUND!';
  END IF;
  
  -- Check if trigger exists
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    RAISE NOTICE '✅ on_auth_user_created trigger exists';
  ELSE
    RAISE NOTICE '❌ on_auth_user_created trigger NOT FOUND!';
  END IF;
  
END $$;
```

---

**Run Option B (Automatic) first - it should create profiles for all existing auth users!**
