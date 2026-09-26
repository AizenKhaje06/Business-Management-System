/*
# Add payment management fields to project_payments

## Overview
Extends the project_payments table to support the full payment/collections
module (Phase 09). Adds payment_code auto-generation, a status column with
business statuses, and expands the payment_method enum with local payment
options (bank_deposit, gcash, maya).

## Changes to project_payments

### New Columns
- `payment_code` (text, UNIQUE) — auto-generated like PAY-0001
- `status` (text, NOT NULL, default 'paid') — CHECK: paid, partial, pending, cancelled

### Updated Constraint
- `payment_method` CHECK now includes: cash, bank_deposit, bank_transfer,
  gcash, maya, check, other
  (Drops credit_card and paypal; adds bank_deposit, gcash, maya)

### New Triggers
- `generate_payment_code` — auto-generates PAY-NNNN on INSERT when NULL
- `trg_project_payments_updated_at` — auto-updates updated_at on row change

### New Indexes
- `idx_project_payments_payment_code`
- `idx_project_payments_status`

## Security
RLS policies unchanged — they already use has_permission('invoices.*').
*/

-- Drop old payment_method constraint before adding new one
ALTER TABLE project_payments DROP CONSTRAINT IF EXISTS project_payments_payment_method_check;

-- Add new columns
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS payment_code text;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid';

-- Add new constraints
ALTER TABLE project_payments ADD CONSTRAINT project_payments_payment_method_check
  CHECK (payment_method IN ('cash', 'bank_deposit', 'bank_transfer', 'gcash', 'maya', 'check', 'other'));

ALTER TABLE project_payments ADD CONSTRAINT project_payments_status_check
  CHECK (status IN ('paid', 'partial', 'pending', 'cancelled'));

-- Unique constraint on payment_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_payments_payment_code_key'
  ) THEN
    ALTER TABLE project_payments ADD CONSTRAINT project_payments_payment_code_key UNIQUE (payment_code);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_payments_payment_code ON project_payments(payment_code);
CREATE INDEX IF NOT EXISTS idx_project_payments_status ON project_payments(status);

-- Auto-generate payment_code trigger
CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.payment_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(payment_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM project_payments
    WHERE payment_code ~ '^PAY-[0-9]+$';
    NEW.payment_code := 'PAY-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_payment_code ON project_payments;
CREATE TRIGGER trg_generate_payment_code
  BEFORE INSERT ON project_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_payment_code();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_project_payments_updated_at ON project_payments;
CREATE TRIGGER trg_project_payments_updated_at
  BEFORE UPDATE ON project_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Backfill payment_code for existing rows
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM project_payments
  WHERE payment_code IS NULL
)
UPDATE project_payments p
SET payment_code = 'PAY-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE p.id = n.id;
