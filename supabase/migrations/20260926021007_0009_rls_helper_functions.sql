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
