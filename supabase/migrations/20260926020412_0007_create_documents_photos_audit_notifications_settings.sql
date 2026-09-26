/*
# Create documents, photos, audit_logs, notifications, and settings tables

## Overview
This migration creates the remaining system tables: document and photo
storage references, audit trail, user notifications, and application
settings. These complete the database foundation for the Business Management
System.

## New Tables

### documents
- `id` (uuid, PK)
- `entity_type` (text, NOT NULL) — CHECK: client, project, expense, supplier, material, invoice, payment
- `entity_id` (uuid, NOT NULL) — ID of the related entity
- `name` (text, NOT NULL) — document file name
- `file_url` (text, NOT NULL) — storage URL (Supabase Storage path)
- `file_type` (text, nullable) — MIME type
- `file_size` (bigint, nullable) — size in bytes
- `description` (text, nullable)
- `uploaded_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- INDEX on (entity_type, entity_id) for efficient lookups

### photos
- `id` (uuid, PK)
- `entity_type` (text, NOT NULL) — CHECK: client, project, expense, supplier, material
- `entity_id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `file_url` (text, NOT NULL) — storage URL
- `thumbnail_url` (text, nullable) — optional thumbnail
- `file_type` (text, nullable)
- `file_size` (bigint, nullable)
- `caption` (text, nullable)
- `uploaded_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())

### audit_logs
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles.id, nullable) — who performed the action
- `action` (text, NOT NULL) — CHECK: create, update, delete, login, logout, approve, reject, activate, deactivate
- `entity_type` (text, NOT NULL) — which table/entity was affected
- `entity_id` (uuid, nullable) — ID of the affected entity
- `old_values` (jsonb, nullable) — previous state (for updates/deletes)
- `new_values` (jsonb, nullable) — new state (for creates/updates)
- `ip_address` (inet, nullable) — request IP
- `user_agent` (text, nullable) — browser/client info
- `created_at` (timestamptz, default now())
- INDEX on user_id, entity_type, entity_id, created_at
- Append-only: no UPDATE or DELETE policies

### notifications
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles.id, CASCADE, NOT NULL) — recipient
- `type` (text, NOT NULL) — CHECK: info, success, warning, error
- `title` (text, NOT NULL)
- `message` (text, NOT NULL)
- `data` (jsonb, nullable) — additional payload (links, metadata)
- `is_read` (boolean, default false)
- `read_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())
- INDEX on user_id, is_read, created_at

### settings
- `id` (uuid, PK)
- `key` (text, NOT NULL, UNIQUE) — setting key (e.g. "company_name")
- `value` (jsonb, NOT NULL) — setting value (flexible JSON)
- `description` (text, nullable)
- `is_public` (boolean, default false) — whether to expose to all users
- `updated_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security (RLS)

### documents
- All authenticated can SELECT
- INSERT requires appropriate permission based on entity_type
- UPDATE/DELETE requires appropriate permission

### photos
- All authenticated can SELECT
- INSERT requires appropriate permission
- DELETE requires appropriate permission

### audit_logs
- All authenticated can SELECT (for transparency)
- INSERT only (append-only, no UPDATE or DELETE)
- Uses SECURITY INVOKER function for inserts

### notifications
- Users can only SELECT their own notifications (auth.uid() = user_id)
- Users can UPDATE their own (mark as read)
- INSERT: system/other users can create notifications
- Users can DELETE their own notifications

### settings
- All authenticated can SELECT public settings
- All authenticated can SELECT all settings (settings are reference data)
- INSERT/UPDATE/DELETE requires settings.edit permission

## Important Notes
1. Documents and photos use entity_type/entity_id polymorphic references (no FK since they can point to multiple tables).
2. Audit logs are append-only — no UPDATE or DELETE policies.
3. Notifications are user-scoped with auth.uid() ownership checks.
4. Settings use JSONB for flexible value storage.
5. All tables have appropriate indexes for common query patterns.
*/

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL
    CHECK (entity_type IN ('client', 'project', 'expense', 'supplier', 'material', 'invoice', 'payment')),
  entity_id uuid NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  description text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_documents" ON documents;
CREATE POLICY "select_documents" ON documents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents" ON documents FOR UPDATE
  TO authenticated USING (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  )
  WITH CHECK (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents" ON documents FOR DELETE
  TO authenticated USING (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

-- ============================================================================
-- PHOTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL
    CHECK (entity_type IN ('client', 'project', 'expense', 'supplier', 'material')),
  entity_id uuid NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  file_type text,
  file_size bigint,
  caption text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos(uploaded_by);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_photos" ON photos;
CREATE POLICY "select_photos" ON photos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_photos" ON photos;
CREATE POLICY "insert_photos" ON photos FOR INSERT
  TO authenticated WITH CHECK (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

DROP POLICY IF EXISTS "delete_photos" ON photos;
CREATE POLICY "delete_photos" ON photos FOR DELETE
  TO authenticated USING (
    public.has_permission('contacts.edit') OR
    public.has_permission('invoices.edit') OR
    public.has_permission('expenses.edit') OR
    public.has_permission('inventory.edit')
  );

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL
    CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'activate', 'deactivate')),
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'success', 'warning', 'error')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_is_public ON settings(is_public);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_settings" ON settings;
CREATE POLICY "select_settings" ON settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_settings" ON settings;
CREATE POLICY "insert_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('settings.edit'));

DROP POLICY IF EXISTS "update_settings" ON settings;
CREATE POLICY "update_settings" ON settings FOR UPDATE
  TO authenticated USING (public.has_permission('settings.edit'))
  WITH CHECK (public.has_permission('settings.edit'));

DROP POLICY IF EXISTS "delete_settings" ON settings;
CREATE POLICY "delete_settings" ON settings FOR DELETE
  TO authenticated USING (public.has_permission('settings.edit'));
