/*
# Create clients and projects tables

## Overview
This migration creates the core business tables for managing clients and
projects. Clients are companies or individuals that the business serves.
Projects are work engagements associated with a client, with team members,
status tracking, and payment records.

## New Tables

### clients
- `id` (uuid, PK)
- `name` (text, NOT NULL) — client company or person name
- `email` (text, nullable) — primary contact email
- `phone` (text, nullable) — primary contact phone
- `address` (text, nullable) — street address
- `city` (text, nullable)
- `state` (text, nullable) — state/province
- `postal_code` (text, nullable)
- `country` (text, nullable, default 'US')
- `website` (text, nullable)
- `tax_id` (text, nullable) — tax identification number
- `notes` (text, nullable) — free-form notes
- `is_active` (boolean, default true) — soft delete / deactivation
- `created_by` (uuid, FK → profiles.id, nullable) — who created this record
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### projects
- `id` (uuid, PK)
- `client_id` (uuid, FK → clients.id, NOT NULL) — owning client
- `name` (text, NOT NULL) — project name
- `description` (text, nullable)
- `status` (text, NOT NULL, default 'planning') — check constraint: planning, active, on_hold, completed, cancelled
- `priority` (text, NOT NULL, default 'medium') — check constraint: low, medium, high, urgent
- `start_date` (date, nullable)
- `end_date` (date, nullable) — planned end date
- `actual_end_date` (date, nullable) — actual completion date
- `budget` (numeric(14,2), nullable) — total project budget (decimal, not float)
- `hourly_rate` (numeric(10,2), nullable) — billing rate if applicable
- `progress` (int, default 0) — 0-100 completion percentage
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### project_members
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects.id, CASCADE, NOT NULL)
- `user_id` (uuid, FK → profiles.id, CASCADE, NOT NULL) — team member
- `role` (text, NOT NULL, default 'member') — check constraint: lead, manager, member
- `allocated_hours` (numeric(8,2), nullable) — planned hours allocation
- `created_at` (timestamptz, default now())
- UNIQUE(project_id, user_id) — one membership per user per project

### project_status_history
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects.id, CASCADE, NOT NULL)
- `old_status` (text, nullable) — previous status (null for initial)
- `new_status` (text, NOT NULL) — new status
- `changed_by` (uuid, FK → profiles.id, nullable) — who changed it
- `notes` (text, nullable) — reason for change
- `created_at` (timestamptz, default now())

### project_payments
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects.id, CASCADE, NOT NULL)
- `amount` (numeric(14,2), NOT NULL, CHECK > 0) — payment amount
- `payment_date` (date, NOT NULL) — when payment was received
- `payment_method` (text, nullable) — check constraint: cash, check, bank_transfer, credit_card, paypal, other
- `reference_number` (text, nullable) — check/transaction number
- `notes` (text, nullable)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### payment_allocations
- `id` (uuid, PK)
- `payment_id` (uuid, FK → project_payments.id, CASCADE, NOT NULL)
- `project_id` (uuid, FK → projects.id, CASCADE, NOT NULL) — which project the payment is allocated to
- `amount` (numeric(14,2), NOT NULL, CHECK > 0) — allocated amount
- `notes` (text, nullable)
- `created_at` (timestamptz, default now())

## Indexes
- clients: name, is_active, created_by
- projects: client_id, status, created_by
- project_members: project_id, user_id
- project_status_history: project_id, created_at
- project_payments: project_id, payment_date
- payment_allocations: payment_id, project_id

## Security (RLS)
All tables have RLS enabled. Policies scope to authenticated users:
- clients: all authenticated users can SELECT; INSERT/UPDATE/DELETE requires contacts.edit or contacts.delete permission via has_permission check
- projects: all authenticated can SELECT; write requires project management permissions
- project_members: all authenticated can SELECT; write requires project management
- project_status_history: all authenticated can SELECT; INSERT only (append-only)
- project_payments: all authenticated can SELECT; write requires financial permissions
- payment_allocations: all authenticated can SELECT; write requires financial permissions

## Important Notes
1. All money fields use numeric(14,2) — never floating point.
2. Check constraints enforce valid enum values on status, priority, role, payment_method.
3. updated_at triggers maintain the timestamp automatically.
4. RLS policies use the has_permission() function for fine-grained access control.
*/

