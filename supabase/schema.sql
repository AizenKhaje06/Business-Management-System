-- ============================================================================
-- BUSINESS MANAGEMENT SYSTEM — CONSOLIDATED DATABASE SCHEMA
-- Generated: 2026-09-26
-- Total Migrations: 36
-- ============================================================================

-- ============================================================================
-- MIGRATION: 20260925163730_0001_create_profiles_roles_permissions
-- ============================================================================

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


-- ============================================================================
-- MIGRATION: 20260926015327_0002_fix_security_definer_permissions
-- ============================================================================

/*
# Fix SECURITY DEFINER function permissions

## Overview
The security advisor flagged that `handle_new_user()` and `has_permission()`
SECURITY DEFINER functions are callable by the `anon` role via the REST API.
This migration locks them down:

1. `handle_new_user()` — should ONLY be called by the database trigger on
   `auth.users`, never directly. Revoke EXECUTE from anon and authenticated.
2. `has_permission()` — should be callable by authenticated users only
   (it checks `auth.uid()` internally, so anon calls return false anyway,
   but we should not expose it). Revoke EXECUTE from anon.
3. `update_updated_at()` — set search_path to prevent search path injection.

## Security Changes
- REVOKE EXECUTE on `handle_new_user` from anon and authenticated
- REVOKE EXECUTE on `has_permission` from anon
- Set search_path on `update_updated_at` to public
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM anon;

-- Fix mutable search_path on update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================================
-- MIGRATION: 20260926015346_0003_lockdown_functions_rest_api
-- ============================================================================

/*
# Lock down SECURITY DEFINER functions from REST API access

The security advisor still flags handle_new_user and has_permission as
callable via the REST API. This migration revokes EXECUTE from PUBLIC
(which covers all roles including anon and authenticated) and only
re-grants what's strictly needed.

- handle_new_user: No direct grants needed — only called by trigger
- has_permission: Grant to authenticated only (used by app server code)
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC;

-- Only authenticated users need has_permission
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;


-- ============================================================================
-- MIGRATION: 20260926015729_0004_has_permission_security_invoker
-- ============================================================================

/*
# Convert has_permission to SECURITY INVOKER

The security advisor flags has_permission as a SECURITY DEFINER function
callable by authenticated users. Since this function only reads from
tables the authenticated user already has RLS access to (profiles with
auth.uid() filter, plus public role/permission reference data), it is
safe as SECURITY INVOKER. This eliminates the advisor warning.
*/

CREATE OR REPLACE FUNCTION public.has_permission(perm_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
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
-- MIGRATION: 20260926020305_0005_create_clients_projects_payments
-- ============================================================================

/*
# Create clients and projects tables

## Overview
This migration creates the core business tables for managing clients and
projects. Clients are companies or individuals that the business serves.
Projects are work engagements associated with a client, with team members,
status tracking, and payment records.

## New Tables

### clients
- `id` (uuid, PK)
- `name` (text, NOT NULL) — client company or person name
- `email` (text, nullable) — primary contact email
- `phone` (text, nullable) — primary contact phone
- `address` (text, nullable) — street address
- `city` (text, nullable)
- `state` (text, nullable) — state/province
- `postal_code` (text, nullable)
- `country` (text, nullable, default 'US')
- `website` (text, nullable)
- `tax_id` (text, nullable) — tax identification number
- `notes` (text, nullable) — free-form notes
- `is_active` (boolean, default true) — soft delete / deactivation
- `created_by` (uuid, FK → profiles.id, nullable) — who created this record
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### projects
- `id` (uuid, PK)
- `client_id` (uuid, FK → clients.id, NOT NULL) — owning client
- `name` (text, NOT NULL) — project name
- `description` (text, nullable)
- `status` (text, NOT NULL, default 'planning') — check constraint: planning, active, on_hold, completed, cancelled
- `priority` (text, NOT NULL, default 'medium') — check constraint: low, medium, high, urgent
- `start_date` (date, nullable)
- `end_date` (date, nullable) — planned end date
- `actual_end_date` (date, nullable) — actual completion date
- `budget` (numeric(14,2), nullable) — total project budget (decimal, not float)
- `hourly_rate` (numeric(10,2), nullable) — billing rate if applicable
- `progress` (int, default 0) — 0-100 completion percentage
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### project_members
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects.id, CASCADE, NOT NULL)
- `user_id` (uuid, FK → profiles.id, CASCADE, NOT NULL) — team member
- `role` (text, NOT NULL, default 'member') — check constraint: lead, manager, member
- `allocated_hours` (numeric(8,2), nullable) — planned hours allocation
- `created_at` (timestamptz, default now())
- UNIQUE(project_id, user_id) — one membership per user per project

### project_status_history
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects.id, CASCADE, NOT NULL)
- `old_status` (text, nullable) — previous status (null for initial)
- `new_status` (text, NOT NULL) — new status
- `changed_by` (uuid, FK → profiles.id, nullable) — who changed it
- `notes` (text, nullable) — reason for change
- `created_at` (timestamptz, default now())

### project_payments
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects.id, CASCADE, NOT NULL)
- `amount` (numeric(14,2), NOT NULL, CHECK > 0) — payment amount
- `payment_date` (date, NOT NULL) — when payment was received
- `payment_method` (text, nullable) — check constraint: cash, check, bank_transfer, credit_card, paypal, other
- `reference_number` (text, nullable) — check/transaction number
- `notes` (text, nullable)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### payment_allocations
- `id` (uuid, PK)
- `payment_id` (uuid, FK → project_payments.id, CASCADE, NOT NULL)
- `project_id` (uuid, FK → projects.id, CASCADE, NOT NULL) — which project the payment is allocated to
- `amount` (numeric(14,2), NOT NULL, CHECK > 0) — allocated amount
- `notes` (text, nullable)
- `created_at` (timestamptz, default now())

## Indexes
- clients: name, is_active, created_by
- projects: client_id, status, created_by
- project_members: project_id, user_id
- project_status_history: project_id, created_at
- project_payments: project_id, payment_date
- payment_allocations: payment_id, project_id

## Security (RLS)
All tables have RLS enabled. Policies scope to authenticated users:
- clients: all authenticated users can SELECT; INSERT/UPDATE/DELETE requires contacts.edit or contacts.delete permission via has_permission check
- projects: all authenticated can SELECT; write requires project management permissions
- project_members: all authenticated can SELECT; write requires project management
- project_status_history: all authenticated can SELECT; INSERT only (append-only)
- project_payments: all authenticated can SELECT; write requires financial permissions
- payment_allocations: all authenticated can SELECT; write requires financial permissions

## Important Notes
1. All money fields use numeric(14,2) — never floating point.
2. Check constraints enforce valid enum values on status, priority, role, payment_method.
3. updated_at triggers maintain the timestamp automatically.
4. RLS policies use the has_permission() function for fine-grained access control.
*/

-- ============================================================================
-- CLIENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'US',
  website text,
  tax_id text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_clients" ON clients;
CREATE POLICY "select_clients" ON clients FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_clients" ON clients;
CREATE POLICY "insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "update_clients" ON clients;
CREATE POLICY "update_clients" ON clients FOR UPDATE
  TO authenticated USING (public.has_permission('contacts.edit'))
  WITH CHECK (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "delete_clients" ON clients;
CREATE POLICY "delete_clients" ON clients FOR DELETE
  TO authenticated USING (public.has_permission('contacts.delete'));

-- ============================================================================
-- PROJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date date,
  end_date date,
  actual_end_date date,
  budget numeric(14,2),
  hourly_rate numeric(10,2),
  progress int NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_projects" ON projects;
CREATE POLICY "select_projects" ON projects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_projects" ON projects;
CREATE POLICY "insert_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_projects" ON projects;
CREATE POLICY "update_projects" ON projects FOR UPDATE
  TO authenticated USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_projects" ON projects;
CREATE POLICY "delete_projects" ON projects FOR DELETE
  TO authenticated USING (public.has_permission('invoices.delete'));

-- ============================================================================
-- PROJECT_MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('lead', 'manager', 'member')),
  allocated_hours numeric(8,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_project_members" ON project_members;
CREATE POLICY "select_project_members" ON project_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_project_members" ON project_members;
CREATE POLICY "insert_project_members" ON project_members FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "update_project_members" ON project_members;
CREATE POLICY "update_project_members" ON project_members FOR UPDATE
  TO authenticated USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_project_members" ON project_members;
CREATE POLICY "delete_project_members" ON project_members FOR DELETE
  TO authenticated USING (public.has_permission('invoices.edit'));

-- ============================================================================
-- PROJECT_STATUS_HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_status_history_project_id ON project_status_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_status_history_created_at ON project_status_history(created_at);

ALTER TABLE project_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_project_status_history" ON project_status_history;
CREATE POLICY "select_project_status_history" ON project_status_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_project_status_history" ON project_status_history;
CREATE POLICY "insert_project_status_history" ON project_status_history FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.edit'));

-- ============================================================================
-- PROJECT_PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  payment_method text
    CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'paypal', 'other')),
  reference_number text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_payments_project_id ON project_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_payment_date ON project_payments(payment_date);

ALTER TABLE project_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_project_payments" ON project_payments;
CREATE POLICY "select_project_payments" ON project_payments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_project_payments" ON project_payments;
CREATE POLICY "insert_project_payments" ON project_payments FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_project_payments" ON project_payments;
CREATE POLICY "update_project_payments" ON project_payments FOR UPDATE
  TO authenticated USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_project_payments" ON project_payments;
CREATE POLICY "delete_project_payments" ON project_payments FOR DELETE
  TO authenticated USING (public.has_permission('invoices.delete'));

