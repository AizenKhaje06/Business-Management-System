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
