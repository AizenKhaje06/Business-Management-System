/*
# Add project management fields and update status enum

## Overview
Updates the projects table for the full project management module.
Adds project_code auto-generation, notes, archived flag, and expands
the status enum to match business workflow statuses.

## Changes to projects table

### New Columns
- `project_code` (text, nullable, UNIQUE) — auto-generated like PRJ-0001
- `notes` (text, nullable) — free-form project notes
- `archived` (boolean, NOT NULL, default false) — soft archive flag

### Modified Constraints
- Status CHECK replaced: draft, quotation, approved, in_progress, on_hold, completed, cancelled
- Existing data migrated: planning→draft, active→in_progress

### New Triggers
- `generate_project_code` — auto-generates PRJ-NNNN on INSERT when NULL
- `trg_projects_updated_at` — auto-updates updated_at on row change

## Security
1. RLS policies unchanged.
2. archived is a business field, not a security field.
*/

-- Drop old constraint first
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add new columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Migrate existing status values
UPDATE projects SET status = 'draft' WHERE status = 'planning';
UPDATE projects SET status = 'in_progress' WHERE status = 'active';

-- Add new status constraint
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'quotation', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled'));

-- Unique constraint on project_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_project_code_key'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_project_code_key UNIQUE (project_code);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);

-- Auto-generate project_code trigger
CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.project_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(project_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM projects
    WHERE project_code ~ '^PRJ-[0-9]+$';
    NEW.project_code := 'PRJ-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_project_code ON projects;
CREATE TRIGGER trg_generate_project_code
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_project_code();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Backfill project_code using a CTE instead of window function in UPDATE
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM projects
  WHERE project_code IS NULL
)
UPDATE projects p
SET project_code = 'PRJ-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE p.id = n.id;
