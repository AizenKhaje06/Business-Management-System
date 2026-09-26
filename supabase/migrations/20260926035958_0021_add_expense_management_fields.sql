/*
# Add expense management fields

## Overview
Extends the expenses table for the full expense module (Phase 10).
Adds expense_code auto-generation, invoice_number, payment_method,
and expands the status enum to match the business workflow.

## Changes to expenses

### New Columns
- `expense_code` (text, UNIQUE) — auto-generated like EXP-0001
- `invoice_number` (text, nullable) — supplier invoice reference
- `payment_method` (text, nullable) — how the expense was paid

### Updated Constraints
- `status` CHECK replaced: draft, pending, approved, rejected, void
  (Drops 'paid'; adds 'draft' and 'void')
- `payment_method` CHECK: cash, bank_deposit, bank_transfer, gcash, maya, check, other

### New Triggers
- `generate_expense_code` — auto-generates EXP-NNNN on INSERT when NULL
- `trg_expenses_updated_at` — auto-updates updated_at

### New Indexes
- `idx_expenses_expense_code`
- `idx_expenses_status`
- `idx_expenses_payment_method`

### New Categories
- Materials, Hardware, Wood, Glass, Labor, Gasoline, Delivery,
  Transportation, Tools, Other
  (Existing categories remain; these are additions)

## Security
RLS policies unchanged — they already use has_permission('invoices.*').
*/

-- Drop old status constraint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;

-- Add new columns
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_code text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method text;

-- Add new constraints
ALTER TABLE expenses ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'void'));

ALTER TABLE expenses ADD CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'bank_deposit', 'bank_transfer', 'gcash', 'maya', 'check', 'other'));

-- Unique constraint on expense_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_expense_code_key'
  ) THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_expense_code_key UNIQUE (expense_code);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_expense_code ON expenses(expense_code);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON expenses(payment_method);

-- Auto-generate expense_code trigger
CREATE OR REPLACE FUNCTION public.generate_expense_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.expense_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(expense_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM expenses
    WHERE expense_code ~ '^EXP-[0-9]+$';
    NEW.expense_code := 'EXP-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_expense_code ON expenses;
CREATE TRIGGER trg_generate_expense_code
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_expense_code();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Backfill expense_code for existing rows
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM expenses
  WHERE expense_code IS NULL
)
UPDATE expenses e
SET expense_code = 'EXP-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE e.id = n.id;

-- Migrate existing 'paid' status to 'approved'
UPDATE expenses SET status = 'approved' WHERE status = 'paid';

-- Seed new expense categories (idempotent)
INSERT INTO expense_categories (name, description, is_active)
VALUES
  ('Materials', 'Raw materials for projects', true),
  ('Hardware', 'Hardware components and fixtures', true),
  ('Wood', 'Lumber and wood products', true),
  ('Glass', 'Glass materials and products', true),
  ('Labor', 'Direct labor costs', true),
  ('Gasoline', 'Fuel for vehicles and equipment', true),
  ('Delivery', 'Delivery and courier fees', true),
  ('Transportation', 'Transportation and logistics', true),
  ('Tools', 'Tools and equipment purchases', true),
  ('Other', 'Miscellaneous expenses', true)
ON CONFLICT DO NOTHING;
