-- ============================================================================
-- PRODUCT SETTINGS TABLES
-- Dynamic configuration for wood types, finishes, and material categories
-- ============================================================================

-- ============================================================================
-- WOOD TYPES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wood_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text, -- e.g., "Light Brown", "Dark Red"
  hardness_rating int, -- Janka hardness scale (optional)
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wood_types ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read wood types
CREATE POLICY "select_wood_types" ON wood_types FOR SELECT
  TO authenticated USING (true);

-- Only users with inventory.edit can manage wood types
CREATE POLICY "manage_wood_types" ON wood_types FOR ALL
  TO authenticated USING (
    has_permission('inventory.edit')
  );

-- ============================================================================
-- WOOD FINISHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wood_finishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  finish_type text, -- e.g., "Oil-based", "Water-based", "Natural"
  drying_time text, -- e.g., "24 hours", "2-3 days"
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wood_finishes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read finishes
CREATE POLICY "select_wood_finishes" ON wood_finishes FOR SELECT
  TO authenticated USING (true);

-- Only users with inventory.edit can manage finishes
CREATE POLICY "manage_wood_finishes" ON wood_finishes FOR ALL
  TO authenticated USING (
    has_permission('inventory.edit')
  );

-- ============================================================================
-- MATERIAL CATEGORIES TABLE (for materials inventory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS material_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  icon text, -- icon name or emoji
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read material categories
CREATE POLICY "select_material_categories" ON material_categories FOR SELECT
  TO authenticated USING (true);

-- Only users with inventory.edit can manage material categories
CREATE POLICY "manage_material_categories" ON material_categories FOR ALL
  TO authenticated USING (
    has_permission('inventory.edit')
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_wood_types_updated_at
  BEFORE UPDATE ON wood_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_wood_finishes_updated_at
  BEFORE UPDATE ON wood_finishes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_material_categories_updated_at
  BEFORE UPDATE ON material_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SEED DATA: Philippine Wood Types
-- ============================================================================
INSERT INTO wood_types (name, description, color, hardness_rating, display_order) VALUES
  ('Narra', 'Premium Philippine hardwood, known for durability and beautiful grain', 'Golden Red', 2200, 1),
  ('Mahogany', 'Popular hardwood with rich reddish-brown color', 'Reddish Brown', 800, 2),
  ('Molave', 'Extremely durable hardwood, resistant to termites', 'Yellowish Brown', 3400, 3),
  ('Kamagong', 'Philippine ebony, very hard and dense', 'Very Dark Brown', 3660, 4),
  ('Yakal', 'Very hard and heavy wood, excellent for construction', 'Yellow Brown', 3200, 5),
  ('Dao', 'Medium hardwood, widely available', 'Light Brown', 1100, 6),
  ('Acacia', 'Fast-growing hardwood, good for furniture', 'Golden Brown', 1750, 7),
  ('Pine', 'Softwood, affordable and easy to work with', 'Light Yellow', 380, 8),
  ('Oak', 'Imported hardwood, classic choice for furniture', 'Light Brown', 1360, 9),
  ('Teak', 'High-quality imported wood, water-resistant', 'Golden Brown', 1155, 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Wood Finishes
-- ============================================================================
INSERT INTO wood_finishes (name, description, finish_type, drying_time, display_order) VALUES
  ('Natural Stain', 'Enhances natural wood grain without changing color much', 'Oil-based', '24 hours', 1),
  ('Dark Stain', 'Rich dark brown finish for elegant look', 'Oil-based', '24 hours', 2),
  ('Light Stain', 'Subtle enhancement of wood color', 'Water-based', '6 hours', 3),
  ('Varnish', 'Protective clear coat with glossy finish', 'Oil-based', '48 hours', 4),
  ('Lacquer', 'Fast-drying clear finish with smooth surface', 'Solvent-based', '2-3 hours', 5),
  ('Oil Finish', 'Natural penetrating finish that enhances grain', 'Natural oil', '12-24 hours', 6),
  ('Painted', 'Solid color paint finish', 'Water/Oil-based', '24 hours', 7),
  ('Unfinished', 'Raw wood without any finish applied', 'None', '0 hours', 8),
  ('Matte', 'Non-glossy protective finish', 'Water-based', '12 hours', 9),
  ('Semi-Gloss', 'Medium sheen protective finish', 'Oil-based', '24 hours', 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Material Categories
-- ============================================================================
INSERT INTO material_categories (name, description, icon, display_order) VALUES
  ('Lumber', 'Solid wood boards and planks', '🪵', 1),
  ('Plywood', 'Engineered wood panels', '📋', 2),
  ('Hardware', 'Screws, nails, hinges, handles', '🔧', 3),
  ('Finishing', 'Stains, varnishes, paints, sealers', '🎨', 4),
  ('Adhesives', 'Glues, epoxies, wood fillers', '🧪', 5),
  ('Tools', 'Cutting tools, sanding materials', '🛠️', 6),
  ('Accessories', 'Decorative elements, trims, moldings', '✨', 7),
  ('Packaging', 'Boxes, wrapping, protective materials', '📦', 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ADD CATEGORY REFERENCE TO MATERIALS TABLE
-- ============================================================================
-- Add category_id column to existing materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES material_categories(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);

COMMENT ON TABLE wood_types IS 'Configurable list of wood species for product specifications';
COMMENT ON TABLE wood_finishes IS 'Configurable list of wood finishes for product specifications';
COMMENT ON TABLE material_categories IS 'Configurable categories for materials inventory management';
