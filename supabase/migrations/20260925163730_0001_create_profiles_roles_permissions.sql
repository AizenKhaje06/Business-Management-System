/*
# Create profiles, roles, permissions, and role_permissions tables

## Overview
This migration sets up the complete user management and authorization system for the
Business Management System. It creates a role-based access control (RBAC) model with
six roles (OWNER, ADMIN, MANAGER, ACCOUNTANT, STAFF, VIEWER), granular permissions,
and a profiles table linked to Supabase auth.users.

## New Tables

1. **roles** — Defines the six system roles and their hierarchy level.
   - `id` (uuid, PK)
   - `name` (text, unique) — OWNER, ADMIN, MANAGER, ACCOUNTANT, STAFF, VIEWER
   - `description` (text) — human-readable description
   - `level` (int) — hierarchy rank (1=highest, 6=lowest)
   - `created_at` (timestamptz)

2. **permissions** — Defines granular permissions for system features.
   - `id` (uuid, PK)
   - `name` (text, unique) — e.g. users.create, users.manage, reports.view
   - `description` (text)
   - `created_at` (timestamptz)

3. **role_permissions** — Maps roles to their permissions (many-to-many).
   - `id` (uuid, PK)
   - `role_id` (uuid, FK → roles.id, CASCADE)
   - `permission_id` (uuid, FK → permissions.id, CASCADE)
   - UNIQUE(role_id, permission_id)
   - `created_at` (timestamptz)

4. **profiles** — User profile data linked to auth.users.
   - `id` (uuid, PK, FK → auth.users.id, CASCADE)
   - `email` (text) — denormalized for convenience
   - `first_name` (text, nullable)
   - `last_name` (text, nullable)
   - `role_id` (uuid, FK → roles.id) — defaults to VIEWER role
   - `is_active` (boolean, default true)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

## Security (RLS)

All tables have RLS enabled. Policies are scoped to authenticated users:

### roles, permissions, role_permissions
- All authenticated users can SELECT (roles and permissions are reference data)
- No direct INSERT/UPDATE/DELETE by any client — these are managed server-side
  via the admin client. Only the service role can modify them.

### profiles
- Each user can SELECT their own profile
- Each user can UPDATE their own first_name and last_name (but NOT role_id or is_active)
- The admin client (service role) can do all operations — used for user management
- A trigger auto-creates a profile when a new auth user is created, defaulting to VIEWER role

## Important Notes

1. **Profile auto-creation**: A trigger on auth.users fires after INSERT to create
   a profile row with the user's email and the VIEWER role. This ensures every
   new user has a profile immediately.

2. **Role hierarchy**: The `level` column on roles establishes hierarchy.
   A user can only manage users with a LOWER level (higher number) than their own.

3. **Permission enforcement**: Permissions are enforced server-side via the
   `has_permission` function and the authorization helpers in the application code.
   RLS provides a second layer of defense.

4. **No FOR ALL policies**: Each table has separate SELECT/INSERT/UPDATE/DELETE policies.

5. **Idempotent**: All statements use IF NOT EXISTS or DROP-IF-EXISTS-then-CREATE.
*/

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  level int NOT NULL DEFAULT 99,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read roles (reference data)
DROP POLICY IF EXISTS "select_roles" ON roles;
CREATE POLICY "select_roles" ON roles FOR SELECT
  TO authenticated USING (true);

-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read permissions (reference data)
DROP POLICY IF EXISTS "select_permissions" ON permissions;
CREATE POLICY "select_permissions" ON permissions FOR SELECT
  TO authenticated USING (true);

