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
