/*
# Create import history table

## Overview
Tracks every CSV/XLSX import operation — who imported, what entity type,
how many rows were valid/invalid/duplicate/imported, and the final status.

## New Tables
- `import_history`
  - `id` (uuid, primary key)
  - `entity_type` (text) — which table was imported into: clients, projects, payments, expenses, suppliers, materials
  - `file_name` (text) — original uploaded file name
  - `file_type` (text) — csv or xlsx
  - `total_rows` (int) — total rows in the file
  - `valid_rows` (int) — rows that passed validation
  - `invalid_rows` (int) — rows that failed validation
  - `duplicate_rows` (int) — rows flagged as duplicates
  - `imported_rows` (int) — rows actually inserted into the database
  - `status` (text) — pending, completed, cancelled, failed
  - `error_details` (jsonb) — structured error/duplicate details for the error report
  - `column_mapping` (jsonb) — the mapping from file columns to entity fields
  - `imported_by` (uuid) — user who performed the import
  - `created_at` (timestamptz)
  - `completed_at` (timestamptz) — when the import was finalized

## Security
- Enable RLS on `import_history`.
- Owner-scoped CRUD: authenticated users can view their own import history.
- INSERT: authenticated users can create import records for themselves.
- UPDATE: authenticated users can update their own records (e.g. cancel, finalize).
- DELETE: authenticated users can delete their own import records.
*/

CREATE TABLE IF NOT EXISTS import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'csv',
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  error_details jsonb,
  column_mapping jsonb,
  imported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_import_history" ON import_history;
CREATE POLICY "select_own_import_history"
ON import_history FOR SELECT
TO authenticated USING (auth.uid() = imported_by);

DROP POLICY IF EXISTS "insert_own_import_history" ON import_history;
CREATE POLICY "insert_own_import_history"
ON import_history FOR INSERT
TO authenticated WITH CHECK (auth.uid() = imported_by);

DROP POLICY IF EXISTS "update_own_import_history" ON import_history;
CREATE POLICY "update_own_import_history"
ON import_history FOR UPDATE
TO authenticated USING (auth.uid() = imported_by) WITH CHECK (auth.uid() = imported_by);

DROP POLICY IF EXISTS "delete_own_import_history" ON import_history;
CREATE POLICY "delete_own_import_history"
ON import_history FOR DELETE
TO authenticated USING (auth.uid() = imported_by);

CREATE INDEX IF NOT EXISTS idx_import_history_imported_by ON import_history(imported_by);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON import_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_history_entity_type ON import_history(entity_type);
