-- ============================================================================
-- CREATE TEST USER ACCOUNTS
-- ============================================================================
-- 
-- IMPORTANT: This script creates user profiles with specific roles.
-- However, Supabase auth users MUST be created through the Supabase Dashboard
-- or Auth API first, then this script will assign them roles.
--
-- MANUAL STEPS REQUIRED:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create these accounts:
--
--    Email: owner@bizmanage.com       | Password: Password123!
--    Email: admin@bizmanage.com       | Password: Password123!
--    Email: manager@bizmanage.com     | Password: Password123!
--    Email: accountant@bizmanage.com  | Password: Password123!
--    Email: staff@bizmanage.com       | Password: Password123!
--    Email: viewer@bizmanage.com      | Password: Password123!
--
-- 3. After creating users in Supabase Dashboard, run this script to assign roles
-- ============================================================================

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

  -- Update profiles with correct roles and names
  -- Note: Profiles are auto-created by trigger when auth user is created
  
  UPDATE profiles 
  SET role_id = v_owner_role_id,
      first_name = 'Owner',
      last_name = 'User'
  WHERE email = 'owner@bizmanage.com';

  UPDATE profiles 
  SET role_id = v_admin_role_id,
      first_name = 'Admin',
      last_name = 'User'
  WHERE email = 'admin@bizmanage.com';

  UPDATE profiles 
  SET role_id = v_manager_role_id,
      first_name = 'Manager',
      last_name = 'User'
  WHERE email = 'manager@bizmanage.com';

  UPDATE profiles 
  SET role_id = v_accountant_role_id,
      first_name = 'Accountant',
      last_name = 'User'
  WHERE email = 'accountant@bizmanage.com';

  UPDATE profiles 
  SET role_id = v_staff_role_id,
      first_name = 'Staff',
      last_name = 'User'
  WHERE email = 'staff@bizmanage.com';

  UPDATE profiles 
  SET role_id = v_viewer_role_id,
      first_name = 'Viewer',
      last_name = 'User'
  WHERE email = 'viewer@bizmanage.com';

  RAISE NOTICE 'Test user profiles updated successfully!';
  RAISE NOTICE 'If no rows were updated, create the users in Supabase Dashboard first.';
  
END $$;
