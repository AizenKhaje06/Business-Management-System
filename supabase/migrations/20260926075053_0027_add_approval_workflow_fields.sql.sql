/*
# Add Approval Workflow Fields

## Overview
Extends expenses and project_payments tables to support a full financial
approval workflow with submit, approve, reject, and post transitions.
Adds audit trail columns for who submitted, approved, or rejected each
record, plus timestamps and rejection reasons.

## Changes to expenses

### New Columns
- `submitted_at` (timestamptz, nullable) — when the expense was submitted for approval
- `rejected_by` (uuid, FK → profiles.id, nullable) — who rejected the expense
- `rejected_at` (timestamptz, nullable) — when it was rejected
- `rejection_reason` (text, nullable) — reason for rejection

### Updated Constraint
- `status` CHECK expanded: draft, submitted, pending, approved, rejected, void
  (adds 'submitted' as a distinct lifecycle stage between draft and pending)

## Changes to project_payments

### New Columns
- `submitted_by` (uuid, FK → profiles.id, nullable) — who submitted the payment
- `submitted_at` (timestamptz, nullable) — when submitted for approval
- `approved_by` (uuid, FK → profiles.id, nullable) — who approved the payment
- `approved_at` (timestamptz, nullable) — when approved
- `rejected_by` (uuid, FK → profiles.id, nullable) — who rejected
- `rejected_at` (timestamptz, nullable) — when rejected
- `rejection_reason` (text, nullable) — reason for rejection
- `posted_at` (timestamptz, nullable) — when the payment was posted (finalized)

### Updated Constraint
- `status` CHECK expanded: pending, approved, posted, partial, cancelled
  (adds 'approved' and 'posted' as lifecycle stages)

## Security
- No RLS policy changes — existing policies already control access.
- The existing `can_approve_financial` function already prevents self-approval.
- New columns are nullable so existing rows remain valid.
*/

-- ===== Expenses =====

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES profiles(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update status constraint to include 'submitted'
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected', 'void'));

-- ===== Project Payments =====

ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES profiles(id);
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES profiles(id);
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE project_payments ADD COLUMN IF NOT EXISTS posted_at timestamptz;

-- Update status constraint to include 'approved' and 'posted'
ALTER TABLE project_payments DROP CONSTRAINT IF EXISTS project_payments_status_check;
ALTER TABLE project_payments ADD CONSTRAINT project_payments_status_check
  CHECK (status IN ('pending', 'approved', 'posted', 'partial', 'cancelled'));

-- Indexes for approval workflow queries
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_at ON expenses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_rejected_by ON expenses(rejected_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_submitted_by ON project_payments(submitted_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_approved_by ON project_payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_posted_at ON project_payments(posted_at);
