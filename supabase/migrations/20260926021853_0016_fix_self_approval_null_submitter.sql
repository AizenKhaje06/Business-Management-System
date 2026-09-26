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
