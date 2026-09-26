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
