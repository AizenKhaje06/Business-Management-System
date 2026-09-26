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