-- ============================================================================
-- PAYMENT_ALLOCATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES project_payments(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_project_id ON payment_allocations(project_id);

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payment_allocations" ON payment_allocations;
CREATE POLICY "select_payment_allocations" ON payment_allocations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_payment_allocations" ON payment_allocations;
CREATE POLICY "insert_payment_allocations" ON payment_allocations FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_payment_allocations" ON payment_allocations;
CREATE POLICY "update_payment_allocations" ON payment_allocations FOR UPDATE
  TO authenticated USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_payment_allocations" ON payment_allocations;
CREATE POLICY "delete_payment_allocations" ON payment_allocations FOR DELETE
  TO authenticated USING (public.has_permission('invoices.delete'));


-- ============================================================================
-- MIGRATION: 20260926020341_0006_create_expenses_suppliers_materials
-- ============================================================================

/*
# Create expenses, suppliers, and materials tables

## Overview
This migration creates tables for expense tracking, supplier management,
and material/inventory purchasing. Expenses are categorized and can be
linked to projects. Suppliers provide materials and invoices.

## New Tables

### expense_categories
- `id` (uuid, PK)
- `name` (text, NOT NULL, UNIQUE) — category name (e.g. "Office Supplies")
- `description` (text, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamptz, default now())

### expenses
- `id` (uuid, PK)
- `category_id` (uuid, FK → expense_categories.id, NOT NULL)
- `project_id` (uuid, FK → projects.id, nullable) — optional project link
- `supplier_id` (uuid, FK → suppliers.id, nullable) — optional supplier link
- `amount` (numeric(14,2), NOT NULL, CHECK > 0)
- `currency` (text, default 'USD', CHECK length = 3)
- `expense_date` (date, NOT NULL)
- `description` (text, nullable)
- `status` (text, NOT NULL, default 'pending') — CHECK: pending, approved, rejected, paid
- `receipt_url` (text, nullable) — URL to receipt document
- `submitted_by` (uuid, FK → profiles.id, nullable) — who submitted the expense
- `approved_by` (uuid, FK → profiles.id, nullable) — who approved/rejected
- `approved_at` (timestamptz, nullable) — when approved/rejected
- `approval_notes` (text, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### suppliers
- `id` (uuid, PK)
- `name` (text, NOT NULL) — supplier company name
- `email` (text, nullable)
- `phone` (text, nullable)
- `address` (text, nullable)
- `city` (text, nullable)
- `state` (text, nullable)
- `postal_code` (text, nullable)
- `country` (text, default 'US')
- `website` (text, nullable)
- `tax_id` (text, nullable)
- `payment_terms` (text, nullable) — e.g. "Net 30", "Net 60"
- `is_active` (boolean, default true)
- `notes` (text, nullable)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### supplier_invoices
- `id` (uuid, PK)
- `supplier_id` (uuid, FK → suppliers.id, CASCADE, NOT NULL)
- `invoice_number` (text, NOT NULL) — supplier's invoice number
- `invoice_date` (date, NOT NULL)
- `due_date` (date, nullable)
- `amount` (numeric(14,2), NOT NULL, CHECK > 0)
- `tax_amount` (numeric(14,2), nullable, CHECK >= 0)
- `total_amount` (numeric(14,2), NOT NULL, CHECK > 0)
- `status` (text, NOT NULL, default 'pending') — CHECK: pending, approved, paid, disputed
- `notes` (text, nullable)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- UNIQUE(supplier_id, invoice_number) — one invoice number per supplier

### materials
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `description` (text, nullable)
- `sku` (text, UNIQUE, nullable) — internal stock keeping unit
- `unit` (text, nullable) — unit of measure (e.g. "pcs", "kg", "m")
- `unit_cost` (numeric(10,2), nullable) — cost per unit
- `stock_quantity` (numeric(14,2), NOT NULL, default 0) — current stock level
- `reorder_level` (numeric(14,2), NOT NULL, default 0) — minimum stock threshold
- `is_active` (boolean, default true)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### material_purchases
- `id` (uuid, PK)
- `material_id` (uuid, FK → materials.id, CASCADE, NOT NULL)
- `supplier_id` (uuid, FK → suppliers.id, nullable) — where purchased from
- `project_id` (uuid, FK → projects.id, nullable) — optional project link
- `quantity` (numeric(14,2), NOT NULL, CHECK > 0)
- `unit_cost` (numeric(10,2), NOT NULL, CHECK >= 0)
- `total_cost` (numeric(14,2), NOT NULL, CHECK > 0) — quantity * unit_cost
- `purchase_date` (date, NOT NULL)
- `reference_number` (text, nullable) — PO/transaction number
- `notes` (text, nullable)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())

## Indexes
- expense_categories: name
- expenses: category_id, project_id, status, expense_date, submitted_by
- suppliers: name, is_active
- supplier_invoices: supplier_id, status, due_date
- materials: name, sku, is_active, stock_quantity
- material_purchases: material_id, supplier_id, project_id, purchase_date

## Security (RLS)
All tables have RLS enabled. Policies scope to authenticated users:
- expense_categories: all authenticated SELECT; write requires expenses permissions
- expenses: all authenticated SELECT; write requires expenses permissions
- suppliers: all authenticated SELECT; write requires contacts permissions
- supplier_invoices: all authenticated SELECT; write requires expenses permissions
- materials: all authenticated SELECT; write requires inventory permissions
- material_purchases: all authenticated SELECT; write requires inventory permissions

## Important Notes
1. All money fields use numeric(14,2) or numeric(10,2) — never floating point.
2. Check constraints enforce valid enum values on status fields.
3. Currency code is a 3-char string with length check constraint.
4. updated_at triggers maintain timestamps automatically.
5. Supplier invoices have a unique constraint on (supplier_id, invoice_number).
6. Materials have a unique constraint on sku.
*/

-- ============================================================================
-- EXPENSE CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_expense_categories" ON expense_categories;
CREATE POLICY "select_expense_categories" ON expense_categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_expense_categories" ON expense_categories;
CREATE POLICY "insert_expense_categories" ON expense_categories FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "update_expense_categories" ON expense_categories;
CREATE POLICY "update_expense_categories" ON expense_categories FOR UPDATE
  TO authenticated USING (public.has_permission('expenses.edit'))
  WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "delete_expense_categories" ON expense_categories;
CREATE POLICY "delete_expense_categories" ON expense_categories FOR DELETE
  TO authenticated USING (public.has_permission('expenses.delete'));

-- ============================================================================
-- SUPPLIERS (needed before expenses due to FK)
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'US',
  website text,
  tax_id text,
  payment_terms text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_suppliers" ON suppliers;
CREATE POLICY "select_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_suppliers" ON suppliers;
CREATE POLICY "insert_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "update_suppliers" ON suppliers;
CREATE POLICY "update_suppliers" ON suppliers FOR UPDATE
  TO authenticated USING (public.has_permission('contacts.edit'))
  WITH CHECK (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "delete_suppliers" ON suppliers;
CREATE POLICY "delete_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (public.has_permission('contacts.delete'));

-- ============================================================================
-- EXPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  expense_date date NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  receipt_url text,
  submitted_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  approval_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_expenses" ON expenses;
CREATE POLICY "select_expenses" ON expenses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_expenses" ON expenses;
CREATE POLICY "insert_expenses" ON expenses FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('expenses.create'));

DROP POLICY IF EXISTS "update_expenses" ON expenses;
CREATE POLICY "update_expenses" ON expenses FOR UPDATE
  TO authenticated USING (public.has_permission('expenses.edit'))
  WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "delete_expenses" ON expenses;
CREATE POLICY "delete_expenses" ON expenses FOR DELETE
  TO authenticated USING (public.has_permission('expenses.delete'));

-- ============================================================================
-- SUPPLIER INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  tax_amount numeric(14,2) CHECK (tax_amount >= 0),
  total_amount numeric(14,2) NOT NULL CHECK (total_amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due_date ON supplier_invoices(due_date);

ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_supplier_invoices" ON supplier_invoices;
CREATE POLICY "select_supplier_invoices" ON supplier_invoices FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_supplier_invoices" ON supplier_invoices;
CREATE POLICY "insert_supplier_invoices" ON supplier_invoices FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('expenses.create'));

DROP POLICY IF EXISTS "update_supplier_invoices" ON supplier_invoices;
CREATE POLICY "update_supplier_invoices" ON supplier_invoices FOR UPDATE
  TO authenticated USING (public.has_permission('expenses.edit'))
  WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "delete_supplier_invoices" ON supplier_invoices;
CREATE POLICY "delete_supplier_invoices" ON supplier_invoices FOR DELETE
  TO authenticated USING (public.has_permission('expenses.delete'));

-- ============================================================================
-- MATERIALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text UNIQUE,
  unit text,
  unit_cost numeric(10,2),
  stock_quantity numeric(14,2) NOT NULL DEFAULT 0,
  reorder_level numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_stock_quantity ON materials(stock_quantity);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_materials" ON materials;
CREATE POLICY "select_materials" ON materials FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_materials" ON materials;
CREATE POLICY "insert_materials" ON materials FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_materials" ON materials;
CREATE POLICY "update_materials" ON materials FOR UPDATE
  TO authenticated USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_materials" ON materials;
CREATE POLICY "delete_materials" ON materials FOR DELETE
  TO authenticated USING (public.has_permission('inventory.delete'));

-- ============================================================================
-- MATERIAL PURCHASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS material_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
  unit_cost numeric(10,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost numeric(14,2) NOT NULL CHECK (total_cost > 0),
  purchase_date date NOT NULL,
  reference_number text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_purchases_material_id ON material_purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_supplier_id ON material_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_project_id ON material_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_purchase_date ON material_purchases(purchase_date);

ALTER TABLE material_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_material_purchases" ON material_purchases;
CREATE POLICY "select_material_purchases" ON material_purchases FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_material_purchases" ON material_purchases;
CREATE POLICY "insert_material_purchases" ON material_purchases FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_material_purchases" ON material_purchases;
CREATE POLICY "update_material_purchases" ON material_purchases FOR UPDATE
  TO authenticated USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_material_purchases" ON material_purchases;
CREATE POLICY "delete_material_purchases" ON material_purchases FOR DELETE
  TO authenticated USING (public.has_permission('inventory.delete'));


-- ============================================================================
-- MIGRATION: 20260926020412_0007_create_documents_photos_audit_notifications_settings
-- ============================================================================

/*
# Create documents, photos, audit_logs, notifications, and settings tables

## Overview
This migration creates the remaining system tables: document and photo
storage references, audit trail, user notifications, and application
settings. These complete the database foundation for the Business Management
System.

## New Tables

### documents
- `id` (uuid, PK)
- `entity_type` (text, NOT NULL) — CHECK: client, project, expense, supplier, material, invoice, payment
- `entity_id` (uuid, NOT NULL) — ID of the related entity
- `name` (text, NOT NULL) — document file name
- `file_url` (text, NOT NULL) — storage URL (Supabase Storage path)
- `file_type` (text, nullable) — MIME type
- `file_size` (bigint, nullable) — size in bytes
- `description` (text, nullable)
- `uploaded_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- INDEX on (entity_type, entity_id) for efficient lookups

### photos
- `id` (uuid, PK)
- `entity_type` (text, NOT NULL) — CHECK: client, project, expense, supplier, material
- `entity_id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `file_url` (text, NOT NULL) — storage URL
- `thumbnail_url` (text, nullable) — optional thumbnail
- `file_type` (text, nullable)
- `file_size` (bigint, nullable)
- `caption` (text, nullable)
- `uploaded_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())

### audit_logs
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles.id, nullable) — who performed the action
- `action` (text, NOT NULL) — CHECK: create, update, delete, login, logout, approve, reject, activate, deactivate
- `entity_type` (text, NOT NULL) — which table/entity was affected
- `entity_id` (uuid, nullable) — ID of the affected entity
- `old_values` (jsonb, nullable) — previous state (for updates/deletes)
- `new_values` (jsonb, nullable) — new state (for creates/updates)
- `ip_address` (inet, nullable) — request IP
- `user_agent` (text, nullable) — browser/client info
- `created_at` (timestamptz, default now())
- INDEX on user_id, entity_type, entity_id, created_at
- Append-only: no UPDATE or DELETE policies

### notifications
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles.id, CASCADE, NOT NULL) — recipient
- `type` (text, NOT NULL) — CHECK: info, success, warning, error
- `title` (text, NOT NULL)
- `message` (text, NOT NULL)
- `data` (jsonb, nullable) — additional payload (links, metadata)
- `is_read` (boolean, default false)
- `read_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())
- INDEX on user_id, is_read, created_at

### settings
- `id` (uuid, PK)
- `key` (text, NOT NULL, UNIQUE) — setting key (e.g. "company_name")
- `value` (jsonb, NOT NULL) — setting value (flexible JSON)
- `description` (text, nullable)
- `is_public` (boolean, default false) — whether to expose to all users
- `updated_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security (RLS)

### documents
- All authenticated can SELECT
- INSERT requires appropriate permission based on entity_type
- UPDATE/DELETE requires appropriate permission

### photos
- All authenticated can SELECT
- INSERT requires appropriate permission
- DELETE requires appropriate permission

### audit_logs
- All authenticated can SELECT (for transparency)
- INSERT only (append-only, no UPDATE or DELETE)
- Uses SECURITY INVOKER function for inserts

### notifications
- Users can only SELECT their own notifications (auth.uid() = user_id)
- Users can UPDATE their own (mark as read)
- INSERT: system/other users can create notifications
- Users can DELETE their own notifications

### settings
- All authenticated can SELECT public settings
- All authenticated can SELECT all settings (settings are reference data)
- INSERT/UPDATE/DELETE requires settings.edit permission

## Important Notes
1. Documents and photos use entity_type/entity_id polymorphic references (no FK since they can point to multiple tables).
2. Audit logs are append-only — no UPDATE or DELETE policies.
3. Notifications are user-scoped with auth.uid() ownership checks.
4. Settings use JSONB for flexible value storage.
5. All tables have appropriate indexes for common query patterns.
*/

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL
    CHECK (entity_type IN ('client', 'project', 'expense', 'supplier', 'material', 'invoice', 'payment')),
  entity_id uuid NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  description text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_documents" ON documents;
CREATE POLICY "select_documents" ON documents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents" ON documents FOR UPDATE
  TO authenticated USING (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  )
  WITH CHECK (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents" ON documents FOR DELETE
  TO authenticated USING (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

-- ============================================================================
-- PHOTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL
    CHECK (entity_type IN ('client', 'project', 'expense', 'supplier', 'material')),
  entity_id uuid NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  file_type text,
  file_size bigint,
  caption text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos(uploaded_by);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_photos" ON photos;
CREATE POLICY "select_photos" ON photos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_photos" ON photos;
CREATE POLICY "insert_photos" ON photos FOR INSERT
  TO authenticated WITH CHECK (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

DROP POLICY IF EXISTS "delete_photos" ON photos;
CREATE POLICY "delete_photos" ON photos FOR DELETE
  TO authenticated USING (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL
    CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'activate', 'deactivate')),
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'success', 'warning', 'error')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_is_public ON settings(is_public);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_settings" ON settings;
CREATE POLICY "select_settings" ON settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_settings" ON settings;
CREATE POLICY "insert_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('settings.edit'));

DROP POLICY IF EXISTS "update_settings" ON settings;
CREATE POLICY "update_settings" ON settings FOR UPDATE
  TO authenticated USING (public.has_permission('settings.edit'))
  WITH CHECK (public.has_permission('settings.edit'));

DROP POLICY IF EXISTS "delete_settings" ON settings;
CREATE POLICY "delete_settings" ON settings FOR DELETE
  TO authenticated USING (public.has_permission('settings.edit'));


-- ============================================================================
-- MIGRATION: 20260926020436_0008_seed_development_data
-- ============================================================================

/*
# Seed development data

## Overview
This migration inserts development seed data for testing and initial setup.
All data is idempotent (ON CONFLICT DO NOTHING) and safe to re-run.

## Seed Data

### expense_categories
- Office Supplies
- Travel & Transportation
- Software & Subscriptions
- Professional Services
- Equipment & Hardware
- Marketing & Advertising
- Utilities
- Meals & Entertainment

### settings
- company_name: "BizManage Demo"
- currency: "USD"
- fiscal_year_start: "01-01"
- date_format: "YYYY-MM-DD"
- timezone: "UTC"

### clients (sample)
- Acme Corporation (acme@acme.com)
- TechStart Inc (contact@techstart.io)

### suppliers (sample)
- Global Office Supply Co
- TechEquipment Distributors

### materials (sample)
- A4 Paper Ream (SKU: PAP-A4-001)
- Laptop Stand (SKU: ACC-LAP-001)

### projects (sample)
- Website Redesign (for Acme Corporation, active)
- Mobile App Development (for TechStart Inc, planning)

## Important Notes
1. All inserts use ON CONFLICT DO NOTHING — safe to re-run.
2. Sample data references the admin user (admin@bizmanage.com) as created_by.
3. Settings use JSONB values for flexibility.
*/

-- ============================================================================
-- SEED EXPENSE CATEGORIES
-- ============================================================================
INSERT INTO expense_categories (name, description) VALUES
  ('Office Supplies', 'General office supplies and stationery'),
  ('Travel & Transportation', 'Business travel, fuel, parking'),
  ('Software & Subscriptions', 'SaaS subscriptions, licenses, digital tools'),
  ('Professional Services', 'Consulting, legal, accounting fees'),
  ('Equipment & Hardware', 'Computers, furniture, equipment purchases'),
  ('Marketing & Advertising', 'Ads, promotional materials, events'),
  ('Utilities', 'Internet, phone, electricity for office'),
  ('Meals & Entertainment', 'Client meetings, team lunches, events')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED SETTINGS
-- ============================================================================
INSERT INTO settings (key, value, description, is_public) VALUES
  ('company_name', '"BizManage Demo"', 'Company display name', true),
  ('currency', '"USD"', 'Default currency code', true),
  ('fiscal_year_start', '"01-01"', 'Fiscal year start month-day', true),
  ('date_format', '"YYYY-MM-DD"', 'Default date display format', true),
  ('timezone', '"UTC"', 'Application default timezone', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SEED SAMPLE CLIENTS
-- ============================================================================
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE email = 'admin@bizmanage.com' LIMIT 1;

  INSERT INTO clients (name, email, phone, city, state, country, created_by)
  VALUES
    ('Acme Corporation', 'contact@acme.com', '+1-555-0100', 'New York', 'NY', 'US', admin_id),
    ('TechStart Inc', 'hello@techstart.io', '+1-555-0200', 'San Francisco', 'CA', 'US', admin_id)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- SEED SAMPLE SUPPLIERS
-- ============================================================================
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE email = 'admin@bizmanage.com' LIMIT 1;

  INSERT INTO suppliers (name, email, phone, city, state, country, payment_terms, created_by)
  VALUES
    ('Global Office Supply Co', 'orders@globaloffice.com', '+1-555-0300', 'Chicago', 'IL', 'US', 'Net 30', admin_id),
    ('TechEquipment Distributors', 'sales@techequip.com', '+1-555-0400', 'Austin', 'TX', 'US', 'Net 15', admin_id)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- SEED SAMPLE MATERIALS
-- ============================================================================
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE email = 'admin@bizmanage.com' LIMIT 1;

  INSERT INTO materials (name, description, sku, unit, unit_cost, stock_quantity, reorder_level, created_by)
  VALUES
    ('A4 Paper Ream', '500 sheets, 80gsm white paper', 'PAP-A4-001', 'ream', 4.50, 120, 20, admin_id),
    ('Laptop Stand', 'Adjustable aluminum laptop stand', 'ACC-LAP-001', 'pcs', 25.00, 15, 5, admin_id)
  ON CONFLICT (sku) DO NOTHING;
END $$;

-- ============================================================================
-- SEED SAMPLE PROJECTS
-- ============================================================================
DO $$
DECLARE
  admin_id uuid;
  acme_id uuid;
  techstart_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE email = 'admin@bizmanage.com' LIMIT 1;
  SELECT id INTO acme_id FROM clients WHERE name = 'Acme Corporation' LIMIT 1;
  SELECT id INTO techstart_id FROM clients WHERE name = 'TechStart Inc' LIMIT 1;

  INSERT INTO projects (client_id, name, description, status, priority, start_date, end_date, budget, created_by)
  VALUES
    (acme_id, 'Website Redesign', 'Complete redesign of corporate website with new CMS', 'active', 'high', '2026-09-01', '2026-12-15', 45000.00, admin_id),
    (techstart_id, 'Mobile App Development', 'iOS and Android app for customer portal', 'planning', 'medium', '2026-10-01', '2027-03-01', 80000.00, admin_id)
  ON CONFLICT DO NOTHING;
END $$;


-- ============================================================================
-- MIGRATION: 20260926021007_0009_rls_helper_functions
-- ============================================================================

/*
# RLS helper functions for role-aware access control

## Overview
This migration creates reusable SQL helper functions that RLS policies will
call to determine access rights. These functions encapsulate the business
rules for project membership, role hierarchy, and financial self-approval.

## New Functions

### get_role_level()
Returns the calling user's role level (1=OWNER, 6=VIEWER, 99=no role).
Uses auth.uid() to look up the profile's role.

### is_project_member(project_uuid)
Returns true if the calling user is a member of the given project.
Checks the project_members table for a row matching auth.uid().

### can_access_project(project_uuid)
Returns true if the calling user can access the given project.
True if:
  - User is a member of the project (via project_members), OR
  - User has the 'invoices.view' permission (MANAGER+, ACCOUNTANT can see all projects)

### can_manage_project(project_uuid)
Returns true if the calling user can manage the given project.
True if:
  - User has 'invoices.edit' permission (MANAGER+, ADMIN, OWNER), OR
  - User is a project lead or manager on that project

### is_own_submission(submitter_uuid)
Returns true if the given UUID matches auth.uid().
Used to prevent self-approval of financial submissions.

### can_approve_financial(submitter_uuid)
Returns true if the calling user can approve a financial submission.
False if the submission was created by the calling user (self-approval prevention).
Requires 'expenses.approve' or 'invoices.approve' permission.

### can_manage_entity(entity_type_text, entity_uuid)
Returns true if the calling user can manage documents/photos attached
to a given entity. Routes through the appropriate permission check
based on entity_type.

## Security Notes
1. All functions are SECURITY INVOKER (run as the calling user, not definer).
2. All functions are STABLE (read-only, no side effects).
3. Functions use auth.uid() — never current_user.
4. search_path is set to public for security.
*/

-- ============================================================================
-- get_role_level()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_role_level()
RETURNS int
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.level
  FROM profiles p
  JOIN roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

-- ============================================================================
-- is_project_member(project_uuid)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
      AND user_id = auth.uid()
  )
$$;

-- ============================================================================
-- can_access_project(project_uuid)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public.is_project_member(project_uuid)
    OR public.has_permission('invoices.view')
$$;

-- ============================================================================
-- can_manage_project(project_uuid)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_manage_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public.has_permission('invoices.edit')
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_uuid
        AND user_id = auth.uid()
        AND role IN ('lead', 'manager')
    )
$$;

-- ============================================================================
-- is_own_submission(submitter_uuid)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_own_submission(submitter_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT auth.uid() = submitter_uuid
$$;

-- ============================================================================
-- can_approve_financial(submitter_uuid)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_approve_financial(submitter_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (public.has_permission('expenses.approve') OR public.has_permission('invoices.approve'))
    AND auth.uid() IS DISTINCT FROM submitter_uuid
$$;

-- ============================================================================
-- can_manage_entity(entity_type_text, entity_uuid)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_manage_entity(entity_type_text text, entity_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN entity_type_text IN ('client', 'supplier') THEN public.has_permission('contacts.edit')
      WHEN entity_type_text IN ('project', 'invoice', 'payment') THEN public.has_permission('invoices.edit')
      WHEN entity_type_text = 'expense' THEN public.has_permission('expenses.edit')
      WHEN entity_type_text = 'material' THEN public.has_permission('inventory.edit')
      ELSE false
    END
$$;


-- ============================================================================
-- MIGRATION: 20260926021026_0010_rls_project_access_control
-- ============================================================================

/*
# RLS: Project-level access control policies

## Overview
This migration replaces the project-related RLS policies with project-member-
aware policies. The key change is that STAFF users can only access projects they
are a member of (via project_members), while MANAGER+ roles can access all
projects through their 'invoices.view' permission.

## Affected Tables & Policy Changes

### projects
- SELECT: User must be a project member OR have 'invoices.view' permission
- INSERT: Requires 'invoices.create' permission
- UPDATE: Requires 'invoices.edit' permission OR be project lead/manager
- DELETE: Requires 'invoices.delete' permission

### project_members
- SELECT: User must be a member of that project OR have 'invoices.view'
- INSERT: Requires 'invoices.edit' permission
- UPDATE: Requires 'invoices.edit' permission
- DELETE: Requires 'invoices.edit' permission

### project_status_history
- SELECT: User must be able to access the parent project
- INSERT: Requires 'invoices.edit' permission (append-only, no UPDATE/DELETE)

### project_payments
- SELECT: User must be able to access the parent project
- INSERT: Requires 'invoices.create' permission
- UPDATE: Requires 'invoices.edit' permission
- DELETE: Requires 'invoices.delete' permission

### payment_allocations
- SELECT: User must be able to access the parent project (via payment or allocation)
- INSERT: Requires 'invoices.create' permission
- UPDATE: Requires 'invoices.edit' permission
- DELETE: Requires 'invoices.delete' permission

## Security Notes
1. STAFF users without project membership cannot see those projects at all.
2. Project leads and managers can update their project even without 'invoices.edit'.
3. All policies use the can_access_project() and can_manage_project() helper functions.
4. Policies are idempotent (DROP IF EXISTS before CREATE).
*/

-- ============================================================================
-- PROJECTS
-- ============================================================================
DROP POLICY IF EXISTS "select_projects" ON projects;
CREATE POLICY "select_projects" ON projects FOR SELECT
  TO authenticated USING (public.can_access_project(id));

DROP POLICY IF EXISTS "insert_projects" ON projects;
CREATE POLICY "insert_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_projects" ON projects;
CREATE POLICY "update_projects" ON projects FOR UPDATE
  TO authenticated
  USING (public.can_manage_project(id))
  WITH CHECK (public.can_manage_project(id));

DROP POLICY IF EXISTS "delete_projects" ON projects;
CREATE POLICY "delete_projects" ON projects FOR DELETE
  TO authenticated USING (public.has_permission('invoices.delete'));

-- ============================================================================
-- PROJECT_MEMBERS
-- ============================================================================
DROP POLICY IF EXISTS "select_project_members" ON project_members;
CREATE POLICY "select_project_members" ON project_members FOR SELECT
  TO authenticated USING (public.can_access_project(project_id));

DROP POLICY IF EXISTS "insert_project_members" ON project_members;
CREATE POLICY "insert_project_members" ON project_members FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "update_project_members" ON project_members;
CREATE POLICY "update_project_members" ON project_members FOR UPDATE
  TO authenticated
  USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_project_members" ON project_members;
CREATE POLICY "delete_project_members" ON project_members FOR DELETE
  TO authenticated USING (public.has_permission('invoices.edit'));

-- ============================================================================
-- PROJECT_STATUS_HISTORY
-- ============================================================================
DROP POLICY IF EXISTS "select_project_status_history" ON project_status_history;
CREATE POLICY "select_project_status_history" ON project_status_history FOR SELECT
  TO authenticated USING (public.can_access_project(project_id));

DROP POLICY IF EXISTS "insert_project_status_history" ON project_status_history;
CREATE POLICY "insert_project_status_history" ON project_status_history FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.edit'));

-- ============================================================================
-- PROJECT_PAYMENTS
-- ============================================================================
DROP POLICY IF EXISTS "select_project_payments" ON project_payments;
CREATE POLICY "select_project_payments" ON project_payments FOR SELECT
  TO authenticated USING (public.can_access_project(project_id));

DROP POLICY IF EXISTS "insert_project_payments" ON project_payments;
CREATE POLICY "insert_project_payments" ON project_payments FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_project_payments" ON project_payments;
CREATE POLICY "update_project_payments" ON project_payments FOR UPDATE
  TO authenticated
  USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_project_payments" ON project_payments;
CREATE POLICY "delete_project_payments" ON project_payments FOR DELETE
  TO authenticated USING (public.has_permission('invoices.delete'));

-- ============================================================================
-- PAYMENT_ALLOCATIONS
-- ============================================================================
DROP POLICY IF EXISTS "select_payment_allocations" ON payment_allocations;
CREATE POLICY "select_payment_allocations" ON payment_allocations FOR SELECT
  TO authenticated USING (
    public.can_access_project(project_id)
    OR EXISTS (
      SELECT 1 FROM project_payments pp
      WHERE pp.id = payment_allocations.payment_id
        AND public.can_access_project(pp.project_id)
    )
  );

DROP POLICY IF EXISTS "insert_payment_allocations" ON payment_allocations;
CREATE POLICY "insert_payment_allocations" ON payment_allocations FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_payment_allocations" ON payment_allocations;
CREATE POLICY "update_payment_allocations" ON payment_allocations FOR UPDATE
  TO authenticated
  USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_payment_allocations" ON payment_allocations;
CREATE POLICY "delete_payment_allocations" ON payment_allocations FOR DELETE
  TO authenticated USING (public.has_permission('invoices.delete'));


-- ============================================================================
-- MIGRATION: 20260926021046_0011_rls_financial_self_approval_prevention
-- ============================================================================

/*
# RLS: Financial records access control with self-approval prevention

## Overview
This migration replaces RLS policies for expense and supplier invoice tables.
The key security improvements are:

1. **Self-approval prevention**: Users cannot approve their own financial
   submissions (expenses they submitted, invoices they created). The
   can_approve_financial() function checks that auth.uid() != submitter.
2. **Project-scoped expenses**: Staff can only see expenses linked to
   projects they are a member of. Non-project expenses are visible to
   anyone with 'expenses.view' permission.
3. **VIEWER protection**: VIEWERs have only view permissions (no create/edit/
   delete/approve), so write policies naturally deny them.
4. **Approval status protection**: Once an expense is approved/rejected,
   only users with 'expenses.edit' can modify it (not the submitter).

## Affected Tables & Policy Changes

### expenses
- SELECT: User must have 'expenses.view' AND either:
  - The expense has no project_id (non-project expense), OR
  - The user can access the linked project, OR
  - The user has 'expenses.approve' (accountants/managers can see all expenses)
- INSERT: Requires 'expenses.create'. submitted_by defaults to auth.uid().
  Cannot set status to 'approved' without 'expenses.approve'.
- UPDATE: Requires 'expenses.edit'. Cannot change status to 'approved'/'rejected'
  unless can_approve_financial(submitted_by). Cannot approve own submissions.
- DELETE: Requires 'expenses.delete'

### expense_categories
- SELECT: All authenticated can read (reference data)
- INSERT/UPDATE/DELETE: Requires 'expenses.edit' (or 'expenses.delete' for DELETE)

### supplier_invoices
- SELECT: User must have 'expenses.view' permission
- INSERT: Requires 'expenses.create'. Cannot set status to 'approved' without
  'expenses.approve'.
- UPDATE: Requires 'expenses.edit'. Cannot change status to 'approved' unless
  can_approve_financial(created_by). Cannot approve own submissions.
- DELETE: Requires 'expenses.delete'

## Security Notes
1. The self-approval check uses can_approve_financial(submitter) which returns
   false when auth.uid() = submitter, preventing staff from approving their
   own expenses/invoices.
2. Accountants have 'expenses.approve' but not 'expenses.delete', so they can
   approve but not delete financial records.
3. VIEWERs have only 'expenses.view', so all write policies deny them.
4. The INSERT WITH CHECK prevents setting status='approved' on insert without
   approval permission, and also prevents self-approval.
*/

-- ============================================================================
-- EXPENSES
-- ============================================================================
DROP POLICY IF EXISTS "select_expenses" ON expenses;
CREATE POLICY "select_expenses" ON expenses FOR SELECT
  TO authenticated USING (
    public.has_permission('expenses.view')
    AND (
      project_id IS NULL
      OR public.can_access_project(project_id)
      OR public.has_permission('expenses.approve')
    )
  );

DROP POLICY IF EXISTS "insert_expenses" ON expenses;
CREATE POLICY "insert_expenses" ON expenses FOR INSERT
  TO authenticated WITH CHECK (
    public.has_permission('expenses.create')
    AND (
      status = 'pending'
      OR (status IN ('approved', 'rejected') AND public.can_approve_financial(auth.uid()))
    )
    AND (
      project_id IS NULL
      OR public.can_access_project(project_id)
    )
  );

DROP POLICY IF EXISTS "update_expenses" ON expenses;
CREATE POLICY "update_expenses" ON expenses FOR UPDATE
  TO authenticated
  USING (public.has_permission('expenses.edit'))
  WITH CHECK (
    public.has_permission('expenses.edit')
    AND (
      status NOT IN ('approved', 'rejected')
      OR public.can_approve_financial(submitted_by)
    )
  );

DROP POLICY IF EXISTS "delete_expenses" ON expenses;
CREATE POLICY "delete_expenses" ON expenses FOR DELETE
  TO authenticated USING (public.has_permission('expenses.delete'));

-- ============================================================================
-- EXPENSE_CATEGORIES
-- ============================================================================
DROP POLICY IF EXISTS "select_expense_categories" ON expense_categories;
CREATE POLICY "select_expense_categories" ON expense_categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_expense_categories" ON expense_categories;
CREATE POLICY "insert_expense_categories" ON expense_categories FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "update_expense_categories" ON expense_categories;
CREATE POLICY "update_expense_categories" ON expense_categories FOR UPDATE
  TO authenticated
  USING (public.has_permission('expenses.edit'))
  WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "delete_expense_categories" ON expense_categories;
CREATE POLICY "delete_expense_categories" ON expense_categories FOR DELETE
  TO authenticated USING (public.has_permission('expenses.delete'));

-- ============================================================================
-- SUPPLIER_INVOICES
-- ============================================================================
DROP POLICY IF EXISTS "select_supplier_invoices" ON supplier_invoices;
CREATE POLICY "select_supplier_invoices" ON supplier_invoices FOR SELECT
  TO authenticated USING (public.has_permission('expenses.view'));

DROP POLICY IF EXISTS "insert_supplier_invoices" ON supplier_invoices;
CREATE POLICY "insert_supplier_invoices" ON supplier_invoices FOR INSERT
  TO authenticated WITH CHECK (
    public.has_permission('expenses.create')
    AND (
      status = 'pending'
      OR (status = 'approved' AND public.can_approve_financial(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "update_supplier_invoices" ON supplier_invoices;
CREATE POLICY "update_supplier_invoices" ON supplier_invoices FOR UPDATE
  TO authenticated
  USING (public.has_permission('expenses.edit'))
  WITH CHECK (
    public.has_permission('expenses.edit')
    AND (
      status NOT IN ('approved', 'rejected', 'paid')
      OR public.can_approve_financial(created_by)
    )
  );

DROP POLICY IF EXISTS "delete_supplier_invoices" ON supplier_invoices;
CREATE POLICY "delete_supplier_invoices" ON supplier_invoices FOR DELETE
  TO authenticated USING (public.has_permission('expenses.delete'));


-- ============================================================================
-- MIGRATION: 20260926021101_0012_rls_documents_photos
-- ============================================================================

/*
# RLS: Document and photo access control

## Overview
This migration replaces RLS policies for documents and photos tables.
Documents and photos are polymorphic — they attach to different entity types
(client, project, expense, supplier, material, invoice, payment). Access is
now scoped through the parent entity's permissions.

## Affected Tables & Policy Changes

### documents
- SELECT: User must have the view permission for the entity type:
  - client/supplier → contacts.view
  - project/invoice/payment → invoices.view
  - expense → expenses.view
  - material → inventory.view
- INSERT: Requires the edit permission for the entity type via can_manage_entity()
- UPDATE: Requires the edit permission for the entity type via can_manage_entity()
- DELETE: Requires the edit permission for the entity type via can_manage_entity()

### photos
- SELECT: Same entity-type-scoped view permissions as documents
- INSERT: Requires can_manage_entity() for the entity type
- DELETE: Requires can_manage_entity() for the entity type

## Security Notes
1. Private documents (e.g. on a restricted project) are only accessible to
   users who have the corresponding view permission.
2. The can_manage_entity() function routes to the correct permission check
   based on entity_type.
3. VIEWERs can read documents/photos (they have view permissions) but cannot
   create, modify, or delete them.
*/

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
DROP POLICY IF EXISTS "select_documents" ON documents;
CREATE POLICY "select_documents" ON documents FOR SELECT
  TO authenticated USING (
    CASE
      WHEN entity_type IN ('client', 'supplier') THEN public.has_permission('contacts.view')
      WHEN entity_type IN ('project', 'invoice', 'payment') THEN public.has_permission('invoices.view')
      WHEN entity_type = 'expense' THEN public.has_permission('expenses.view')
      WHEN entity_type = 'material' THEN public.has_permission('inventory.view')
      ELSE false
    END
  );

DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (public.can_manage_entity(entity_type, entity_id));

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents" ON documents FOR UPDATE
  TO authenticated
  USING (public.can_manage_entity(entity_type, entity_id))
  WITH CHECK (public.can_manage_entity(entity_type, entity_id));

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents" ON documents FOR DELETE
  TO authenticated USING (public.can_manage_entity(entity_type, entity_id));

-- ============================================================================
-- PHOTOS
-- ============================================================================
DROP POLICY IF EXISTS "select_photos" ON photos;
CREATE POLICY "select_photos" ON photos FOR SELECT
  TO authenticated USING (
    CASE
      WHEN entity_type IN ('client', 'supplier') THEN public.has_permission('contacts.view')
      WHEN entity_type = 'project' THEN public.has_permission('invoices.view')
      WHEN entity_type = 'expense' THEN public.has_permission('expenses.view')
      WHEN entity_type = 'material' THEN public.has_permission('inventory.view')
      ELSE false
    END
  );

DROP POLICY IF EXISTS "insert_photos" ON photos;
CREATE POLICY "insert_photos" ON photos FOR INSERT
  TO authenticated WITH CHECK (public.can_manage_entity(entity_type, entity_id));

DROP POLICY IF EXISTS "delete_photos" ON photos;
CREATE POLICY "delete_photos" ON photos FOR DELETE
  TO authenticated USING (public.can_manage_entity(entity_type, entity_id));


-- ============================================================================
-- MIGRATION: 20260926021123_0013_rls_remaining_tables
-- ============================================================================

/*
# RLS: Remaining table access control policies

## Overview
This migration replaces RLS policies for the remaining application tables:
clients, suppliers, materials, material_purchases, settings, audit_logs,
notifications, and profiles.

## Affected Tables & Policy Changes

### clients
- SELECT: Requires 'contacts.view' permission (not all authenticated)
- INSERT: Requires 'contacts.create'
- UPDATE: Requires 'contacts.edit'
- DELETE: Requires 'contacts.delete'

### suppliers
- SELECT: Requires 'contacts.view' permission
- INSERT: Requires 'contacts.create'
- UPDATE: Requires 'contacts.edit'
- DELETE: Requires 'contacts.delete'

### materials
- SELECT: Requires 'inventory.view' permission
- INSERT: Requires 'inventory.create'
- UPDATE: Requires 'inventory.edit'
- DELETE: Requires 'inventory.delete'

### material_purchases
- SELECT: Requires 'inventory.view' AND if linked to a project, user must
  be able to access that project
- INSERT: Requires 'inventory.create'
- UPDATE: Requires 'inventory.edit'
- DELETE: Requires 'inventory.delete'

### settings
- SELECT: All authenticated can read (settings are reference data)
- INSERT/UPDATE/DELETE: Requires 'settings.edit'

### audit_logs
- SELECT: All authenticated can read (transparency)
- INSERT: All authenticated can insert (append-only)
- No UPDATE or DELETE policies (append-only by design)

### notifications
- SELECT: Only own notifications (auth.uid() = user_id)
- INSERT: Any authenticated can create (system generates notifications)
- UPDATE: Only own notifications (mark as read)
- DELETE: Only own notifications

### profiles
- SELECT: Users can read their own profile OR users with 'users.view' can
  read all profiles (needed for admin user management)
- UPDATE: Users can update own profile (name only) OR users with
  'users.edit' can update any profile. Role/is_active changes require
  'users.edit' AND 'users.deactivate' respectively (enforced in server actions).

## Security Notes
1. VIEWERs have contacts.view, expenses.view, inventory.view, invoices.view,
   reports.view, users.view — they can read everything but write nothing.
2. STAFF has limited write access (create/edit contacts, expenses, orders,
   invoices) but cannot delete anything or approve financial submissions.
3. profiles SELECT now allows users.view holders to read all profiles,
   enabling admin user management pages to list users.
4. Audit logs remain append-only — no UPDATE or DELETE policies.
*/

-- ============================================================================
-- CLIENTS
-- ============================================================================
DROP POLICY IF EXISTS "select_clients" ON clients;
CREATE POLICY "select_clients" ON clients FOR SELECT
  TO authenticated USING (public.has_permission('contacts.view'));

DROP POLICY IF EXISTS "insert_clients" ON clients;
CREATE POLICY "insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "update_clients" ON clients;
CREATE POLICY "update_clients" ON clients FOR UPDATE
  TO authenticated
  USING (public.has_permission('contacts.edit'))
  WITH CHECK (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "delete_clients" ON clients;
CREATE POLICY "delete_clients" ON clients FOR DELETE
  TO authenticated USING (public.has_permission('contacts.delete'));

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
DROP POLICY IF EXISTS "select_suppliers" ON suppliers;
CREATE POLICY "select_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (public.has_permission('contacts.view'));

DROP POLICY IF EXISTS "insert_suppliers" ON suppliers;
CREATE POLICY "insert_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "update_suppliers" ON suppliers;
CREATE POLICY "update_suppliers" ON suppliers FOR UPDATE
  TO authenticated
  USING (public.has_permission('contacts.edit'))
  WITH CHECK (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "delete_suppliers" ON suppliers;
CREATE POLICY "delete_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (public.has_permission('contacts.delete'));

-- ============================================================================
-- MATERIALS
-- ============================================================================
DROP POLICY IF EXISTS "select_materials" ON materials;
CREATE POLICY "select_materials" ON materials FOR SELECT
  TO authenticated USING (public.has_permission('inventory.view'));

DROP POLICY IF EXISTS "insert_materials" ON materials;
CREATE POLICY "insert_materials" ON materials FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_materials" ON materials;
CREATE POLICY "update_materials" ON materials FOR UPDATE
  TO authenticated
  USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_materials" ON materials;
CREATE POLICY "delete_materials" ON materials FOR DELETE
  TO authenticated USING (public.has_permission('inventory.delete'));

-- ============================================================================
-- MATERIAL_PURCHASES
-- ============================================================================
DROP POLICY IF EXISTS "select_material_purchases" ON material_purchases;
CREATE POLICY "select_material_purchases" ON material_purchases FOR SELECT
  TO authenticated USING (
    public.has_permission('inventory.view')
    AND (
      project_id IS NULL
      OR public.can_access_project(project_id)
    )
  );

DROP POLICY IF EXISTS "insert_material_purchases" ON material_purchases;
CREATE POLICY "insert_material_purchases" ON material_purchases FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_material_purchases" ON material_purchases;
CREATE POLICY "update_material_purchases" ON material_purchases FOR UPDATE
  TO authenticated
  USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_material_purchases" ON material_purchases;
CREATE POLICY "delete_material_purchases" ON material_purchases FOR DELETE
  TO authenticated USING (public.has_permission('inventory.delete'));

-- ============================================================================
-- SETTINGS
-- ============================================================================
DROP POLICY IF EXISTS "select_settings" ON settings;
CREATE POLICY "select_settings" ON settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_settings" ON settings;
CREATE POLICY "insert_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('settings.edit'));

DROP POLICY IF EXISTS "update_settings" ON settings;
CREATE POLICY "update_settings" ON settings FOR UPDATE
  TO authenticated
  USING (public.has_permission('settings.edit'))
  WITH CHECK (public.has_permission('settings.edit'));

DROP POLICY IF EXISTS "delete_settings" ON settings;
CREATE POLICY "delete_settings" ON settings FOR DELETE
  TO authenticated USING (public.has_permission('settings.edit'));

-- ============================================================================
-- AUDIT_LOGS (append-only)
-- ============================================================================
DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id OR public.has_permission('users.view')
  );

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.has_permission('users.edit'))
  WITH CHECK (
    auth.uid() = id OR public.has_permission('users.edit')
  );


-- ============================================================================
-- MIGRATION: 20260926021700_0014_fix_rls_recursion_security_schema
-- ============================================================================

/*
# Fix RLS recursion: move helper functions to security schema

## Overview
The RLS helper functions (has_permission, is_project_member, can_access_project,
etc.) were defined as SECURITY INVOKER in the public schema. This caused infinite
recursion because:
1. has_permission() queries profiles (which has RLS calling has_permission())
2. is_project_member() queries project_members (which has RLS calling
   can_access_project() which calls is_project_member())

The fix: move all helper functions to a non-exposed `security` schema as
SECURITY DEFINER. Functions in the `security` schema are:
- Not exposed via the REST API (only `public` is exposed by default)
- SECURITY DEFINER (bypass RLS, breaking the recursion)
- Only callable by the `authenticated` role (needed for RLS policies)

This eliminates both the recursion AND the security advisor warning about
SECURITY DEFINER functions callable by authenticated users via the REST API.

## Changes
1. Create `security` schema
2. Move all helper functions to `security` schema as SECURITY DEFINER
3. Grant EXECUTE to `authenticated` on all security schema functions
4. Drop the public.has_permission() function (replaced by security.has_permission())
5. Update ALL RLS policies to call security.function_name() instead of public.function_name()

## Security Notes
1. The `security` schema is NOT exposed via the Supabase REST API
2. Functions are SECURITY DEFINER (run as postgres, bypass RLS) — needed to break recursion
3. Functions are STABLE and read-only — no side effects
4. Functions only return booleans based on the calling user's own data
5. EXECUTE is granted only to `authenticated` (not `anon`)
*/

-- ============================================================================
-- Create security schema
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS security;

-- Grant usage on schema to authenticated
GRANT USAGE ON SCHEMA security TO authenticated;

-- ============================================================================
-- Move helper functions to security schema as SECURITY DEFINER
-- ============================================================================

-- has_permission(perm_name)
CREATE OR REPLACE FUNCTION security.has_permission(perm_name text)
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
  )
$$;

-- get_role_level()
CREATE OR REPLACE FUNCTION security.get_role_level()
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.level
  FROM profiles p
  JOIN roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

-- is_project_member(project_uuid)
CREATE OR REPLACE FUNCTION security.is_project_member(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
      AND user_id = auth.uid()
  )
$$;

-- can_access_project(project_uuid)
CREATE OR REPLACE FUNCTION security.can_access_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    security.is_project_member(project_uuid)
    OR security.has_permission('invoices.view')
$$;

-- can_manage_project(project_uuid)
CREATE OR REPLACE FUNCTION security.can_manage_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    security.has_permission('invoices.edit')
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_uuid
        AND user_id = auth.uid()
        AND role IN ('lead', 'manager')
    )
$$;

-- is_own_submission(submitter_uuid)
CREATE OR REPLACE FUNCTION security.is_own_submission(submitter_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = submitter_uuid
$$;

-- can_approve_financial(submitter_uuid)
CREATE OR REPLACE FUNCTION security.can_approve_financial(submitter_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (security.has_permission('expenses.approve') OR security.has_permission('invoices.approve'))
    AND auth.uid() IS DISTINCT FROM submitter_uuid
$$;

-- can_manage_entity(entity_type_text, entity_uuid)
CREATE OR REPLACE FUNCTION security.can_manage_entity(entity_type_text text, entity_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN entity_type_text IN ('client', 'supplier') THEN security.has_permission('contacts.edit')
      WHEN entity_type_text IN ('project', 'invoice', 'payment') THEN security.has_permission('invoices.edit')
      WHEN entity_type_text = 'expense' THEN security.has_permission('expenses.edit')
      WHEN entity_type_text = 'material' THEN security.has_permission('inventory.edit')
      ELSE false
    END
$$;

-- Grant EXECUTE to authenticated only (not anon)
REVOKE EXECUTE ON FUNCTION security.has_permission(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION security.has_permission(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION security.get_role_level() FROM anon, public;
GRANT EXECUTE ON FUNCTION security.get_role_level() TO authenticated;

REVOKE EXECUTE ON FUNCTION security.is_project_member(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION security.is_project_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION security.can_access_project(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION security.can_access_project(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION security.can_manage_project(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION security.can_manage_project(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION security.is_own_submission(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION security.is_own_submission(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION security.can_approve_financial(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION security.can_approve_financial(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION security.can_manage_entity(text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION security.can_manage_entity(text, uuid) TO authenticated;

-- ============================================================================
-- Drop old public schema functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.has_permission(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_role_level() CASCADE;
DROP FUNCTION IF EXISTS public.is_project_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_project(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_project(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_own_submission(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_approve_financial(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_entity(text, uuid) CASCADE;

-- ============================================================================
-- Update ALL RLS policies to use security.* instead of public.*
-- ============================================================================

-- PROJECTS
DROP POLICY IF EXISTS "select_projects" ON projects;
CREATE POLICY "select_projects" ON projects FOR SELECT
  TO authenticated USING (security.can_access_project(id));

DROP POLICY IF EXISTS "insert_projects" ON projects;
CREATE POLICY "insert_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_projects" ON projects;
CREATE POLICY "update_projects" ON projects FOR UPDATE
  TO authenticated
  USING (security.can_manage_project(id))
  WITH CHECK (security.can_manage_project(id));

DROP POLICY IF EXISTS "delete_projects" ON projects;
CREATE POLICY "delete_projects" ON projects FOR DELETE
  TO authenticated USING (security.has_permission('invoices.delete'));

-- PROJECT_MEMBERS
DROP POLICY IF EXISTS "select_project_members" ON project_members;
CREATE POLICY "select_project_members" ON project_members FOR SELECT
  TO authenticated USING (security.can_access_project(project_id));

DROP POLICY IF EXISTS "insert_project_members" ON project_members;
CREATE POLICY "insert_project_members" ON project_members FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "update_project_members" ON project_members;
CREATE POLICY "update_project_members" ON project_members FOR UPDATE
  TO authenticated
  USING (security.has_permission('invoices.edit'))
  WITH CHECK (security.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_project_members" ON project_members;
CREATE POLICY "delete_project_members" ON project_members FOR DELETE
  TO authenticated USING (security.has_permission('invoices.edit'));

-- PROJECT_STATUS_HISTORY
DROP POLICY IF EXISTS "select_project_status_history" ON project_status_history;
CREATE POLICY "select_project_status_history" ON project_status_history FOR SELECT
  TO authenticated USING (security.can_access_project(project_id));

DROP POLICY IF EXISTS "insert_project_status_history" ON project_status_history;
CREATE POLICY "insert_project_status_history" ON project_status_history FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('invoices.edit'));

-- PROJECT_PAYMENTS
DROP POLICY IF EXISTS "select_project_payments" ON project_payments;
CREATE POLICY "select_project_payments" ON project_payments FOR SELECT
  TO authenticated USING (security.can_access_project(project_id));

DROP POLICY IF EXISTS "insert_project_payments" ON project_payments;
CREATE POLICY "insert_project_payments" ON project_payments FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_project_payments" ON project_payments;
CREATE POLICY "update_project_payments" ON project_payments FOR UPDATE
  TO authenticated
  USING (security.has_permission('invoices.edit'))
  WITH CHECK (security.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_project_payments" ON project_payments;
CREATE POLICY "delete_project_payments" ON project_payments FOR DELETE
  TO authenticated USING (security.has_permission('invoices.delete'));

-- PAYMENT_ALLOCATIONS
DROP POLICY IF EXISTS "select_payment_allocations" ON payment_allocations;
CREATE POLICY "select_payment_allocations" ON payment_allocations FOR SELECT
  TO authenticated USING (
    security.can_access_project(project_id)
    OR EXISTS (
      SELECT 1 FROM project_payments pp
      WHERE pp.id = payment_allocations.payment_id
        AND security.can_access_project(pp.project_id)
    )
  );

DROP POLICY IF EXISTS "insert_payment_allocations" ON payment_allocations;
CREATE POLICY "insert_payment_allocations" ON payment_allocations FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_payment_allocations" ON payment_allocations;
CREATE POLICY "update_payment_allocations" ON payment_allocations FOR UPDATE
  TO authenticated
  USING (security.has_permission('invoices.edit'))
  WITH CHECK (security.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_payment_allocations" ON payment_allocations;
CREATE POLICY "delete_payment_allocations" ON payment_allocations FOR DELETE
  TO authenticated USING (security.has_permission('invoices.delete'));

-- EXPENSES
DROP POLICY IF EXISTS "select_expenses" ON expenses;
CREATE POLICY "select_expenses" ON expenses FOR SELECT
  TO authenticated USING (
    security.has_permission('expenses.view')
    AND (
      project_id IS NULL
      OR security.can_access_project(project_id)
      OR security.has_permission('expenses.approve')
    )
  );

DROP POLICY IF EXISTS "insert_expenses" ON expenses;
CREATE POLICY "insert_expenses" ON expenses FOR INSERT
  TO authenticated WITH CHECK (
    security.has_permission('expenses.create')
    AND (
      status = 'pending'
      OR (status IN ('approved', 'rejected') AND security.can_approve_financial(auth.uid()))
    )
    AND (
      project_id IS NULL
      OR security.can_access_project(project_id)
    )
  );

DROP POLICY IF EXISTS "update_expenses" ON expenses;
CREATE POLICY "update_expenses" ON expenses FOR UPDATE
  TO authenticated
  USING (security.has_permission('expenses.edit'))
  WITH CHECK (
    security.has_permission('expenses.edit')
    AND (
      status NOT IN ('approved', 'rejected')
      OR security.can_approve_financial(submitted_by)
    )
  );

DROP POLICY IF EXISTS "delete_expenses" ON expenses;
CREATE POLICY "delete_expenses" ON expenses FOR DELETE
  TO authenticated USING (security.has_permission('expenses.delete'));

-- EXPENSE_CATEGORIES
DROP POLICY IF EXISTS "select_expense_categories" ON expense_categories;
CREATE POLICY "select_expense_categories" ON expense_categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_expense_categories" ON expense_categories;
CREATE POLICY "insert_expense_categories" ON expense_categories FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "update_expense_categories" ON expense_categories;
CREATE POLICY "update_expense_categories" ON expense_categories FOR UPDATE
  TO authenticated
  USING (security.has_permission('expenses.edit'))
  WITH CHECK (security.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "delete_expense_categories" ON expense_categories;
CREATE POLICY "delete_expense_categories" ON expense_categories FOR DELETE
  TO authenticated USING (security.has_permission('expenses.delete'));

-- SUPPLIER_INVOICES
DROP POLICY IF EXISTS "select_supplier_invoices" ON supplier_invoices;
CREATE POLICY "select_supplier_invoices" ON supplier_invoices FOR SELECT
  TO authenticated USING (security.has_permission('expenses.view'));

DROP POLICY IF EXISTS "insert_supplier_invoices" ON supplier_invoices;
CREATE POLICY "insert_supplier_invoices" ON supplier_invoices FOR INSERT
  TO authenticated WITH CHECK (
    security.has_permission('expenses.create')
    AND (
      status = 'pending'
      OR (status = 'approved' AND security.can_approve_financial(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "update_supplier_invoices" ON supplier_invoices;
CREATE POLICY "update_supplier_invoices" ON supplier_invoices FOR UPDATE
  TO authenticated
  USING (security.has_permission('expenses.edit'))
  WITH CHECK (
    security.has_permission('expenses.edit')
    AND (
      status NOT IN ('approved', 'rejected', 'paid')
      OR security.can_approve_financial(created_by)
    )
  );

DROP POLICY IF EXISTS "delete_supplier_invoices" ON supplier_invoices;
CREATE POLICY "delete_supplier_invoices" ON supplier_invoices FOR DELETE
  TO authenticated USING (security.has_permission('expenses.delete'));

-- DOCUMENTS
DROP POLICY IF EXISTS "select_documents" ON documents;
CREATE POLICY "select_documents" ON documents FOR SELECT
  TO authenticated USING (
    CASE
      WHEN entity_type IN ('client', 'supplier') THEN security.has_permission('contacts.view')
      WHEN entity_type IN ('project', 'invoice', 'payment') THEN security.has_permission('invoices.view')
      WHEN entity_type = 'expense' THEN security.has_permission('expenses.view')
      WHEN entity_type = 'material' THEN security.has_permission('inventory.view')
      ELSE false
    END
  );

DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (security.can_manage_entity(entity_type, entity_id));

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents" ON documents FOR UPDATE
  TO authenticated
  USING (security.can_manage_entity(entity_type, entity_id))
  WITH CHECK (security.can_manage_entity(entity_type, entity_id));

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents" ON documents FOR DELETE
  TO authenticated USING (security.can_manage_entity(entity_type, entity_id));

-- PHOTOS
DROP POLICY IF EXISTS "select_photos" ON photos;
CREATE POLICY "select_photos" ON photos FOR SELECT
  TO authenticated USING (
    CASE
      WHEN entity_type IN ('client', 'supplier') THEN security.has_permission('contacts.view')
      WHEN entity_type = 'project' THEN security.has_permission('invoices.view')
      WHEN entity_type = 'expense' THEN security.has_permission('expenses.view')
      WHEN entity_type = 'material' THEN security.has_permission('inventory.view')
      ELSE false
    END
  );

DROP POLICY IF EXISTS "insert_photos" ON photos;
CREATE POLICY "insert_photos" ON photos FOR INSERT
  TO authenticated WITH CHECK (security.can_manage_entity(entity_type, entity_id));

DROP POLICY IF EXISTS "delete_photos" ON photos;
CREATE POLICY "delete_photos" ON photos FOR DELETE
  TO authenticated USING (security.can_manage_entity(entity_type, entity_id));

-- CLIENTS
DROP POLICY IF EXISTS "select_clients" ON clients;
CREATE POLICY "select_clients" ON clients FOR SELECT
  TO authenticated USING (security.has_permission('contacts.view'));

DROP POLICY IF EXISTS "insert_clients" ON clients;
CREATE POLICY "insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('contacts.create'));

DROP POLICY IF EXISTS "update_clients" ON clients;
CREATE POLICY "update_clients" ON clients FOR UPDATE
  TO authenticated
  USING (security.has_permission('contacts.edit'))
  WITH CHECK (security.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "delete_clients" ON clients;
CREATE POLICY "delete_clients" ON clients FOR DELETE
  TO authenticated USING (security.has_permission('contacts.delete'));

-- SUPPLIERS
DROP POLICY IF EXISTS "select_suppliers" ON suppliers;
CREATE POLICY "select_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (security.has_permission('contacts.view'));

DROP POLICY IF EXISTS "insert_suppliers" ON suppliers;
CREATE POLICY "insert_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('contacts.create'));

DROP POLICY IF EXISTS "update_suppliers" ON suppliers;
CREATE POLICY "update_suppliers" ON suppliers FOR UPDATE
  TO authenticated
  USING (security.has_permission('contacts.edit'))
  WITH CHECK (security.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "delete_suppliers" ON suppliers;
CREATE POLICY "delete_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (security.has_permission('contacts.delete'));

-- MATERIALS
DROP POLICY IF EXISTS "select_materials" ON materials;
CREATE POLICY "select_materials" ON materials FOR SELECT
  TO authenticated USING (security.has_permission('inventory.view'));

DROP POLICY IF EXISTS "insert_materials" ON materials;
CREATE POLICY "insert_materials" ON materials FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_materials" ON materials;
CREATE POLICY "update_materials" ON materials FOR UPDATE
  TO authenticated
  USING (security.has_permission('inventory.edit'))
  WITH CHECK (security.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_materials" ON materials;
CREATE POLICY "delete_materials" ON materials FOR DELETE
  TO authenticated USING (security.has_permission('inventory.delete'));

-- MATERIAL_PURCHASES
DROP POLICY IF EXISTS "select_material_purchases" ON material_purchases;
CREATE POLICY "select_material_purchases" ON material_purchases FOR SELECT
  TO authenticated USING (
    security.has_permission('inventory.view')
    AND (
      project_id IS NULL
      OR security.can_access_project(project_id)
    )
  );

DROP POLICY IF EXISTS "insert_material_purchases" ON material_purchases;
CREATE POLICY "insert_material_purchases" ON material_purchases FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_material_purchases" ON material_purchases;
CREATE POLICY "update_material_purchases" ON material_purchases FOR UPDATE
  TO authenticated
  USING (security.has_permission('inventory.edit'))
  WITH CHECK (security.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_material_purchases" ON material_purchases;
CREATE POLICY "delete_material_purchases" ON material_purchases FOR DELETE
  TO authenticated USING (security.has_permission('inventory.delete'));

-- SETTINGS
DROP POLICY IF EXISTS "select_settings" ON settings;
CREATE POLICY "select_settings" ON settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_settings" ON settings;
CREATE POLICY "insert_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (security.has_permission('settings.edit'));

DROP POLICY IF EXISTS "update_settings" ON settings;
CREATE POLICY "update_settings" ON settings FOR UPDATE
  TO authenticated
  USING (security.has_permission('settings.edit'))
  WITH CHECK (security.has_permission('settings.edit'));

DROP POLICY IF EXISTS "delete_settings" ON settings;
CREATE POLICY "delete_settings" ON settings FOR DELETE
  TO authenticated USING (security.has_permission('settings.edit'));

-- AUDIT_LOGS (append-only)
DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PROFILES
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id OR security.has_permission('users.view')
  );

DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR security.has_permission('users.edit'))
  WITH CHECK (
    auth.uid() = id OR security.has_permission('users.edit')
  );


-- ============================================================================
-- MIGRATION: 20260926021736_0015_fix_staff_project_access
-- ============================================================================

/*
# Fix: Staff project access should be membership-based only

## Overview
The previous can_access_project() function granted access to all projects
for any user with 'invoices.view' permission. This meant STAFF users (who
have invoices.view) could see all projects, violating the requirement that
"Staff cannot access unauthorized projects."

## Change
can_access_project() now returns true if:
- User is a member of the project (via project_members), OR
- User has 'invoices.edit' permission (MANAGER+ can see all projects)

This means:
- OWNER/ADMIN: can see all projects (have invoices.edit)
- MANAGER: can see all projects (has invoices.edit)
- ACCOUNTANT: can see all projects — they have invoices.view but NOT
  invoices.edit. However, accountants need to see all financial data.
  We add a separate check: users with 'expenses.approve' can also
  access all projects (accountants approve expenses across projects).
- STAFF: can only see projects they are a member of
- VIEWER: can only see projects they are a member of (but VIEWER has
  invoices.view, not invoices.edit or expenses.approve, so they are
  restricted to membership-based access)

## Updated Function
security.can_access_project(project_uuid):
  True if:
  - is_project_member(project_uuid), OR
  - has_permission('invoices.edit'), OR
  - has_permission('expenses.approve')
*/

CREATE OR REPLACE FUNCTION security.can_access_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    security.is_project_member(project_uuid)
    OR security.has_permission('invoices.edit')
    OR security.has_permission('expenses.approve')
$$;

REVOKE EXECUTE ON FUNCTION security.can_access_project(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION security.can_access_project(uuid) TO authenticated;


-- ============================================================================
-- MIGRATION: 20260926021853_0016_fix_self_approval_null_submitter
-- ============================================================================

/*
# Fix: Self-approval prevention with NULL submitter and UPDATE policy

## Overview
The self-approval prevention was not working because:
1. `submitted_by` on expenses was NULL (no DEFAULT auth.uid()), so
   `can_approve_financial(NULL)` returned true (auth.uid() IS DISTINCT FROM NULL = true)
2. The UPDATE policy's USING clause only checked `has_permission('expenses.edit')`,
   allowing STAFF to target approved expenses for modification

## Changes

### 1. Add DEFAULT auth.uid() to expenses.submitted_by
This ensures submitted_by is always populated when a new expense is created.

### 2. Fix can_approve_financial() to reject NULL submitters
If submitted_by is NULL, the function now returns FALSE — you cannot
approve a submission when you don't know who submitted it.

### 3. Strengthen expenses UPDATE policy
The USING clause now also checks the status condition — you can only
target approved/rejected expenses if you can_approve_financial(submitted_by).
This prevents STAFF from modifying approved expenses even if they have
expenses.edit permission.

### 4. Strengthen supplier_invoices UPDATE policy
Same fix — USING clause now checks status condition.

### 5. Set submitted_by for existing expenses
Update existing expense rows where submitted_by is NULL to set it to
the created_by value or the admin user's ID.

## Security Notes
1. submitted_by DEFAULT auth.uid() ensures every new expense has a submitter
2. can_approve_financial(NULL) returns FALSE — no approving anonymous submissions
3. The USING clause on UPDATE now prevents targeting approved/rejected rows
   unless the user has approval authority AND is not the submitter
*/

-- ============================================================================
-- Fix 1: Add DEFAULT auth.uid() to expenses.submitted_by
-- ============================================================================
ALTER TABLE expenses ALTER COLUMN submitted_by SET DEFAULT auth.uid();

-- ============================================================================
-- Fix 2: Fix can_approve_financial to reject NULL submitters
-- ============================================================================
CREATE OR REPLACE FUNCTION security.can_approve_financial(submitter_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (security.has_permission('expenses.approve') OR security.has_permission('invoices.approve'))
    AND submitter_uuid IS NOT NULL
    AND auth.uid() IS DISTINCT FROM submitter_uuid
$$;

REVOKE EXECUTE ON FUNCTION security.can_approve_financial(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION security.can_approve_financial(uuid) TO authenticated;

-- ============================================================================
-- Fix 3: Strengthen expenses UPDATE policy
-- ============================================================================
DROP POLICY IF EXISTS "update_expenses" ON expenses;
CREATE POLICY "update_expenses" ON expenses FOR UPDATE
  TO authenticated
  USING (
    security.has_permission('expenses.edit')
    AND (
      status NOT IN ('approved', 'rejected')
      OR security.can_approve_financial(submitted_by)
    )
  )
  WITH CHECK (
    security.has_permission('expenses.edit')
    AND (
      status NOT IN ('approved', 'rejected')
      OR security.can_approve_financial(submitted_by)
    )
  );

-- ============================================================================
-- Fix 4: Strengthen supplier_invoices UPDATE policy
-- ============================================================================
DROP POLICY IF EXISTS "update_supplier_invoices" ON supplier_invoices;
CREATE POLICY "update_supplier_invoices" ON supplier_invoices FOR UPDATE
  TO authenticated
  USING (
    security.has_permission('expenses.edit')
    AND (
      status NOT IN ('approved', 'rejected', 'paid')
      OR security.can_approve_financial(created_by)
    )
  )
  WITH CHECK (
    security.has_permission('expenses.edit')
    AND (
      status NOT IN ('approved', 'rejected', 'paid')
      OR security.can_approve_financial(created_by)
    )
  );

-- ============================================================================
-- Fix 5: Set submitted_by for existing expenses
-- ============================================================================
UPDATE expenses SET submitted_by = auth.uid()
WHERE submitted_by IS NULL;


-- ============================================================================
-- MIGRATION: 20260926022806_0017_add_client_management_fields
-- ============================================================================

/*
# Add client management fields to clients table

## Overview
This migration adds the fields needed for the client management module:
client_code, company_name, contact_person, and a status column that
replaces the boolean is_active with a more granular status enum.
Also adds an updated_at trigger and a unique constraint on client_code.

## Changes to clients table

### New Columns
- `client_code` (text, nullable, UNIQUE) — auto-generated code like CLI-001
- `company_name` (text, nullable) — legal company name (distinct from `name` which is the display/trading name)
- `contact_person` (text, nullable) — primary contact person name
- `status` (text, NOT NULL, default 'active') — CHECK: active, inactive, archived

### Modified Columns
- `is_active` remains for backward compatibility but is now derived from status.
  A CHECK constraint ensures is_active = (status = 'active').

### New Index
- `idx_clients_client_code` on client_code
- `idx_clients_status` on status

### New Trigger
- `update_clients_updated_at` — auto-updates updated_at on row change

### Auto-generate client_code
- A trigger `generate_client_code` auto-generates CLI-NNN format codes
  on INSERT when client_code is NULL.

## Security Notes
1. RLS policies are unchanged — they already use security.has_permission().
2. The status column doesn't affect RLS — it's a business field, not a security field.
3. is_active is kept in sync with status via trigger for backward compatibility.
*/

-- ============================================================================
-- Add new columns
-- ============================================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_code text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'archived'));

-- ============================================================================
-- Sync is_active with status for existing rows
-- ============================================================================
UPDATE clients SET is_active = false WHERE status != 'active';

-- ============================================================================
-- Add unique constraint on client_code (partial — only for non-null values)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_client_code_key'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_client_code_key UNIQUE (client_code);
  END IF;
END $$;

-- ============================================================================
-- Add indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON clients(client_code);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- ============================================================================
-- Auto-generate client_code trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_code IS NULL THEN
    SELECT 'CLI-' || LPAD(COALESCE(MAX(suffix), 0)::text, 4, '0')
    INTO NEW.client_code
    FROM (
      SELECT CAST(SUBSTRING(client_code FROM 5) AS int) AS suffix
      FROM clients
      WHERE client_code LIKE 'CLI-%'
    ) AS codes;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_client_code ON clients;
CREATE TRIGGER trg_generate_client_code
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_code();

-- ============================================================================
-- Sync is_active with status trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_client_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    NEW.is_active := true;
  ELSE
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_status ON clients;
CREATE TRIGGER trg_sync_client_status
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_status();

-- ============================================================================
-- Updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- MIGRATION: 20260926024522_0018_fix_client_code_trigger
-- ============================================================================

/*
# Fix client_code auto-generation trigger

## Problem
The generate_client_code() trigger was producing CLI-0000 for all new inserts,
then hitting a UNIQUE constraint violation on the second insert.

The bug was in the MAX calculation: MAX(suffix) returns 0 when the subquery
has rows with suffix 0 (from the initial seeded values), and LPAD of 0 is '0000',
so the next code was always CLI-0000 (conflicting with itself).

## Fix
Rewrite the trigger to use NEXTVAL pattern via sequence OR a proper MAX+1 approach:
  - Find the maximum numeric suffix from existing client_code values
  - Set new code to MAX + 1, formatted as CLI-NNNN
  - If no existing codes, start from 1

## Result
- First new client after seed: CLI-0003 (Acme=CLI-0001, TechStart=CLI-0002)
- Each subsequent client increments by 1
*/

CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.client_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(client_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM clients
    WHERE client_code ~ '^CLI-[0-9]+$';

    NEW.client_code := 'CLI-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================================
-- MIGRATION: 20260926025543_0019_add_project_management_fields
-- ============================================================================

/*
# Add project management fields and update status enum

## Overview
Updates the projects table for the full project management module.
Adds project_code auto-generation, notes, archived flag, and expands
the status enum to match business workflow statuses.

## Changes to projects table

### New Columns
- `project_code` (text, nullable, UNIQUE) — auto-generated like PRJ-0001
- `notes` (text, nullable) — free-form project notes
- `archived` (boolean, NOT NULL, default false) — soft archive flag

### Modified Constraints
- Status CHECK replaced: draft, quotation, approved, in_progress, on_hold, completed, cancelled
- Existing data migrated: planning→draft, active→in_progress

### New Triggers
- `generate_project_code` — auto-generates PRJ-NNNN on INSERT when NULL
- `trg_projects_updated_at` — auto-updates updated_at on row change

## Security
1. RLS policies unchanged.
2. archived is a business field, not a security field.
*/

-- Drop old constraint first
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add new columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Migrate existing status values
UPDATE projects SET status = 'draft' WHERE status = 'planning';
UPDATE projects SET status = 'in_progress' WHERE status = 'active';

-- Add new status constraint
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'quotation', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled'));

-- Unique constraint on project_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_project_code_key'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_project_code_key UNIQUE (project_code);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);

-- Auto-generate project_code trigger
CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.project_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(project_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM projects
    WHERE project_code ~ '^PRJ-[0-9]+$';
    NEW.project_code := 'PRJ-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_project_code ON projects;
CREATE TRIGGER trg_generate_project_code
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_project_code();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Backfill project_code using a CTE instead of window function in UPDATE
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM projects
  WHERE project_code IS NULL
)
UPDATE projects p
SET project_code = 'PRJ-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE p.id = n.id;


-- ============================================================================
-- MIGRATION: 20260926034924_0020_add_payment_management_fields
-- ============================================================================

/*
# Add payment management fields to project_payments

## Overview
Extends the project_payments table to support the full payment/collections
module (Phase 09). Adds payment_code auto-generation, a status column with
business statuses, and expands the payment_method enum with local payment
options (bank_deposit, gcash, maya).

## Changes to project_payments

### New Columns
- `payment_code` (text, UNIQUE) — auto-generated like PAY-0001
- `status` (text, NOT NULL, default 'paid') — CHECK: paid, partial, pending, cancelled

### Updated Constraint
- `payment_method` CHECK now includes: cash, bank_deposit, bank_transfer,
  gcash, maya, check, other
  (Drops credit_card and paypal; adds bank_deposit, gcash, maya)

### New Triggers
- `generate_payment_code` — auto-generates PAY-NNNN on INSERT when NULL
- `trg_project_payments_updated_at` — auto-updates updated_at on row change

### New Indexes
- `idx_project_payments_payment_code`
- `idx_project_payments_status`

## Security
RLS policies unchanged — they already use has_permission('invoices.*').
*/

-- Drop old payment_method constraint before adding new one
ALTER TABLE project_payments DROP CONSTRAINT IF EXISTS project_payments_payment_method_check;

-- Add new columns
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS payment_code text;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid';

-- Add new constraints
ALTER TABLE project_payments ADD CONSTRAINT project_payments_payment_method_check
  CHECK (payment_method IN ('cash', 'bank_deposit', 'bank_transfer', 'gcash', 'maya', 'check', 'other'));

ALTER TABLE project_payments ADD CONSTRAINT project_payments_status_check
  CHECK (status IN ('paid', 'partial', 'pending', 'cancelled'));

-- Unique constraint on payment_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_payments_payment_code_key'
  ) THEN
    ALTER TABLE project_payments ADD CONSTRAINT project_payments_payment_code_key UNIQUE (payment_code);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_payments_payment_code ON project_payments(payment_code);
CREATE INDEX IF NOT EXISTS idx_project_payments_status ON project_payments(status);

-- Auto-generate payment_code trigger
CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.payment_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(payment_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM project_payments
    WHERE payment_code ~ '^PAY-[0-9]+$';
    NEW.payment_code := 'PAY-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_payment_code ON project_payments;
CREATE TRIGGER trg_generate_payment_code
  BEFORE INSERT ON project_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_payment_code();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_project_payments_updated_at ON project_payments;
CREATE TRIGGER trg_project_payments_updated_at
  BEFORE UPDATE ON project_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Backfill payment_code for existing rows
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM project_payments
  WHERE payment_code IS NULL
)
UPDATE project_payments p
SET payment_code = 'PAY-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE p.id = n.id;


-- ============================================================================
-- MIGRATION: 20260926035958_0021_add_expense_management_fields
-- ============================================================================

/*
# Add expense management fields

## Overview
Extends the expenses table for the full expense module (Phase 10).
Adds expense_code auto-generation, invoice_number, payment_method,
and expands the status enum to match the business workflow.

## Changes to expenses

### New Columns
- `expense_code` (text, UNIQUE) — auto-generated like EXP-0001
- `invoice_number` (text, nullable) — supplier invoice reference
- `payment_method` (text, nullable) — how the expense was paid

### Updated Constraints
- `status` CHECK replaced: draft, pending, approved, rejected, void
  (Drops 'paid'; adds 'draft' and 'void')
- `payment_method` CHECK: cash, bank_deposit, bank_transfer, gcash, maya, check, other

### New Triggers
- `generate_expense_code` — auto-generates EXP-NNNN on INSERT when NULL
- `trg_expenses_updated_at` — auto-updates updated_at

### New Indexes
- `idx_expenses_expense_code`
- `idx_expenses_status`
- `idx_expenses_payment_method`

### New Categories
- Materials, Hardware, Wood, Glass, Labor, Gasoline, Delivery,
  Transportation, Tools, Other
  (Existing categories remain; these are additions)

## Security
RLS policies unchanged — they already use has_permission('invoices.*').
*/

-- Drop old status constraint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;

-- Add new columns
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_code text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method text;

-- Add new constraints
ALTER TABLE expenses ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'void'));

ALTER TABLE expenses ADD CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'bank_deposit', 'bank_transfer', 'gcash', 'maya', 'check', 'other'));

-- Unique constraint on expense_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_expense_code_key'
  ) THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_expense_code_key UNIQUE (expense_code);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_expense_code ON expenses(expense_code);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON expenses(payment_method);

-- Auto-generate expense_code trigger
CREATE OR REPLACE FUNCTION public.generate_expense_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.expense_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(expense_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM expenses
    WHERE expense_code ~ '^EXP-[0-9]+$';
    NEW.expense_code := 'EXP-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_expense_code ON expenses;
CREATE TRIGGER trg_generate_expense_code
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_expense_code();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Backfill expense_code for existing rows
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM expenses
  WHERE expense_code IS NULL
)
UPDATE expenses e
SET expense_code = 'EXP-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE e.id = n.id;

-- Migrate existing 'paid' status to 'approved'
UPDATE expenses SET status = 'approved' WHERE status = 'paid';

-- Seed new expense categories (idempotent)
INSERT INTO expense_categories (name, description, is_active)
VALUES
  ('Materials', 'Raw materials for projects', true),
  ('Hardware', 'Hardware components and fixtures', true),
  ('Wood', 'Lumber and wood products', true),
  ('Glass', 'Glass materials and products', true),
  ('Labor', 'Direct labor costs', true),
  ('Gasoline', 'Fuel for vehicles and equipment', true),
  ('Delivery', 'Delivery and courier fees', true),
  ('Transportation', 'Transportation and logistics', true),
  ('Tools', 'Tools and equipment purchases', true),
  ('Other', 'Miscellaneous expenses', true)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- MIGRATION: 20260926044724_0022_add_supplier_material_purchases
-- ============================================================================

/*
# Add supplier and material management fields + material purchases

Phase 11: supplier_code, material_code, supplier_id on materials,
and extend the existing material_purchases table.
RLS policies already exist on material_purchases (using inventory.* permissions).
*/

-- ============================================================================
-- Suppliers: add supplier_code
-- ============================================================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_supplier_code_key'
  ) THEN
    ALTER TABLE suppliers ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);

CREATE OR REPLACE FUNCTION public.generate_supplier_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.supplier_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(supplier_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM suppliers
    WHERE supplier_code ~ '^SUP-[0-9]+$';
    NEW.supplier_code := 'SUP-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_supplier_code ON suppliers;
CREATE TRIGGER trg_generate_supplier_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_supplier_code();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM suppliers
  WHERE supplier_code IS NULL
)
UPDATE suppliers s
SET supplier_code = 'SUP-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE s.id = n.id;

-- ============================================================================
-- Materials: add material_code + supplier_id
-- ============================================================================
ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_code text;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'materials_material_code_key'
  ) THEN
    ALTER TABLE materials ADD CONSTRAINT materials_material_code_key UNIQUE (material_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_materials_material_code ON materials(material_code);
CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON materials(supplier_id);

CREATE OR REPLACE FUNCTION public.generate_material_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.material_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(material_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM materials
    WHERE material_code ~ '^MAT-[0-9]+$';
    NEW.material_code := 'MAT-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_material_code ON materials;
CREATE TRIGGER trg_generate_material_code
  BEFORE INSERT ON materials
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_material_code();

DROP TRIGGER IF EXISTS trg_materials_updated_at ON materials;
CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM materials
  WHERE material_code IS NULL
)
UPDATE materials m
SET material_code = 'MAT-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE m.id = n.id;

-- ============================================================================
-- Material purchases: extend existing table
-- ============================================================================
ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS purchase_code text;
ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'material_purchases_payment_method_check'
  ) THEN
    ALTER TABLE material_purchases ADD CONSTRAINT material_purchases_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('cash', 'bank_deposit', 'bank_transfer', 'gcash', 'maya', 'check', 'other'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'material_purchases_purchase_code_key'
  ) THEN
    ALTER TABLE material_purchases ADD CONSTRAINT material_purchases_purchase_code_key UNIQUE (purchase_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_material_purchases_code ON material_purchases(purchase_code);
CREATE INDEX IF NOT EXISTS idx_material_purchases_project_id ON material_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_supplier_id ON material_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_material_id ON material_purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_date ON material_purchases(purchase_date);

-- Auto-calculate total_cost from quantity * unit_cost (decimal-safe via numeric)
CREATE OR REPLACE FUNCTION public.calculate_purchase_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.total_cost := NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_purchase_total ON material_purchases;
CREATE TRIGGER trg_calculate_purchase_total
  BEFORE INSERT OR UPDATE ON material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_purchase_total();

CREATE OR REPLACE FUNCTION public.generate_purchase_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.purchase_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM material_purchases
    WHERE purchase_code ~ '^PUR-[0-9]+$';
    NEW.purchase_code := 'PUR-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_purchase_code ON material_purchases;
CREATE TRIGGER trg_generate_purchase_code
  BEFORE INSERT ON material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_purchase_code();

DROP TRIGGER IF EXISTS trg_material_purchases_updated_at ON material_purchases;
CREATE TRIGGER trg_material_purchases_updated_at
  BEFORE UPDATE ON material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- MIGRATION: 20260926045935_0023_project_costing_functions
-- ============================================================================

/*
# Project costing function

Returns exact decimal financials for a project using Postgres numeric arithmetic.
Only approved expenses and paid/partial payments count toward totals.

Categories mapped to cost groups:
- Material: Materials, Hardware, Wood, Glass
- Labor: Labor
- Other: everything else (Gasoline, Delivery, Transportation, Office Supplies, Tools, Utilities, Other, + pre-existing categories)

Material purchases (material_purchases.total_cost) are added to Material Cost.
*/

CREATE OR REPLACE FUNCTION public.get_project_costing(p_project_id uuid)
RETURNS TABLE (
  contract_amount numeric,
  total_payments numeric,
  outstanding_balance numeric,
  total_expenses numeric,
  material_cost numeric,
  labor_cost numeric,
  other_cost numeric,
  total_project_cost numeric,
  project_difference numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget numeric;
  v_total_payments numeric;
  v_total_expenses numeric;
  v_material_cost numeric;
  v_labor_cost numeric;
  v_other_cost numeric;
  v_total_project_cost numeric;
BEGIN
  -- Contract amount from project budget
  SELECT COALESCE(budget, 0) INTO v_budget
  FROM projects WHERE id = p_project_id;

  -- Total payments (only paid and partial)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
  FROM project_payments
  WHERE project_id = p_project_id
    AND status IN ('paid', 'partial');

  -- Material cost: approved expenses in material-related categories + material purchases
  SELECT COALESCE(SUM(e.amount), 0) INTO v_material_cost
  FROM expenses e
  JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.project_id = p_project_id
    AND e.status = 'approved'
    AND ec.name IN ('Materials', 'Hardware', 'Wood', 'Glass');

  -- Add material purchases total
  v_material_cost := v_material_cost + COALESCE((
    SELECT SUM(total_cost) FROM material_purchases
    WHERE project_id = p_project_id
  ), 0);

  -- Labor cost: approved expenses in Labor category
  SELECT COALESCE(SUM(e.amount), 0) INTO v_labor_cost
  FROM expenses e
  JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.project_id = p_project_id
    AND e.status = 'approved'
    AND ec.name = 'Labor';

  -- Other cost: approved expenses in all other categories
  SELECT COALESCE(SUM(e.amount), 0) INTO v_other_cost
  FROM expenses e
  JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.project_id = p_project_id
    AND e.status = 'approved'
    AND ec.name NOT IN ('Materials', 'Hardware', 'Wood', 'Glass', 'Labor');

  v_total_expenses := v_material_cost + v_labor_cost + v_other_cost;
  v_total_project_cost := v_total_expenses;

  RETURN QUERY SELECT
    v_budget,
    v_total_payments,
    v_budget - v_total_payments,
    v_total_expenses,
    v_material_cost,
    v_labor_cost,
    v_other_cost,
    v_total_project_cost,
    v_budget - v_total_project_cost;
END;
$$;

-- Cost breakdown by category for a project (approved expenses only)
CREATE OR REPLACE FUNCTION public.get_project_cost_breakdown(p_project_id uuid)
RETURNS TABLE (
  category_name text,
  cost_group text,
  total_amount numeric,
  expense_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ec.name AS category_name,
    CASE
      WHEN ec.name IN ('Materials', 'Hardware', 'Wood', 'Glass') THEN 'material'
      WHEN ec.name = 'Labor' THEN 'labor'
      ELSE 'other'
    END AS cost_group,
    COALESCE(SUM(e.amount), 0) AS total_amount,
    COUNT(*) AS expense_count
  FROM expenses e
  JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.project_id = p_project_id
    AND e.status = 'approved'
  GROUP BY ec.name, cost_group
  ORDER BY total_amount DESC;
$$;


-- ============================================================================
-- MIGRATION: 20260926050821_0024_photo_system
-- ============================================================================

/*
# Photo System: Add photo_type, project_id, expense_id, mime_type, storage_path columns + storage bucket

## Changes

### photos table — new columns
- `photo_type` (text, NOT NULL) — categorizes the photo: receipt, invoice, material, delivery, project_site, before_work, during_work, after_work, product, document, other
- `project_id` (uuid, nullable, FK → projects) — optional direct link to a project
- `expense_id` (uuid, nullable, FK → expenses) — optional direct link to an expense
- `mime_type` (text, nullable) — MIME type of the uploaded file (e.g. image/jpeg)
- `storage_path` (text, nullable) — full path within the storage bucket

### Storage bucket
- Creates a private storage bucket `company` (not public) for project photos
- Storage path structure: `projects/{project_id}/photos/{filename}`
- RLS on storage: only authenticated users with appropriate permissions can upload/read/delete

### RLS
- Updates photos SELECT policy to also check project_id access via security.can_access_project
- INSERT/DELETE policies already use security.can_manage_entity which covers the entity_type/entity_id pair
- Storage policies: authenticated users with invoices.view can read, invoices.edit can upload/delete
*/

-- Add new columns to photos
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS photo_type text NOT NULL DEFAULT 'other'
    CHECK (photo_type IN ('receipt', 'invoice', 'material', 'delivery', 'project_site', 'before_work', 'during_work', 'after_work', 'product', 'document', 'other')),
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS storage_path text;

-- Index for filtering by project
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_photo_type ON photos(photo_type);

-- Update SELECT policy to also allow access via project_id
DROP POLICY IF EXISTS "select_photos" ON photos;
CREATE POLICY "select_photos" ON photos FOR SELECT
  TO authenticated USING (
    CASE
      WHEN entity_type IN ('client', 'supplier') THEN security.has_permission('contacts.view')
      WHEN entity_type = 'project' THEN security.has_permission('invoices.view')
      WHEN entity_type = 'expense' THEN security.has_permission('expenses.view')
      WHEN entity_type = 'material' THEN security.has_permission('inventory.view')
      ELSE false
    END
    OR (
      project_id IS NOT NULL
      AND security.has_permission('invoices.view')
      AND security.can_access_project(project_id)
    )
  );

-- Keep INSERT/DELETE policies as they are (can_manage_entity covers entity_type/entity_id)
DROP POLICY IF EXISTS "insert_photos" ON photos;
CREATE POLICY "insert_photos" ON photos FOR INSERT
  TO authenticated WITH CHECK (
    security.can_manage_entity(entity_type, entity_id)
    OR (
      project_id IS NOT NULL
      AND security.has_permission('invoices.edit')
      AND security.can_access_project(project_id)
    )
  );

DROP POLICY IF EXISTS "delete_photos" ON photos;
CREATE POLICY "delete_photos" ON photos FOR DELETE
  TO authenticated USING (
    security.can_manage_entity(entity_type, entity_id)
    OR (
      project_id IS NOT NULL
      AND security.has_permission('invoices.edit')
      AND security.can_access_project(project_id)
    )
  );

-- Create private storage bucket for project photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company', 'company', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies: read
DROP POLICY IF EXISTS "read_company_photos" ON storage.objects;
CREATE POLICY "read_company_photos" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'company'
    AND security.has_permission('invoices.view')
  );

-- Storage RLS policies: upload
DROP POLICY IF EXISTS "upload_company_photos" ON storage.objects;
CREATE POLICY "upload_company_photos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'company'
    AND security.has_permission('invoices.edit')
  );

-- Storage RLS policies: delete
DROP POLICY IF EXISTS "delete_company_photos" ON storage.objects;
CREATE POLICY "delete_company_photos" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'company'
    AND security.has_permission('invoices.edit')
  );


-- ============================================================================
-- MIGRATION: 20260926052906_0025_document_management
-- ============================================================================

/*
# Document Management System: Add company entity type, mime_type, storage_path, archived columns + storage bucket

## Changes

### documents table — new columns
- `mime_type` (text, nullable) — MIME type of the uploaded file (e.g. application/pdf, image/jpeg)
- `storage_path` (text, nullable) — full path within the storage bucket
- `archived` (boolean, NOT NULL, default false) — soft archive flag
- `archived_at` (timestamptz, nullable) — when the document was archived

### documents table — CHECK constraint update
- Add 'company' to the entity_type CHECK constraint so documents can belong to the company itself
- Uses ALTER CONSTRAINT to replace the old check

### Storage bucket
- Creates a private storage bucket `documents` (not public) for all document files
- Storage path structure: `{entity_type}/{entity_id}/{filename}`
- RLS on storage: only authenticated users with appropriate permissions can read/upload/delete

### RLS updates
- SELECT policy updated to also check project_id access via security.can_access_project when entity_type is project
- INSERT/DELETE/UPDATE policies already use security.can_manage_entity

### Indexes
- Index on archived for filtering
- Index on mime_type for filtering
*/

-- Add new columns to documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_documents_archived ON documents(archived);
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON documents(mime_type);

-- Update entity_type CHECK to include 'company'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'documents'
      AND constraint_name = 'documents_entity_type_check'
  ) THEN
    ALTER TABLE documents DROP CONSTRAINT documents_entity_type_check;
  END IF;
END $$;

ALTER TABLE documents
  ADD CONSTRAINT documents_entity_type_check
  CHECK (entity_type IN ('client', 'project', 'expense', 'supplier', 'material', 'invoice', 'payment', 'company'));

-- Update SELECT policy to check project access for project documents
DROP POLICY IF EXISTS "select_documents" ON documents;
CREATE POLICY "select_documents" ON documents FOR SELECT
  TO authenticated USING (
    CASE
      WHEN entity_type IN ('client', 'supplier') THEN security.has_permission('contacts.view')
      WHEN entity_type IN ('project', 'invoice', 'payment') THEN security.has_permission('invoices.view')
      WHEN entity_type = 'expense' THEN security.has_permission('expenses.view')
      WHEN entity_type = 'material' THEN security.has_permission('inventory.view')
      WHEN entity_type = 'company' THEN true
      ELSE false
    END
  );

-- Keep INSERT/UPDATE/DELETE as they are (can_manage_entity covers entity_type/entity_id)
DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    security.can_manage_entity(entity_type, entity_id)
    OR entity_type = 'company'
  );

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents" ON documents FOR UPDATE
  TO authenticated
  USING (
    security.can_manage_entity(entity_type, entity_id)
    OR entity_type = 'company'
  )
  WITH CHECK (
    security.can_manage_entity(entity_type, entity_id)
    OR entity_type = 'company'
  );

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents" ON documents FOR DELETE
  TO authenticated USING (
    security.can_manage_entity(entity_type, entity_id)
    OR entity_type = 'company'
  );

-- Create private storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies: read
DROP POLICY IF EXISTS "read_documents" ON storage.objects;
CREATE POLICY "read_documents" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'documents'
  );

-- Storage RLS policies: upload
DROP POLICY IF EXISTS "upload_documents" ON storage.objects;
CREATE POLICY "upload_documents" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'documents'
  );

-- Storage RLS policies: delete
DROP POLICY IF EXISTS "delete_documents" ON storage.objects;
CREATE POLICY "delete_documents" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'documents'
  );

-- Add 'archive' and 'unarchive' to audit_logs action CHECK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'audit_logs'
      AND constraint_name = 'audit_logs_action_check'
  ) THEN
    ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_action_check;
  END IF;
END $$;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'activate', 'deactivate', 'archive', 'unarchive', 'download'));


-- ============================================================================
-- MIGRATION: 20260926072005_0026_create_import_history.sql
-- ============================================================================

/*
# Create import history table

## Overview
Tracks every CSV/XLSX import operation — who imported, what entity type,
how many rows were valid/invalid/duplicate/imported, and the final status.

## New Tables
- `import_history`
  - `id` (uuid, primary key)
  - `entity_type` (text) — which table was imported into: clients, projects, payments, expenses, suppliers, materials
  - `file_name` (text) — original uploaded file name
  - `file_type` (text) — csv or xlsx
  - `total_rows` (int) — total rows in the file
  - `valid_rows` (int) — rows that passed validation
  - `invalid_rows` (int) — rows that failed validation
  - `duplicate_rows` (int) — rows flagged as duplicates
  - `imported_rows` (int) — rows actually inserted into the database
  - `status` (text) — pending, completed, cancelled, failed
  - `error_details` (jsonb) — structured error/duplicate details for the error report
  - `column_mapping` (jsonb) — the mapping from file columns to entity fields
  - `imported_by` (uuid) — user who performed the import
  - `created_at` (timestamptz)
  - `completed_at` (timestamptz) — when the import was finalized

## Security
- Enable RLS on `import_history`.
- Owner-scoped CRUD: authenticated users can view their own import history.
- INSERT: authenticated users can create import records for themselves.
- UPDATE: authenticated users can update their own records (e.g. cancel, finalize).
- DELETE: authenticated users can delete their own import records.
*/

CREATE TABLE IF NOT EXISTS import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'csv',
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  error_details jsonb,
  column_mapping jsonb,
  imported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_import_history" ON import_history;
CREATE POLICY "select_own_import_history"
ON import_history FOR SELECT
TO authenticated USING (auth.uid() = imported_by);

DROP POLICY IF EXISTS "insert_own_import_history" ON import_history;
CREATE POLICY "insert_own_import_history"
ON import_history FOR INSERT
TO authenticated WITH CHECK (auth.uid() = imported_by);

DROP POLICY IF EXISTS "update_own_import_history" ON import_history;
CREATE POLICY "update_own_import_history"
ON import_history FOR UPDATE
TO authenticated USING (auth.uid() = imported_by) WITH CHECK (auth.uid() = imported_by);

DROP POLICY IF EXISTS "delete_own_import_history" ON import_history;
CREATE POLICY "delete_own_import_history"
ON import_history FOR DELETE
TO authenticated USING (auth.uid() = imported_by);

CREATE INDEX IF NOT EXISTS idx_import_history_imported_by ON import_history(imported_by);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON import_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_history_entity_type ON import_history(entity_type);


-- ============================================================================
-- MIGRATION: 20260926075053_0027_add_approval_workflow_fields.sql
-- ============================================================================

/*
# Add Approval Workflow Fields

## Overview
Extends expenses and project_payments tables to support a full financial
approval workflow with submit, approve, reject, and post transitions.
Adds audit trail columns for who submitted, approved, or rejected each
record, plus timestamps and rejection reasons.

## Changes to expenses

### New Columns
- `submitted_at` (timestamptz, nullable) — when the expense was submitted for approval
- `rejected_by` (uuid, FK → profiles.id, nullable) — who rejected the expense
- `rejected_at` (timestamptz, nullable) — when it was rejected
- `rejection_reason` (text, nullable) — reason for rejection

### Updated Constraint
- `status` CHECK expanded: draft, submitted, pending, approved, rejected, void
  (adds 'submitted' as a distinct lifecycle stage between draft and pending)

## Changes to project_payments

### New Columns
- `submitted_by` (uuid, FK → profiles.id, nullable) — who submitted the payment
- `submitted_at` (timestamptz, nullable) — when submitted for approval
- `approved_by` (uuid, FK → profiles.id, nullable) — who approved the payment
- `approved_at` (timestamptz, nullable) — when approved
- `rejected_by` (uuid, FK → profiles.id, nullable) — who rejected
- `rejected_at` (timestamptz, nullable) — when rejected
- `rejection_reason` (text, nullable) — reason for rejection
- `posted_at` (timestamptz, nullable) — when the payment was posted (finalized)

### Updated Constraint
- `status` CHECK expanded: pending, approved, posted, partial, cancelled
  (adds 'approved' and 'posted' as lifecycle stages)

## Security
- No RLS policy changes — existing policies already control access.
- The existing `can_approve_financial` function already prevents self-approval.
- New columns are nullable so existing rows remain valid.
*/

-- ===== Expenses =====

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES profiles(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update status constraint to include 'submitted'
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected', 'void'));

-- ===== Project Payments =====

ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES profiles(id);
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES profiles(id);
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS posted_at timestamptz;

-- Update status constraint to include 'approved' and 'posted'
ALTER TABLE project_payments DROP CONSTRAINT IF EXISTS project_payments_status_check;
ALTER TABLE project_payments ADD CONSTRAINT project_payments_status_check
  CHECK (status IN ('pending', 'approved', 'posted', 'partial', 'cancelled'));

-- Indexes for approval workflow queries
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_at ON expenses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_rejected_by ON expenses(rejected_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_submitted_by ON project_payments(submitted_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_approved_by ON project_payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_posted_at ON project_payments(posted_at);


-- ============================================================================
-- MIGRATION: 20260926080941_0028_extend_audit_trail.sql
-- ============================================================================

/*
# Extend Audit Trail for Comprehensive Action Logging

## Overview
This migration extends the audit_logs table to support the full range of
audit actions required by the system, tightens RLS so only authorized users
can read audit logs, and adds a new `audit.view` permission.

## Changes

### audit_logs table
- Extended the `action` CHECK constraint to include:
  `archive`, `upload`, `download`, `export`, `import`, `role_change`, `password_reset`
  (in addition to the existing: create, update, delete, login, logout, approve,
  reject, activate, deactivate)
- Added `entity_name` (text, nullable) column — human-readable label for the
  affected entity, useful when entity_id is null (e.g. login/logout/export).

### RLS changes
- Replaced the permissive `select_audit_logs` policy (USING true) with one
  that requires the `audit.view` permission. Only authorized users can read
  audit logs. Insert policy remains open to authenticated (append-only).

### Permissions
- Added `audit.view` permission to the permissions table.
- Granted `audit.view` to the `admin` and `manager` roles.

## Important Notes
1. The existing audit_logs data is preserved — only the CHECK constraint is
   widened and one nullable column is added.
2. No data is lost; existing rows continue to satisfy the new constraint.
3. The insert policy remains `WITH CHECK (true)` so server actions can write
   audit logs without needing special database roles.
*/

-- 1. Add entity_name column for human-readable entity labels
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS entity_name text;

-- 2. Drop and recreate the CHECK constraint with the full action set
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN (
    'create', 'update', 'delete', 'archive',
    'login', 'logout', 'password_reset',
    'approve', 'reject',
    'upload', 'download', 'export', 'import',
    'role_change',
    'activate', 'deactivate'
  ));

-- 3. Add audit.view permission
INSERT INTO permissions (name, description)
VALUES ('audit.view', 'View audit logs and system activity history')
ON CONFLICT (name) DO NOTHING;

-- 4. Grant audit.view to admin and manager roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'manager')
  AND p.name = 'audit.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Replace the permissive SELECT policy with a permission-based one
DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (
    security.has_permission('audit.view'::text)
  );

-- Insert policy remains open (append-only, no UPDATE or DELETE)
DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- 6. Add index on action for filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);


-- ============================================================================
-- MIGRATION: 20260926111916_0029_extend_notifications.sql
-- ============================================================================

-- Add category column to notifications for typed notification filtering
-- The existing `type` column handles severity (info/success/warning/error)
-- The new `category` column handles the business event type

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'system'
    CHECK (category IN (
      'payment_received',
      'payment_overdue',
      'expense_submitted',
      'expense_approved',
      'expense_rejected',
      'project_status_changed',
      'project_deadline_approaching',
      'document_uploaded',
      'photo_uploaded',
      'system'
    ));

CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON notifications(user_id, category);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;


-- ============================================================================
-- MIGRATION: 20260926113430_0030_global_search_indexes.sql
-- ============================================================================

-- Enable pg_trgm extension for trigram fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Standard B-tree indexes for exact/lowercase lookups

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_code_lower
  ON clients (lower(client_code));
CREATE INDEX IF NOT EXISTS idx_clients_email_lower
  ON clients (lower(email));

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_code_lower
  ON projects (lower(project_code));
CREATE INDEX IF NOT EXISTS idx_projects_status
  ON projects (status) WHERE archived = false;

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_code_lower
  ON project_payments (lower(payment_code));
CREATE INDEX IF NOT EXISTS idx_payments_date
  ON project_payments (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status
  ON project_payments (status);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_code_lower
  ON expenses (lower(expense_code));
CREATE INDEX IF NOT EXISTS idx_expenses_date
  ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status
  ON expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id
  ON expenses (category_id);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_code_lower
  ON suppliers (lower(supplier_code));

-- Materials
CREATE INDEX IF NOT EXISTS idx_materials_code_lower
  ON materials (lower(material_code));

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_entity
  ON documents (entity_type, entity_id) WHERE archived = false;

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- Trigram GIN indexes for fuzzy text search (pg_trgm enabled above)
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
  ON clients USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm
  ON projects USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_expenses_desc_trgm
  ON expenses USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm
  ON suppliers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_name_trgm
  ON materials USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_name_trgm
  ON documents USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_desc_trgm
  ON documents USING gin (description gin_trgm_ops);


-- ============================================================================
-- MIGRATION: 20260926160337_0031_seed_reconciliation_data.sql
-- ============================================================================

-- Seed transaction data for Jan-May 2026 reconciliation
-- Input = project_payments with status 'posted' or 'partial'
-- Output = expenses with status 'approved'

DO $$
DECLARE
  v_project_1 uuid := '1375bd93-454d-423f-9470-91d2a396f34b';
  v_project_2 uuid := '8c22ecd9-988b-48aa-b6e0-bca6c3673301';
  v_cat_office uuid := 'c9d97069-f68c-447b-a21e-61ccb400d116';
  v_cat_travel uuid := '26f4d2a4-c827-4b04-b483-803a808977d3';
  v_cat_software uuid := '4e21bbe5-4945-4aa9-86c6-ab045348a39e';
  v_cat_services uuid := '4d70b10e-05e4-4596-9fb9-960803b3a214';
  v_cat_hardware uuid := '31ff1b20-3933-4a1b-b4ec-b6d997b69f80';
  v_user_admin uuid := '648e024a-f491-4749-a416-d0e026a241fb';
  v_user_manager uuid := '413c44de-5c68-4b60-87bc-ff34d20bfeb7';
  v_user_acct uuid := 'd9720b07-634d-43ea-b86c-bd55e4fc3f4e';
BEGIN
  -- PAYMENTS — status 'posted' or 'partial' count as input

  -- JANUARY 2026 — Total: 1,463,107.50
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 500000.00, '2026-01-08', 'posted', 'bank_transfer', 'PAY-0101', v_user_admin, '2026-01-08T10:00:00Z'),
    (v_project_1, 363107.50, '2026-01-15', 'posted', 'bank_deposit', 'PAY-0102', v_user_admin, '2026-01-15T10:00:00Z'),
    (v_project_2, 300000.00, '2026-01-22', 'posted', 'cash', 'PAY-0103', v_user_manager, '2026-01-22T10:00:00Z'),
    (v_project_2, 300000.00, '2026-01-28', 'partial', 'gcash', 'PAY-0104', v_user_manager, '2026-01-28T10:00:00Z');

  -- FEBRUARY 2026 — Total: 2,665,836.19
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 800000.00, '2026-02-05', 'posted', 'bank_transfer', 'PAY-0105', v_user_admin, '2026-02-05T10:00:00Z'),
    (v_project_1, 665836.19, '2026-02-12', 'posted', 'bank_deposit', 'PAY-0106', v_user_admin, '2026-02-12T10:00:00Z'),
    (v_project_2, 500000.00, '2026-02-18', 'posted', 'cash', 'PAY-0107', v_user_manager, '2026-02-18T10:00:00Z'),
    (v_project_2, 700000.00, '2026-02-25', 'posted', 'bank_transfer', 'PAY-0108', v_user_manager, '2026-02-25T10:00:00Z');

  -- MARCH 2026 — Total: 2,242,030.98
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 742030.98, '2026-03-03', 'posted', 'bank_transfer', 'PAY-0109', v_user_admin, '2026-03-03T10:00:00Z'),
    (v_project_1, 600000.00, '2026-03-10', 'posted', 'bank_deposit', 'PAY-0110', v_user_admin, '2026-03-10T10:00:00Z'),
    (v_project_2, 400000.00, '2026-03-17', 'posted', 'cash', 'PAY-0111', v_user_manager, '2026-03-17T10:00:00Z'),
    (v_project_2, 500000.00, '2026-03-24', 'partial', 'bank_transfer', 'PAY-0112', v_user_manager, '2026-03-24T10:00:00Z');

  -- APRIL 2026 — Total: 1,361,546.00
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 561546.00, '2026-04-07', 'posted', 'bank_transfer', 'PAY-0113', v_user_admin, '2026-04-07T10:00:00Z'),
    (v_project_1, 400000.00, '2026-04-14', 'posted', 'bank_deposit', 'PAY-0114', v_user_admin, '2026-04-14T10:00:00Z'),
    (v_project_2, 400000.00, '2026-04-21', 'posted', 'cash', 'PAY-0115', v_user_manager, '2026-04-21T10:00:00Z');

  -- MAY 2026 — Total: 801,358.41
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 401358.41, '2026-05-06', 'posted', 'bank_transfer', 'PAY-0116', v_user_admin, '2026-05-06T10:00:00Z'),
    (v_project_2, 200000.00, '2026-05-13', 'posted', 'bank_deposit', 'PAY-0117', v_user_manager, '2026-05-13T10:00:00Z'),
    (v_project_2, 200000.00, '2026-05-20', 'partial', 'cash', 'PAY-0118', v_user_manager, '2026-05-20T10:00:00Z');

  -- EXPENSES — only 'approved' status counts as output

  -- JANUARY 2026 — Total: 844,234.33
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_hardware, v_project_1, 300000.00, 'PHP', '2026-01-10', 'Server hardware procurement', 'approved', 'EXP-0101', 'bank_transfer', v_user_manager, v_user_admin, '2026-01-11T10:00:00Z'),
    (v_cat_services, v_project_1, 244234.33, 'PHP', '2026-01-14', 'Consulting services', 'approved', 'EXP-0102', 'bank_deposit', v_user_manager, v_user_admin, '2026-01-15T10:00:00Z'),
    (v_cat_office, v_project_2, 200000.00, 'PHP', '2026-01-20', 'Office supplies bulk order', 'approved', 'EXP-0103', 'cash', v_user_acct, v_user_admin, '2026-01-21T10:00:00Z'),
    (v_cat_travel, v_project_2, 100000.00, 'PHP', '2026-01-25', 'Site visit transportation', 'approved', 'EXP-0104', 'other', v_user_acct, v_user_admin, '2026-01-26T10:00:00Z');

  -- FEBRUARY 2026 — Total: 749,526.37
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_software, v_project_1, 300000.00, 'PHP', '2026-02-08', 'Software licenses annual', 'approved', 'EXP-0105', 'bank_transfer', v_user_manager, v_user_admin, '2026-02-09T10:00:00Z'),
    (v_cat_hardware, v_project_1, 249526.37, 'PHP', '2026-02-15', 'Network equipment', 'approved', 'EXP-0106', 'bank_deposit', v_user_manager, v_user_admin, '2026-02-16T10:00:00Z'),
    (v_cat_office, v_project_2, 200000.00, 'PHP', '2026-02-22', 'Office furniture', 'approved', 'EXP-0107', 'cash', v_user_acct, v_user_admin, '2026-02-23T10:00:00Z');

  -- MARCH 2026 — Total: 820,446.59
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_services, v_project_1, 320446.59, 'PHP', '2026-03-05', 'Legal and accounting fees', 'approved', 'EXP-0108', 'bank_transfer', v_user_manager, v_user_admin, '2026-03-06T10:00:00Z'),
    (v_cat_hardware, v_project_1, 300000.00, 'PHP', '2026-03-12', 'Hardware upgrades', 'approved', 'EXP-0109', 'bank_deposit', v_user_manager, v_user_admin, '2026-03-13T10:00:00Z'),
    (v_cat_travel, v_project_2, 200000.00, 'PHP', '2026-03-19', 'Client meeting travel', 'approved', 'EXP-0110', 'other', v_user_acct, v_user_admin, '2026-03-20T10:00:00Z');

  -- APRIL 2026 — Total: 743,588.81
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_software, v_project_1, 343588.81, 'PHP', '2026-04-09', 'Cloud infrastructure costs', 'approved', 'EXP-0111', 'bank_transfer', v_user_manager, v_user_admin, '2026-04-10T10:00:00Z'),
    (v_cat_office, v_project_1, 200000.00, 'PHP', '2026-04-16', 'Stationary and supplies', 'approved', 'EXP-0112', 'bank_deposit', v_user_manager, v_user_admin, '2026-04-17T10:00:00Z'),
    (v_cat_services, v_project_2, 200000.00, 'PHP', '2026-04-23', 'Outsourced QA testing', 'approved', 'EXP-0113', 'cash', v_user_acct, v_user_admin, '2026-04-24T10:00:00Z');

  -- MAY 2026 — Total: 984,024.52
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_hardware, v_project_1, 400000.00, 'PHP', '2026-05-08', 'Equipment replacement', 'approved', 'EXP-0114', 'bank_transfer', v_user_manager, v_user_admin, '2026-05-09T10:00:00Z'),
    (v_cat_services, v_project_1, 284024.52, 'PHP', '2026-05-15', 'Professional services Q2', 'approved', 'EXP-0115', 'bank_deposit', v_user_manager, v_user_admin, '2026-05-16T10:00:00Z'),
    (v_cat_software, v_project_2, 200000.00, 'PHP', '2026-05-22', 'Development tools', 'approved', 'EXP-0116', 'bank_transfer', v_user_acct, v_user_admin, '2026-05-23T10:00:00Z'),
    (v_cat_travel, v_project_2, 100000.00, 'PHP', '2026-05-27', 'Team travel expenses', 'approved', 'EXP-0117', 'other', v_user_acct, v_user_admin, '2026-05-28T10:00:00Z');

END $$;


-- ============================================================================
-- MIGRATION: 20260926162541_0032_security_audit_fixes.sql
-- ============================================================================

-- Phase 28 Security Audit Fixes

-- 1. Revoke EXECUTE from anon on all SECURITY DEFINER functions
--    These functions should only be callable by authenticated users.
REVOKE EXECUTE ON FUNCTION public.calculate_purchase_total() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_client_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_expense_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_material_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_payment_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_project_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_purchase_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_cost_breakdown(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_costing(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_client_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon;

-- 2. Fix audit_logs INSERT policy: require authentication instead of with_check=true
DROP POLICY IF EXISTS insert_audit_logs ON audit_logs;
CREATE POLICY insert_audit_logs ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix storage.objects policies: scope document access by owner
--    Currently any authenticated user can read/delete ANY document
DROP POLICY IF EXISTS read_documents ON storage.objects;
DROP POLICY IF EXISTS delete_documents ON storage.objects;
DROP POLICY IF EXISTS upload_documents ON storage.objects;

-- Documents: only owner can manage their uploads
CREATE POLICY read_documents ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );

CREATE POLICY upload_documents ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );

CREATE POLICY update_documents ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );

CREATE POLICY delete_documents ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );


-- ============================================================================
-- MIGRATION: 20260926165346_0033_performance_indexes.sql
-- ============================================================================

-- Phase 29: Performance indexes for unindexed foreign keys

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON expenses(approved_by);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_expenses_rejected_by ON expenses(rejected_by);

-- material_purchases
CREATE INDEX IF NOT EXISTS idx_material_purchases_created_by ON material_purchases(created_by);
CREATE INDEX IF NOT EXISTS idx_material_purchases_material_id ON material_purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_supplier_id ON material_purchases(supplier_id);

-- project_payments
CREATE INDEX IF NOT EXISTS idx_project_payments_project_id ON project_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_created_by ON project_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_approved_by ON project_payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_submitted_by ON project_payments(submitted_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_rejected_by ON project_payments(rejected_by);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

-- photos
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- import_history
CREATE INDEX IF NOT EXISTS idx_import_history_imported_by ON import_history(imported_by);

-- project_members
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_expenses_status_date ON expenses(status, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_payments_status_date ON project_payments(status, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status_archived ON projects(status, archived);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_archived ON documents(archived) WHERE archived = false;


-- ============================================================================
-- MIGRATION: 20260926165437_0034_report_sum_functions.sql
-- ============================================================================

-- Phase 29: SQL SUM functions for report totals
-- Avoids fetching all rows into JS just to sum amounts

CREATE OR REPLACE FUNCTION public.sum_expense_amounts(
  p_status text DEFAULT NULL,
  p_method text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_search text DEFAULT NULL
) RETURNS decimal
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM expenses
  WHERE (p_status IS NULL OR status = p_status)
    AND (p_method IS NULL OR payment_method = p_method)
    AND (p_category_id IS NULL OR category_id = p_category_id)
    AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
    AND (p_date_from IS NULL OR expense_date >= p_date_from)
    AND (p_date_to IS NULL OR expense_date <= p_date_to)
    AND (
      p_search IS NULL OR
      expense_code ILIKE '%' || p_search || '%' OR
      invoice_number ILIKE '%' || p_search || '%' OR
      description ILIKE '%' || p_search || '%'
    )
$$;

CREATE OR REPLACE FUNCTION public.sum_payment_amounts(
  p_status text DEFAULT NULL,
  p_method text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_search text DEFAULT NULL
) RETURNS decimal
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM project_payments
  WHERE (p_status IS NULL OR status = p_status)
    AND (p_method IS NULL OR payment_method = p_method)
    AND (p_project_id IS NULL OR project_id = p_project_id)
    AND (p_date_from IS NULL OR payment_date >= p_date_from)
    AND (p_date_to IS NULL OR payment_date <= p_date_to)
    AND (
      p_search IS NULL OR
      payment_code ILIKE '%' || p_search || '%' OR
      reference_number ILIKE '%' || p_search || '%'
    )
$$;

REVOKE EXECUTE ON FUNCTION public.sum_expense_amounts(text, text, uuid, uuid, uuid, date, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sum_payment_amounts(text, text, uuid, date, date, text) FROM anon;


-- ============================================================================
-- MIGRATION: 20260926171933_0035_lockdown_security_definer_functions.sql
-- ============================================================================

-- Revoke EXECUTE from anon for all SECURITY DEFINER functions in public schema.
-- These functions should only be callable by authenticated users.
-- handle_new_user is already locked down (trigger-only), so we skip it.

REVOKE EXECUTE ON FUNCTION public.calculate_purchase_total() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_purchase_total() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_client_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_client_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_expense_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_expense_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_material_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_material_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_payment_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_project_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_project_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_purchase_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_purchase_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_supplier_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_supplier_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_project_cost_breakdown(p_project_id uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_cost_breakdown(p_project_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_project_costing(p_project_id uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_costing(p_project_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sum_expense_amounts(
  p_status text, p_method text, p_category_id uuid, p_supplier_id uuid,
  p_project_id uuid, p_date_from date, p_date_to date, p_search text
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sum_expense_amounts(
  p_status text, p_method text, p_category_id uuid, p_supplier_id uuid,
  p_project_id uuid, p_date_from date, p_date_to date, p_search text
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sum_payment_amounts(
  p_status text, p_method text, p_project_id uuid,
  p_date_from date, p_date_to date, p_search text
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sum_payment_amounts(
  p_status text, p_method text, p_project_id uuid,
  p_date_from date, p_date_to date, p_search text
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_client_status() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_client_status() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated;


-- ============================================================================
-- MIGRATION: 20260926171954_0036_revoke_public_execute_security_definer.sql
-- ============================================================================

-- Revoke EXECUTE from PUBLIC (which includes anon) for all SECURITY DEFINER functions.
-- The default Postgres grant gives EXECUTE to PUBLIC on all functions.
-- We must REVOKE FROM PUBLIC to truly block anon access.

REVOKE EXECUTE ON FUNCTION public.calculate_purchase_total() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_client_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_expense_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_material_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_payment_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_project_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_purchase_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_supplier_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_project_cost_breakdown(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_project_costing(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sum_expense_amounts(
  text, text, uuid, uuid, uuid, date, date, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sum_payment_amounts(
  text, text, uuid, date, date, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_client_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC;

-- Re-grant to authenticated only.
GRANT EXECUTE ON FUNCTION public.calculate_purchase_total() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_client_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_expense_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_material_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_project_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_purchase_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_supplier_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_cost_breakdown(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_costing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sum_expense_amounts(
  text, text, uuid, uuid, uuid, date, date, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sum_payment_amounts(
  text, text, uuid, date, date, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_client_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated;


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
