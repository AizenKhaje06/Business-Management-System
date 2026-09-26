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
