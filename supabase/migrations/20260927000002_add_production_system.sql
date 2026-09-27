-- ============================================================================
-- MIGRATION: 20260927000002_add_production_system
-- Created: 2026-09-27
-- Description: Add production management system for TWO HEADS Wood Furniture Manufacturing
-- ============================================================================

-- ============================================================================
-- PREREQUISITE: Ensure has_permission function exists
-- ============================================================================

-- Create has_permission function if it doesn't exist (idempotent)
CREATE OR REPLACE FUNCTION public.has_permission(perm_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN profiles prof ON prof.role_id = rp.role_id
    WHERE prof.id = auth.uid()
      AND p.name = perm_name
      AND prof.is_active = true
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

-- ============================================================================
-- PREREQUISITE: Ensure update_updated_at trigger function exists
-- ============================================================================

-- Create update_updated_at function if it doesn't exist (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

/*
# Production System for Wood Furniture Manufacturing

## Overview
This migration adds comprehensive production management features for TWO HEADS,
including product catalog, production orders, bill of materials (BOM), 
production stages, and wood-specific inventory enhancements.

## New Tables

### product_categories
- Categories for TWO HEADS products (Doors, Panels, Components, etc.)

### product_catalog
- Product templates with specifications and pricing
- Main doors, interior doors, jambs, flooring, stair components, moldings, paneling

### product_specifications
- Technical specs: dimensions, wood types, finishes

### product_materials (BOM - Bill of Materials)
- Material requirements per product
- Auto-calculate material needs from orders

### production_orders
- Manufacturing work orders linked to projects
- Track production from start to delivery

### production_stages
- Workflow stages: Design → Cutting → Assembly → Finishing → QC → Delivery
- Time tracking and worker assignments

### production_materials_usage
- Actual material consumption vs. planned
- Waste tracking

### qc_inspections
- Quality control checkpoints
- Pass/fail tracking with notes

### qc_defects
- Defect recording and resolution

## Enhancements to Existing Tables
- materials: Add wood-specific columns (species, board_feet, grade, etc.)
- projects: Add production-related fields

*/

-- ============================================================================
-- ENHANCE MATERIALS TABLE (Wood-Specific Fields)
-- ============================================================================

-- Add wood-specific columns to existing materials table
ALTER TABLE materials 
  ADD COLUMN IF NOT EXISTS wood_species TEXT,
  ADD COLUMN IF NOT EXISTS board_feet NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS moisture_content NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS grade TEXT CHECK (grade IN ('A', 'B', 'C', 'Select', 'Premium', 'Standard')),
  ADD COLUMN IF NOT EXISTS storage_location TEXT,
  ADD COLUMN IF NOT EXISTS seasoning_status TEXT CHECK (seasoning_status IN ('green', 'air_dried', 'kiln_dried', 'ready')),
  ADD COLUMN IF NOT EXISTS thickness NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS width NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS length NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS dimension_unit TEXT DEFAULT 'inches' CHECK (dimension_unit IN ('inches', 'mm', 'cm', 'feet'));

-- Create indexes for wood-specific queries
CREATE INDEX IF NOT EXISTS idx_materials_wood_species ON materials(wood_species);
CREATE INDEX IF NOT EXISTS idx_materials_grade ON materials(grade);
CREATE INDEX IF NOT EXISTS idx_materials_seasoning ON materials(seasoning_status);

-- ============================================================================
-- PRODUCT CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  display_order int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_order ON product_categories(display_order);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_product_categories" ON product_categories;
CREATE POLICY "select_product_categories" ON product_categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_product_categories" ON product_categories;
CREATE POLICY "insert_product_categories" ON product_categories FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_product_categories" ON product_categories;
CREATE POLICY "update_product_categories" ON product_categories FOR UPDATE
  TO authenticated USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_product_categories" ON product_categories;
CREATE POLICY "delete_product_categories" ON product_categories FOR DELETE
  TO authenticated USING (public.has_permission('inventory.delete'));

-- ============================================================================
-- PRODUCT CATALOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  sku text UNIQUE,
  description text,
  base_price numeric(14,2),
  estimated_production_hours numeric(8,2),
  is_active boolean NOT NULL DEFAULT true,
  is_customizable boolean NOT NULL DEFAULT false,
  image_url text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_catalog_category ON product_catalog(category_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_sku ON product_catalog(sku);
CREATE INDEX IF NOT EXISTS idx_product_catalog_active ON product_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_product_catalog_name ON product_catalog(name);

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_product_catalog" ON product_catalog;
CREATE POLICY "select_product_catalog" ON product_catalog FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_product_catalog" ON product_catalog;
CREATE POLICY "insert_product_catalog" ON product_catalog FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.create'));

DROP POLICY IF EXISTS "update_product_catalog" ON product_catalog;
CREATE POLICY "update_product_catalog" ON product_catalog FOR UPDATE
  TO authenticated USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_product_catalog" ON product_catalog;
CREATE POLICY "delete_product_catalog" ON product_catalog FOR DELETE
  TO authenticated USING (public.has_permission('inventory.delete'));

-- ============================================================================
-- PRODUCT SPECIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product_catalog(id) ON DELETE CASCADE,
  spec_key text NOT NULL, -- e.g., 'width', 'height', 'thickness', 'wood_type'
  spec_value text NOT NULL,
  spec_unit text, -- e.g., 'inches', 'mm', 'lbs'
  is_default boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_specs_product ON product_specifications(product_id);

ALTER TABLE product_specifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_product_specifications" ON product_specifications;
CREATE POLICY "select_product_specifications" ON product_specifications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_product_specifications" ON product_specifications;
CREATE POLICY "insert_product_specifications" ON product_specifications FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "update_product_specifications" ON product_specifications;
CREATE POLICY "update_product_specifications" ON product_specifications FOR UPDATE
  TO authenticated USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_product_specifications" ON product_specifications;
CREATE POLICY "delete_product_specifications" ON product_specifications FOR DELETE
  TO authenticated USING (public.has_permission('inventory.edit'));

-- ============================================================================
-- PRODUCT MATERIALS (Bill of Materials - BOM)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product_catalog(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity_required numeric(14,4) NOT NULL CHECK (quantity_required > 0),
  unit text NOT NULL, -- e.g., 'board_feet', 'pieces', 'sq_ft'
  waste_factor numeric(5,2) DEFAULT 10.00, -- percentage, e.g., 10% waste allowance
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_product_materials_product ON product_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_product_materials_material ON product_materials(material_id);

ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_product_materials" ON product_materials;
CREATE POLICY "select_product_materials" ON product_materials FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_product_materials" ON product_materials;
CREATE POLICY "insert_product_materials" ON product_materials FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "update_product_materials" ON product_materials;
CREATE POLICY "update_product_materials" ON product_materials FOR UPDATE
  TO authenticated USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_product_materials" ON product_materials;
CREATE POLICY "delete_product_materials" ON product_materials FOR DELETE
  TO authenticated USING (public.has_permission('inventory.edit'));

-- ============================================================================
-- PRODUCTION ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES product_catalog(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'in_progress', 'paused', 'completed', 'cancelled', 'on_hold')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_start_date date,
  scheduled_end_date date,
  actual_start_date date,
  actual_end_date date,
  estimated_hours numeric(10,2),
  actual_hours numeric(10,2),
  custom_specifications jsonb, -- Store custom requirements
  notes text,
  created_by uuid REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id), -- Lead worker/supervisor
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_orders_number ON production_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_production_orders_project ON production_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_product ON production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_client ON production_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_assigned ON production_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_orders_dates ON production_orders(scheduled_start_date, scheduled_end_date);

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_production_orders" ON production_orders;
CREATE POLICY "select_production_orders" ON production_orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_production_orders" ON production_orders;
CREATE POLICY "insert_production_orders" ON production_orders FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('orders.create'));

DROP POLICY IF EXISTS "update_production_orders" ON production_orders;
CREATE POLICY "update_production_orders" ON production_orders FOR UPDATE
  TO authenticated USING (public.has_permission('orders.edit'))
  WITH CHECK (public.has_permission('orders.edit'));

DROP POLICY IF EXISTS "delete_production_orders" ON production_orders;
CREATE POLICY "delete_production_orders" ON production_orders FOR DELETE
  TO authenticated USING (public.has_permission('orders.delete'));

-- ============================================================================
-- PRODUCTION STAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  stage_name text NOT NULL 
    CHECK (stage_name IN ('design', 'cutting', 'assembly', 'finishing', 'quality_control', 'packaging', 'delivery')),
  stage_order int NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  assigned_to uuid REFERENCES profiles(id),
  scheduled_start_date timestamptz,
  scheduled_end_date timestamptz,
  actual_start_date timestamptz,
  actual_end_date timestamptz,
  estimated_hours numeric(8,2),
  actual_hours numeric(8,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(production_order_id, stage_name)
);

CREATE INDEX IF NOT EXISTS idx_production_stages_order ON production_stages(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_stages_status ON production_stages(status);
CREATE INDEX IF NOT EXISTS idx_production_stages_assigned ON production_stages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_stages_order_seq ON production_stages(production_order_id, stage_order);

ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_production_stages" ON production_stages;
CREATE POLICY "select_production_stages" ON production_stages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_production_stages" ON production_stages;
CREATE POLICY "insert_production_stages" ON production_stages FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('orders.edit'));

DROP POLICY IF EXISTS "update_production_stages" ON production_stages;
CREATE POLICY "update_production_stages" ON production_stages FOR UPDATE
  TO authenticated USING (public.has_permission('orders.edit'))
  WITH CHECK (public.has_permission('orders.edit'));

DROP POLICY IF EXISTS "delete_production_stages" ON production_stages;
CREATE POLICY "delete_production_stages" ON production_stages FOR DELETE
  TO authenticated USING (public.has_permission('orders.delete'));

-- ============================================================================
-- PRODUCTION MATERIALS USAGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_materials_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  planned_quantity numeric(14,4) NOT NULL CHECK (planned_quantity >= 0),
  actual_quantity numeric(14,4) CHECK (actual_quantity >= 0),
  waste_quantity numeric(14,4) DEFAULT 0 CHECK (waste_quantity >= 0),
  unit text NOT NULL,
  cost_per_unit numeric(14,2),
  total_cost numeric(14,2),
  waste_reason text,
  notes text,
  recorded_by uuid REFERENCES profiles(id),
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prod_materials_order ON production_materials_usage(production_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_materials_material ON production_materials_usage(material_id);

ALTER TABLE production_materials_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_production_materials_usage" ON production_materials_usage;
CREATE POLICY "select_production_materials_usage" ON production_materials_usage FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_production_materials_usage" ON production_materials_usage;
CREATE POLICY "insert_production_materials_usage" ON production_materials_usage FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "update_production_materials_usage" ON production_materials_usage;
CREATE POLICY "update_production_materials_usage" ON production_materials_usage FOR UPDATE
  TO authenticated USING (public.has_permission('inventory.edit'))
  WITH CHECK (public.has_permission('inventory.edit'));

DROP POLICY IF EXISTS "delete_production_materials_usage" ON production_materials_usage;
CREATE POLICY "delete_production_materials_usage" ON production_materials_usage FOR DELETE
  TO authenticated USING (public.has_permission('inventory.delete'));

-- ============================================================================
-- QC INSPECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  inspector_id uuid NOT NULL REFERENCES profiles(id),
  inspection_date timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK (result IN ('pass', 'fail', 'conditional_pass')),
  score int CHECK (score >= 0 AND score <= 100),
  notes text,
  action_taken text CHECK (action_taken IN ('approved', 'rework', 'scrap', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_inspections_order ON qc_inspections(production_order_id);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_inspector ON qc_inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_result ON qc_inspections(result);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_date ON qc_inspections(inspection_date);

ALTER TABLE qc_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_qc_inspections" ON qc_inspections;
CREATE POLICY "select_qc_inspections" ON qc_inspections FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_qc_inspections" ON qc_inspections;
CREATE POLICY "insert_qc_inspections" ON qc_inspections FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('orders.edit'));

DROP POLICY IF EXISTS "update_qc_inspections" ON qc_inspections;
CREATE POLICY "update_qc_inspections" ON qc_inspections FOR UPDATE
  TO authenticated USING (public.has_permission('orders.edit'))
  WITH CHECK (public.has_permission('orders.edit'));

DROP POLICY IF EXISTS "delete_qc_inspections" ON qc_inspections;
CREATE POLICY "delete_qc_inspections" ON qc_inspections FOR DELETE
  TO authenticated USING (public.has_permission('orders.delete'));

-- ============================================================================
-- QC DEFECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS qc_defects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES qc_inspections(id) ON DELETE CASCADE,
  defect_type text NOT NULL, -- e.g., 'crack', 'warp', 'finish_issue', 'dimension_error'
  severity text NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  location text, -- Where on the product
  description text,
  resolution text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_defects_inspection ON qc_defects(inspection_id);
CREATE INDEX IF NOT EXISTS idx_qc_defects_type ON qc_defects(defect_type);
CREATE INDEX IF NOT EXISTS idx_qc_defects_severity ON qc_defects(severity);

ALTER TABLE qc_defects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_qc_defects" ON qc_defects;
CREATE POLICY "select_qc_defects" ON qc_defects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_qc_defects" ON qc_defects;
CREATE POLICY "insert_qc_defects" ON qc_defects FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('orders.edit'));

DROP POLICY IF EXISTS "update_qc_defects" ON qc_defects;
CREATE POLICY "update_qc_defects" ON qc_defects FOR UPDATE
  TO authenticated USING (public.has_permission('orders.edit'))
  WITH CHECK (public.has_permission('orders.edit'));

DROP POLICY IF EXISTS "delete_qc_defects" ON qc_defects;
CREATE POLICY "delete_qc_defects" ON qc_defects FOR DELETE
  TO authenticated USING (public.has_permission('orders.delete'));

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS product_categories_updated_at ON product_categories;
CREATE TRIGGER product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS product_catalog_updated_at ON product_catalog;
CREATE TRIGGER product_catalog_updated_at
  BEFORE UPDATE ON product_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS product_materials_updated_at ON product_materials;
CREATE TRIGGER product_materials_updated_at
  BEFORE UPDATE ON product_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS production_orders_updated_at ON production_orders;
CREATE TRIGGER production_orders_updated_at
  BEFORE UPDATE ON production_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS production_stages_updated_at ON production_stages;
CREATE TRIGGER production_stages_updated_at
  BEFORE UPDATE ON production_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS qc_inspections_updated_at ON qc_inspections;
CREATE TRIGGER qc_inspections_updated_at
  BEFORE UPDATE ON qc_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Auto-generate production order number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_production_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
  year_part text;
  order_num text;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(order_number FROM 'PO-' || year_part || '-(.*)') AS INT)
  ), 0) + 1
  INTO next_num
  FROM production_orders
  WHERE order_number LIKE 'PO-' || year_part || '-%';
  
  order_num := 'PO-' || year_part || '-' || LPAD(next_num::text, 5, '0');
  
  RETURN order_num;