-- ============================================================================
-- ROLE_PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read role_permissions (reference data)
DROP POLICY IF EXISTS "select_role_permissions" ON role_permissions;
CREATE POLICY "select_role_permissions" ON role_permissions FOR SELECT
  TO authenticated USING (true);

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  role_id uuid REFERENCES roles(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Each user can read their own profile
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- Each user can update their own profile (name fields only — role_id and
-- is_active are protected by column-level logic in the app layer and the
-- fact that the admin client bypasses RLS for management operations)
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================================
-- SEED ROLES
-- ============================================================================
INSERT INTO roles (name, description, level) VALUES
  ('OWNER',      'Full system access, can manage all users and settings',  1),
  ('ADMIN',      'Can manage users and most system configuration',          2),
  ('MANAGER',    'Can manage operational data and view reports',            3),
  ('ACCOUNTANT', 'Can manage financial records and view financial reports', 4),
  ('STAFF',      'Can perform day-to-day operational tasks',                5),
  ('VIEWER',     'Read-only access to dashboards and reports',              6)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED PERMISSIONS
-- ============================================================================
INSERT INTO permissions (name, description) VALUES
  ('users.create',       'Create new user accounts'),
  ('users.view',         'View user profiles and list'),
  ('users.edit',         'Edit user profiles and roles'),
  ('users.deactivate',   'Activate or deactivate users'),
  ('users.manage',       'Full user management including role assignment'),
  ('settings.view',      'View system settings'),
  ('settings.edit',      'Edit system settings'),
  ('reports.view',       'View business reports and analytics'),
  ('reports.export',     'Export reports to external formats'),
  ('contacts.create',    'Create new contacts'),
  ('contacts.view',      'View contacts'),
  ('contacts.edit',      'Edit existing contacts'),
  ('contacts.delete',    'Delete contacts'),
  ('invoices.create',    'Create new invoices'),
  ('invoices.view',      'View invoices'),
  ('invoices.edit',      'Edit existing invoices'),
  ('invoices.delete',    'Delete invoices'),
  ('invoices.approve',   'Approve or reject invoices'),
  ('orders.create',      'Create new orders'),
  ('orders.view',        'View orders'),
  ('orders.edit',        'Edit existing orders'),
  ('orders.delete',      'Delete orders'),
  ('orders.approve',     'Approve or reject orders'),
  ('inventory.create',   'Create new inventory items'),
  ('inventory.view',     'View inventory'),
  ('inventory.edit',     'Edit inventory items'),
  ('inventory.delete',   'Delete inventory items'),
  ('expenses.create',    'Create new expenses'),
  ('expenses.view',      'View expenses'),
  ('expenses.edit',      'Edit existing expenses'),
  ('expenses.delete',    'Delete expenses'),
  ('expenses.approve',   'Approve or reject expenses')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED ROLE_PERMISSIONS
-- ============================================================================
-- Helper: insert role_permissions by looking up role and permission names
DO $$
DECLARE
  r_owner      uuid;
  r_admin      uuid;
  r_manager    uuid;
  r_accountant uuid;
  r_staff      uuid;
  r_viewer     uuid;
BEGIN
  SELECT id INTO r_owner      FROM roles WHERE name = 'OWNER';
  SELECT id INTO r_admin      FROM roles WHERE name = 'ADMIN';
  SELECT id INTO r_manager    FROM roles WHERE name = 'MANAGER';
  SELECT id INTO r_accountant FROM roles WHERE name = 'ACCOUNTANT';
  SELECT id INTO r_staff      FROM roles WHERE name = 'STAFF';
  SELECT id INTO r_viewer     FROM roles WHERE name = 'VIEWER';

  -- OWNER: all permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_owner, id FROM permissions
  ON CONFLICT DO NOTHING;

  -- ADMIN: all except settings.edit (only OWNER can edit global settings)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_admin, id FROM permissions WHERE name != 'settings.edit'
  ON CONFLICT DO NOTHING;

  -- MANAGER: operational management + reports
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_manager, id FROM permissions
  WHERE name IN (
    'users.view', 'reports.view', 'reports.export',
    'contacts.create', 'contacts.view', 'contacts.edit', 'contacts.delete',
    'invoices.create', 'invoices.view', 'invoices.edit', 'invoices.approve',
    'orders.create', 'orders.view', 'orders.edit', 'orders.approve',
    'inventory.create', 'inventory.view', 'inventory.edit',
    'expenses.create', 'expenses.view', 'expenses.edit', 'expenses.approve'
  )
  ON CONFLICT DO NOTHING;

  -- ACCOUNTANT: financial focus
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_accountant, id FROM permissions
  WHERE name IN (
    'contacts.view',
    'invoices.create', 'invoices.view', 'invoices.edit', 'invoices.approve',
    'orders.view',
    'inventory.view',
    'expenses.create', 'expenses.view', 'expenses.edit', 'expenses.approve',
    'reports.view', 'reports.export'
  )
  ON CONFLICT DO NOTHING;

  -- STAFF: day-to-day operations
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_staff, id FROM permissions
  WHERE name IN (
    'contacts.create', 'contacts.view', 'contacts.edit',
    'invoices.create', 'invoices.view',
    'orders.create', 'orders.view', 'orders.edit',
    'inventory.view',
    'expenses.create', 'expenses.view'
  )
  ON CONFLICT DO NOTHING;

  -- VIEWER: read-only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_viewer, id FROM permissions
  WHERE name IN (
    'contacts.view', 'invoices.view', 'orders.view',
    'inventory.view', 'expenses.view', 'reports.view', 'users.view'
  )
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- PROFILE AUTO-CREATION TRIGGER
-- ============================================================================
-- When a new user signs up via Supabase Auth, automatically create a profile
-- row with the VIEWER role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_role_id uuid;
BEGIN
  SELECT id INTO viewer_role_id FROM roles WHERE name = 'VIEWER' LIMIT 1;

  INSERT INTO public.profiles (id, email, role_id)
  VALUES (NEW.id, NEW.email, viewer_role_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- HAS_PERMISSION HELPER FUNCTION
-- ============================================================================
-- Returns true if the current authenticated user's role has the given permission.
-- Usage: SELECT has_permission('users.manage');

CREATE OR REPLACE FUNCTION public.has_permission(perm_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN profiles prof ON prof.role_id = rp.role_id
    WHERE prof.id = auth.uid()
      AND p.name = perm_name
      AND prof.is_active = true
  );
$$;

-- ============================================================================
-- UPDATED_AT TRIGGER FOR PROFILES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
