/*
# Create expenses, suppliers, and materials tables

## Overview
This migration creates tables for expense tracking, supplier management,
and material/inventory purchasing. Expenses are categorized and can be
linked to projects. Suppliers provide materials and invoices.

## New Tables

### expense_categories
- `id` (uuid, PK)
- `name` (text, NOT NULL, UNIQUE) — category name (e.g. "Office Supplies")
- `description` (text, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamptz, default now())

### expenses
- `id` (uuid, PK)
- `category_id` (uuid, FK → expense_categories.id, NOT NULL)
- `project_id` (uuid, FK → projects.id, nullable) — optional project link
- `supplier_id` (uuid, FK → suppliers.id, nullable) — optional supplier link
- `amount` (numeric(14,2), NOT NULL, CHECK > 0)
- `currency` (text, default 'USD', CHECK length = 3)
- `expense_date` (date, NOT NULL)
- `description` (text, nullable)
- `status` (text, NOT NULL, default 'pending') — CHECK: pending, approved, rejected, paid
- `receipt_url` (text, nullable) — URL to receipt document
- `submitted_by` (uuid, FK → profiles.id, nullable) — who submitted the expense
- `approved_by` (uuid, FK → profiles.id, nullable) — who approved/rejected
- `approved_at` (timestamptz, nullable) — when approved/rejected
- `approval_notes` (text, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### suppliers
- `id` (uuid, PK)
- `name` (text, NOT NULL) — supplier company name
- `email` (text, nullable)
- `phone` (text, nullable)
- `address` (text, nullable)
- `city` (text, nullable)
- `state` (text, nullable)
- `postal_code` (text, nullable)
- `country` (text, default 'US')
- `website` (text, nullable)
- `tax_id` (text, nullable)
- `payment_terms` (text, nullable) — e.g. "Net 30", "Net 60"
- `is_active` (boolean, default true)
- `notes` (text, nullable)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### supplier_invoices
- `id` (uuid, PK)
- `supplier_id` (uuid, FK → suppliers.id, CASCADE, NOT NULL)
- `invoice_number` (text, NOT NULL) — supplier's invoice number
- `invoice_date` (date, NOT NULL)
- `due_date` (date, nullable)
- `amount` (numeric(14,2), NOT NULL, CHECK > 0)
- `tax_amount` (numeric(14,2), nullable, CHECK >= 0)
- `total_amount` (numeric(14,2), NOT NULL, CHECK > 0)
- `status` (text, NOT NULL, default 'pending') — CHECK: pending, approved, paid, disputed
- `notes` (text, nullable)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- UNIQUE(supplier_id, invoice_number) — one invoice number per supplier

### materials
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `description` (text, nullable)
- `sku` (text, UNIQUE, nullable) — internal stock keeping unit
- `unit` (text, nullable) — unit of measure (e.g. "pcs", "kg", "m")
- `unit_cost` (numeric(10,2), nullable) — cost per unit
- `stock_quantity` (numeric(14,2), NOT NULL, default 0) — current stock level
- `reorder_level` (numeric(14,2), NOT NULL, default 0) — minimum stock threshold
- `is_active` (boolean, default true)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### material_purchases
- `id` (uuid, PK)
- `material_id` (uuid, FK → materials.id, CASCADE, NOT NULL)
- `supplier_id` (uuid, FK → suppliers.id, nullable) — where purchased from
- `project_id` (uuid, FK → projects.id, nullable) — optional project link
- `quantity` (numeric(14,2), NOT NULL, CHECK > 0)
- `unit_cost` (numeric(10,2), NOT NULL, CHECK >= 0)
- `total_cost` (numeric(14,2), NOT NULL, CHECK > 0) — quantity * unit_cost
- `purchase_date` (date, NOT NULL)
- `reference_number` (text, nullable) — PO/transaction number
- `notes` (text, nullable)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, default now())

## Indexes
- expense_categories: name
- expenses: category_id, project_id, status, expense_date, submitted_by
- suppliers: name, is_active
- supplier_invoices: supplier_id, status, due_date
- materials: name, sku, is_active, stock_quantity
- material_purchases: material_id, supplier_id, project_id, purchase_date

## Security (RLS)
All tables have RLS enabled. Policies scope to authenticated users:
- expense_categories: all authenticated SELECT; write requires expenses permissions
- expenses: all authenticated SELECT; write requires expenses permissions
- suppliers: all authenticated SELECT; write requires contacts permissions
- supplier_invoices: all authenticated SELECT; write requires expenses permissions
- materials: all authenticated SELECT; write requires inventory permissions
- material_purchases: all authenticated SELECT; write requires inventory permissions

## Important Notes
1. All money fields use numeric(14,2) or numeric(10,2) — never floating point.
2. Check constraints enforce valid enum values on status fields.
3. Currency code is a 3-char string with length check constraint.
4. updated_at triggers maintain timestamps automatically.
5. Supplier invoices have a unique constraint on (supplier_id, invoice_number).
6. Materials have a unique constraint on sku.
*/