END;
$$;

-- ============================================================================
-- SEED DATA: Product Categories
-- ============================================================================

INSERT INTO product_categories (name, description, display_order) VALUES
  ('Doors', 'Main doors and interior doors crafted from durable hardwoods', 1),
  ('Door Components', 'Door jambs and frames', 2),
  ('Flooring', 'Hardwood flooring products', 3),
  ('Stair Components', 'Stair treads, risers, railings, and balusters', 4),
  ('Moldings', 'Decorative moldings and trim', 5),
  ('Paneling', 'Wall panels and ceiling panels', 6),
  ('Custom Furniture', 'Custom wood furniture pieces', 7)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Sample Products (TWO HEADS Core Products)
-- ============================================================================

DO $$
DECLARE
  cat_doors uuid;
  cat_door_components uuid;
  cat_stair uuid;
  cat_paneling uuid;
BEGIN
  SELECT id INTO cat_doors FROM product_categories WHERE name = 'Doors';
  SELECT id INTO cat_door_components FROM product_categories WHERE name = 'Door Components';
  SELECT id INTO cat_stair FROM product_categories WHERE name = 'Stair Components';
  SELECT id INTO cat_paneling FROM product_categories WHERE name = 'Paneling';

  -- Main Doors
  INSERT INTO product_catalog (category_id, name, sku, description, base_price, is_customizable) VALUES
    (cat_doors, 'Solid Wood Main Door - Standard', 'DOOR-MAIN-STD', 'Premium solid wood main door with traditional craftsmanship', 25000.00, true),
    (cat_doors, 'Solid Wood Main Door - Premium', 'DOOR-MAIN-PRM', 'High-end solid wood main door with intricate design', 45000.00, true),
    (cat_doors, 'Interior Door - Standard', 'DOOR-INT-STD', 'Quality solid wood interior door', 12000.00, true),
    (cat_doors, 'Interior Door - Premium', 'DOOR-INT-PRM', 'Premium solid wood interior door with custom finish', 18000.00, true);

  -- Door Components
  INSERT INTO product_catalog (category_id, name, sku, description, base_price, is_customizable) VALUES
    (cat_door_components, 'Door Jamb Set - Standard', 'JAMB-STD', 'Solid wood door jamb set', 3500.00, true),
    (cat_door_components, 'Door Jamb Set - Premium', 'JAMB-PRM', 'Premium solid wood door jamb with decorative details', 5500.00, true);

  -- Stair Components
  INSERT INTO product_catalog (category_id, name, sku, description, base_price, is_customizable) VALUES
    (cat_stair, 'Stair Tread - Hardwood', 'STAIR-TREAD', 'Solid hardwood stair tread', 2500.00, true),
    (cat_stair, 'Stair Railing System', 'STAIR-RAIL', 'Complete hardwood stair railing system', 15000.00, true),
    (cat_stair, 'Baluster Set (10 pieces)', 'STAIR-BAL-10', 'Hardwood balusters for staircase', 8000.00, false);

  -- Paneling
  INSERT INTO product_catalog (category_id, name, sku, description, base_price, is_customizable) VALUES
    (cat_paneling, 'Wall Panel - 4x8 ft', 'PANEL-WALL-4X8', 'Solid wood wall panel 4ft x 8ft', 6500.00, true),
    (cat_paneling, 'Ceiling Panel - 4x8 ft', 'PANEL-CEIL-4X8', 'Solid wood ceiling panel 4ft x 8ft', 7000.00, true);

END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE product_categories IS 'Product categories for TWO HEADS wood products';
COMMENT ON TABLE product_catalog IS 'Product templates with specifications and pricing';
COMMENT ON TABLE product_specifications IS 'Technical specifications for products (dimensions, wood types, etc.)';
COMMENT ON TABLE product_materials IS 'Bill of Materials (BOM) - material requirements per product';
COMMENT ON TABLE production_orders IS 'Manufacturing work orders for wood products';
COMMENT ON TABLE production_stages IS 'Production workflow stages with time tracking';
COMMENT ON TABLE production_materials_usage IS 'Actual material consumption and waste tracking';
COMMENT ON TABLE qc_inspections IS 'Quality control inspection records';
COMMENT ON TABLE qc_defects IS 'Defect tracking for quality control';

COMMENT ON COLUMN materials.wood_species IS 'Type of wood (e.g., Mahogany, Narra, Oak, Molave)';
COMMENT ON COLUMN materials.board_feet IS 'Volume measurement for lumber in board feet';
COMMENT ON COLUMN materials.moisture_content IS 'Percentage of moisture in wood';
COMMENT ON COLUMN materials.grade IS 'Wood grade/quality level';
COMMENT ON COLUMN materials.seasoning_status IS 'Drying status of the wood';
