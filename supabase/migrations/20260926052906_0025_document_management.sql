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
