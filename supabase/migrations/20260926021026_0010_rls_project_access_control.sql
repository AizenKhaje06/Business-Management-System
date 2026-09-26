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
