/*
# Add supplier and material management fields + material purchases

Phase 11: supplier_code, material_code, supplier_id on materials,
and extend the existing material_purchases table.
RLS policies already exist on material_purchases (using inventory.* permissions).
*/

-- ============================================================================
-- Suppliers: add supplier_code
-- ============================================================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_supplier_code_key'
  ) THEN
    ALTER TABLE suppliers ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);

CREATE OR REPLACE FUNCTION public.generate_supplier_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.supplier_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(supplier_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM suppliers
    WHERE supplier_code ~ '^SUP-[0-9]+$';
    NEW.supplier_code := 'SUP-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_supplier_code ON suppliers;
CREATE TRIGGER trg_generate_supplier_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_supplier_code();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM suppliers
  WHERE supplier_code IS NULL
)
UPDATE suppliers s
SET supplier_code = 'SUP-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE s.id = n.id;

-- ============================================================================
-- Materials: add material_code + supplier_id
-- ============================================================================
ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_code text;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'materials_material_code_key'
  ) THEN
    ALTER TABLE materials ADD CONSTRAINT materials_material_code_key UNIQUE (material_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_materials_material_code ON materials(material_code);
CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON materials(supplier_id);

CREATE OR REPLACE FUNCTION public.generate_material_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.material_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(material_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM materials
    WHERE material_code ~ '^MAT-[0-9]+$';
    NEW.material_code := 'MAT-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_material_code ON materials;
CREATE TRIGGER trg_generate_material_code
  BEFORE INSERT ON materials
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_material_code();

DROP TRIGGER IF EXISTS trg_materials_updated_at ON materials;
CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM materials
  WHERE material_code IS NULL
)
UPDATE materials m
SET material_code = 'MAT-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE m.id = n.id;

-- ============================================================================
-- Material purchases: extend existing table
-- ============================================================================
ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS purchase_code text;
ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'material_purchases_payment_method_check'
  ) THEN
    ALTER TABLE material_purchases ADD CONSTRAINT material_purchases_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('cash', 'bank_deposit', 'bank_transfer', 'gcash', 'maya', 'check', 'other'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'material_purchases_purchase_code_key'
  ) THEN
    ALTER TABLE material_purchases ADD CONSTRAINT material_purchases_purchase_code_key UNIQUE (purchase_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_material_purchases_code ON material_purchases(purchase_code);
CREATE INDEX IF NOT EXISTS idx_material_purchases_project_id ON material_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_supplier_id ON material_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_material_id ON material_purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_date ON material_purchases(purchase_date);

-- Auto-calculate total_cost from quantity * unit_cost (decimal-safe via numeric)
CREATE OR REPLACE FUNCTION public.calculate_purchase_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.total_cost := NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_purchase_total ON material_purchases;
CREATE TRIGGER trg_calculate_purchase_total
  BEFORE INSERT OR UPDATE ON material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_purchase_total();

CREATE OR REPLACE FUNCTION public.generate_purchase_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.purchase_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_code FROM 5) AS int)), 0) + 1
    INTO next_num
    FROM material_purchases
    WHERE purchase_code ~ '^PUR-[0-9]+$';
    NEW.purchase_code := 'PUR-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_purchase_code ON material_purchases;
CREATE TRIGGER trg_generate_purchase_code
  BEFORE INSERT ON material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_purchase_code();

DROP TRIGGER IF EXISTS trg_material_purchases_updated_at ON material_purchases;
CREATE TRIGGER trg_material_purchases_updated_at
  BEFORE UPDATE ON material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