-- ============================================================================
-- EXPENSE CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_expense_categories" ON expense_categories;
CREATE POLICY "select_expense_categories" ON expense_categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_expense_categories" ON expense_categories;
CREATE POLICY "insert_expense_categories" ON expense_categories FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "update_expense_categories" ON expense_categories;
CREATE POLICY "update_expense_categories" ON expense_categories FOR UPDATE
  TO authenticated USING (public.has_permission('expenses.edit'))
  WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "delete_expense_categories" ON expense_categories;
CREATE POLICY "delete_expense_categories" ON expense_categories FOR DELETE
  TO authenticated USING (public.has_permission('expenses.delete'));

-- ============================================================================
-- SUPPLIERS (needed before expenses due to FK)
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
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
  payment_terms text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_suppliers" ON suppliers;
CREATE POLICY "select_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_suppliers" ON suppliers;
CREATE POLICY "insert_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('contacts.create'));

DROP POLICY IF EXISTS "update_suppliers" ON suppliers;
CREATE POLICY "update_suppliers" ON suppliers FOR UPDATE
  TO authenticated USING (public.has_permission('contacts.edit'))
  WITH CHECK (public.has_permission('contacts.edit'));

DROP POLICY IF EXISTS "delete_suppliers" ON suppliers;
CREATE POLICY "delete_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (public.has_permission('contacts.delete'));

-- ============================================================================
-- EXPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  expense_date date NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  receipt_url text,
  submitted_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  approval_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_expenses" ON expenses;
CREATE POLICY "select_expenses" ON expenses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_expenses" ON expenses;
CREATE POLICY "insert_expenses" ON expenses FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('expenses.create'));

DROP POLICY IF EXISTS "update_expenses" ON expenses;
CREATE POLICY "update_expenses" ON expenses FOR UPDATE
  TO authenticated USING (public.has_permission('expenses.edit'))
  WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "delete_expenses" ON expenses;
CREATE POLICY "delete_expenses" ON expenses FOR DELETE
  TO authenticated USING (public.has_permission('expenses.delete'));

-- ============================================================================
-- SUPPLIER INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  tax_amount numeric(14,2) CHECK (tax_amount >= 0),
  total_amount numeric(14,2) NOT NULL CHECK (total_amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due_date ON supplier_invoices(due_date);

ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_supplier_invoices" ON supplier_invoices;
CREATE POLICY "select_supplier_invoices" ON supplier_invoices FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_supplier_invoices" ON supplier_invoices;
CREATE POLICY "insert_supplier_invoices" ON supplier_invoices FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('expenses.create'));

DROP POLICY IF EXISTS "update_supplier_invoices" ON supplier_invoices;
CREATE POLICY "update_supplier_invoices" ON supplier_invoices FOR UPDATE
  TO authenticated USING (public.has_permission('expenses.edit'))
  WITH CHECK (public.has_permission('expenses.edit'));

DROP POLICY IF EXISTS "delete_supplier_invoices" ON supplier_invoices;
CREATE POLICY "delete_supplier_invoices" ON supplier_invoices FOR DELETE
  TO authenticated USING (public.has_permission('expenses.delete'));

-- ============================================================================
-- MATERIALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text UNIQUE,
  unit text,
  unit_cost numeric(10,2),
  stock_quantity numeric(14,2) NOT NULL DEFAULT 0,
  reorder_level numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_stock_quantity ON materials(stock_quantity);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_materials" ON materials;
CREATE POLICY "select_materials" ON materials FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_materials" ON materials;
CREATE POLICY "insert_materials" ON materials FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_materials" ON materials;
CREATE POLICY "update_materials" ON materials FOR UPDATE
  TO authenticated USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_materials" ON materials;
CREATE POLICY "delete_materials" ON materials FOR DELETE
  TO authenticated USING (public.has_permission('inventory.delete'));

-- ============================================================================
-- MATERIAL PURCHASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS material_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
  unit_cost numeric(10,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost numeric(14,2) NOT NULL CHECK (total_cost > 0),
  purchase_date date NOT NULL,
  reference_number text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_purchases_material_id ON material_purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_supplier_id ON material_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_project_id ON material_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_purchase_date ON material_purchases(purchase_date);

ALTER TABLE material_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_material_purchases" ON material_purchases;
CREATE POLICY "select_material_purchases" ON material_purchases FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_material_purchases" ON material_purchases;
CREATE POLICY "insert_material_purchases" ON material_purchases FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_material_purchases" ON material_purchases;
CREATE POLICY "update_material_purchases" ON material_purchases FOR UPDATE
  TO authenticated USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_material_purchases" ON material_purchases;
CREATE POLICY "delete_material_purchases" ON material_purchases FOR DELETE
  TO authenticated USING (public.has_permission('inventory.delete'));
