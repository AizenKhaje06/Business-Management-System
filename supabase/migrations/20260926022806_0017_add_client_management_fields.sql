/*
# Add client management fields to clients table

## Overview
This migration adds the fields needed for the client management module:
client_code, company_name, contact_person, and a status column that
replaces the boolean is_active with a more granular status enum.
Also adds an updated_at trigger and a unique constraint on client_code.

## Changes to clients table

### New Columns
- `client_code` (text, nullable, UNIQUE) — auto-generated code like CLI-001
- `company_name` (text, nullable) — legal company name (distinct from `name` which is the display/trading name)
- `contact_person` (text, nullable) — primary contact person name
- `status` (text, NOT NULL, default 'active') — CHECK: active, inactive, archived

### Modified Columns
- `is_active` remains for backward compatibility but is now derived from status.
  A CHECK constraint ensures is_active = (status = 'active').

### New Index
- `idx_clients_client_code` on client_code
- `idx_clients_status` on status

### New Trigger
- `update_clients_updated_at` — auto-updates updated_at on row change

### Auto-generate client_code
- A trigger `generate_client_code` auto-generates CLI-NNN format codes
  on INSERT when client_code is NULL.

## Security Notes
1. RLS policies are unchanged — they already use security.has_permission().
2. The status column doesn't affect RLS — it's a business field, not a security field.
3. is_active is kept in sync with status via trigger for backward compatibility.
*/

-- ============================================================================
-- Add new columns
-- ============================================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_code text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'archived'));

-- ============================================================================
-- Sync is_active with status for existing rows
-- ============================================================================
UPDATE clients SET is_active = false WHERE status != 'active';

-- ============================================================================
-- Add unique constraint on client_code (partial — only for non-null values)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_client_code_key'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_client_code_key UNIQUE (client_code);
  END IF;
END $$;

-- ============================================================================
-- Add indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON clients(client_code);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- ============================================================================
-- Auto-generate client_code trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_code IS NULL THEN
    SELECT 'CLI-' || LPAD(COALESCE(MAX(suffix), 0)::text, 4, '0')
    INTO NEW.client_code
    FROM (
      SELECT CAST(SUBSTRING(client_code FROM 5) AS int) AS suffix
      FROM clients
      WHERE client_code LIKE 'CLI-%'
    ) AS codes;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_client_code ON clients;
CREATE TRIGGER trg_generate_client_code
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_code();

-- ============================================================================
-- Sync is_active with status trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_client_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    NEW.is_active := true;
  ELSE
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_status ON clients;
CREATE TRIGGER trg_sync_client_status
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_status();

-- ============================================================================
-- Updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
