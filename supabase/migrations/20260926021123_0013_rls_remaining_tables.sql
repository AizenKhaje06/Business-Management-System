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