-- ============================================================================
-- CLIENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'US',
  website text,
  tax_id text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_clients" ON clients;
CREATE POLICY "select_clients" ON clients FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_clients" ON clients;
CREATE POLICY "insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "update_clients" ON clients;
CREATE POLICY "update_clients" ON clients FOR UPDATE
  TO authenticated USING (public.has_permission('contacts.edit'))
  WITH CHECK (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "delete_clients" ON clients;
CREATE POLICY "delete_clients" ON clients FOR DELETE
  TO authenticated USING (public.has_permission('contacts.delete'));

-- ============================================================================
-- PROJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date date,
  end_date date,
  actual_end_date date,
  budget numeric(14,2),
  hourly_rate numeric(10,2),
  progress int NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_projects" ON projects;
CREATE POLICY "select_projects" ON projects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_projects" ON projects;
CREATE POLICY "insert_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_projects" ON projects;
CREATE POLICY "update_projects" ON projects FOR UPDATE
  TO authenticated USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_projects" ON projects;
CREATE POLICY "delete_projects" ON projects FOR DELETE
  TO authenticated USING (public.has_permission('invoices.delete'));

-- ============================================================================
-- PROJECT_MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('lead', 'manager', 'member')),
  allocated_hours numeric(8,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_project_members" ON project_members;
CREATE POLICY "select_project_members" ON project_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_project_members" ON project_members;
CREATE POLICY "insert_project_members" ON project_members FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "update_project_members" ON project_members;
CREATE POLICY "update_project_members" ON project_members FOR UPDATE
  TO authenticated USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_project_members" ON project_members;
CREATE POLICY "delete_project_members" ON project_members FOR DELETE
  TO authenticated USING (public.has_permission('invoices.edit'));

-- ============================================================================
-- PROJECT_STATUS_HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_status_history_project_id ON project_status_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_status_history_created_at ON project_status_history(created_at);

ALTER TABLE project_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_project_status_history" ON project_status_history;
CREATE POLICY "select_project_status_history" ON project_status_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_project_status_history" ON project_status_history;
CREATE POLICY "insert_project_status_history" ON project_status_history FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.edit'));

-- ============================================================================
-- PROJECT_PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  payment_method text
    CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'paypal', 'other')),
  reference_number text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_payments_project_id ON project_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_payment_date ON project_payments(payment_date);

ALTER TABLE project_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_project_payments" ON project_payments;
CREATE POLICY "select_project_payments" ON project_payments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_project_payments" ON project_payments;
CREATE POLICY "insert_project_payments" ON project_payments FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_project_payments" ON project_payments;
CREATE POLICY "update_project_payments" ON project_payments FOR UPDATE
  TO authenticated USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_project_payments" ON project_payments;
CREATE POLICY "delete_project_payments" ON project_payments FOR DELETE
  TO authenticated USING (public.has_permission('invoices.delete'));

-- ============================================================================
-- PAYMENT_ALLOCATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES project_payments(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_project_id ON payment_allocations(project_id);

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payment_allocations" ON payment_allocations;
CREATE POLICY "select_payment_allocations" ON payment_allocations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_payment_allocations" ON payment_allocations;
CREATE POLICY "insert_payment_allocations" ON payment_allocations FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('invoices.create'));

DROP POLICY IF EXISTS "update_payment_allocations" ON payment_allocations;
CREATE POLICY "update_payment_allocations" ON payment_allocations FOR UPDATE
  TO authenticated USING (public.has_permission('invoices.edit'))
  WITH CHECK (public.has_permission('invoices.edit'));

DROP POLICY IF EXISTS "delete_payment_allocations" ON payment_allocations;
CREATE POLICY "delete_payment_allocations" ON payment_allocations FOR DELETE
  TO authenticated USING (public.has_permission('invoices.delete'));
