# Production System Setup Guide

## 🎯 Overview

This guide will help you set up the **Production Management System** for TWO HEADS Wood Furniture Manufacturing. The system includes:

- ✅ Product Catalog with Categories
- ✅ Production Orders Management
- ✅ Production Stage Tracking (Design → Cutting → Assembly → Finishing → QC → Delivery)
- ✅ Bill of Materials (BOM)
- ✅ Wood-Specific Inventory Management
- ✅ Quality Control System

---

## 📋 Prerequisites

Before proceeding, ensure:
- ✅ Database is running (Supabase)
- ✅ You have OWNER or ADMIN access
- ✅ Environment variables are configured (`.env.local`)

---

## 🚀 Step 1: Run Database Migration

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `wxzwjghldpyafzjnfgoo`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "+ New Query"

3. **Run Migration**
   - Open file: `supabase/migrations/20260927000002_add_production_system.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run" or press `Ctrl+Enter`

4. **Verify Success**
   - Should see "Success. No rows returned"
   - Check Tables section for new tables:
     - `product_categories`
     - `product_catalog`
     - `production_orders`
     - `production_stages`
     - `qc_inspections`
     - etc.

### Option B: Via Supabase CLI (Advanced)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref wxzwjghldpyafzjnfgoo

# Apply migration
supabase db push
```

---

## ✅ Step 2: Verify Database Tables

After running the migration, verify these tables exist:

### Core Tables:
- ✅ `product_categories` - Product categories
- ✅ `product_catalog` - Product templates
- ✅ `product_specifications` - Product specs (dimensions, wood types)
- ✅ `product_materials` - Bill of Materials (BOM)
- ✅ `production_orders` - Manufacturing work orders
- ✅ `production_stages` - Workflow stages
- ✅ `production_materials_usage` - Material consumption tracking
- ✅ `qc_inspections` - Quality control inspections
- ✅ `qc_defects` - Defect tracking

### Enhanced Tables:
- ✅ `materials` - Now has wood-specific columns:
  - `wood_species`
  - `board_feet`
  - `moisture_content`
  - `grade`
  - `storage_location`
  - `seasoning_status`

---

## 📦 Step 3: Verify Seed Data

The migration automatically seeds:

### Product Categories (7 categories):
1. **Doors** - Main doors and interior doors
2. **Door Components** - Door jambs and frames
3. **Flooring** - Hardwood flooring
4. **Stair Components** - Stairs, railings, balusters
5. **Moldings** - Decorative moldings and trim
6. **Paneling** - Wall and ceiling panels
7. **Custom Furniture** - Custom pieces

### Sample Products (11 products):
- Solid Wood Main Door - Standard
- Solid Wood Main Door - Premium
- Interior Door - Standard
- Interior Door - Premium
- Door Jamb Set - Standard
- Door Jamb Set - Premium
- Stair Tread - Hardwood
- Stair Railing System
- Baluster Set (10 pieces)
- Wall Panel - 4x8 ft
- Ceiling Panel - 4x8 ft

### Verify in Database:

```sql
-- Check categories
SELECT * FROM product_categories ORDER BY display_order;

-- Check products
SELECT 
  pc.name as product_name,
  pcat.name as category,
  pc.sku,
  pc.base_price
FROM product_catalog pc
JOIN product_categories pcat ON pcat.id = pc.category_id
ORDER BY pcat.display_order, pc.name;
```

---

## 🎨 Step 4: Access the System

### New Pages Available:

1. **Production Orders Page**
   - URL: `http://localhost:3000/production`
   - Features:
     - View all production orders
     - Create new production orders
     - Track status and progress
     - Filter by status, priority
     - Statistics dashboard

2. **Products Page** (Coming Soon)
   - URL: `http://localhost:3000/products`
   - Features:
     - Product catalog management
     - Add/edit products
     - Define specifications
     - Set Bill of Materials (BOM)

3. **Production Order Detail Page** (Coming Soon)
   - URL: `http://localhost:3000/production/[id]`
   - Features:
     - Stage-by-stage tracking
     - Material usage recording
     - QC inspections
     - Timeline view

---

## 🔐 Required Permissions

To use the production system, users need these permissions:

### View Production:
- `orders.view` - View production orders
- `inventory.view` - View products and materials

### Create/Manage Production:
- `orders.create` - Create production orders
- `orders.edit` - Update production orders
- `inventory.create` - Add new products
- `inventory.edit` - Edit products and BOM

### Which Roles Have Access:

| Role | View | Create | Edit | Delete | QC |
|------|------|--------|------|--------|----|
| OWNER | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ✅ | ❌ | ✅ |
| ACCOUNTANT | ✅ | ❌ | ❌ | ❌ | ❌ |
| STAFF | ✅ | ✅ | ❌ | ❌ | ✅ |
| VIEWER | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📝 Step 5: Create Your First Production Order

### Via UI (Recommended):

1. **Navigate to Production**
   - Go to: http://localhost:3000/production
   
2. **Click "New Production Order"**
   
3. **Fill in Details**:
   - Select Product (e.g., "Solid Wood Main Door - Standard")
   - Select Client
   - Link to Project (optional)
   - Set Quantity
   - Set Priority
   - Add Custom Specifications (if needed)
   - Assign to Team Member
   
4. **Save**
   - System auto-generates Order Number: `PO-2026-00001`
   - Automatically creates 7 production stages:
     1. Design & Planning
     2. Wood Cutting
     3. Assembly
     4. Finishing & Polishing
     5. Quality Control
     6. Packaging
     7. Delivery

### Via SQL (Testing):

```sql
-- First, get a product ID
SELECT id, name FROM product_catalog WHERE name LIKE '%Main Door%' LIMIT 1;

-- Get a client ID
SELECT id, name FROM clients LIMIT 1;

-- Insert production order
INSERT INTO production_orders (
  order_number,
  product_id,
  client_id,
  quantity,
  priority,
  status,
  scheduled_start_date,
  scheduled_end_date,
  notes
) VALUES (
  'PO-2026-00001',
  '[product_id_from_above]',
  '[client_id_from_above]',
  1,
  'normal',
  'pending',
  '2026-09-28',
  '2026-10-15',
  'First test production order'
);
```

---

## 🔧 Customization Guide

### Add New Product Category:

```sql
INSERT INTO product_categories (name, description, display_order) 
VALUES ('Your Category', 'Description here', 8);
```

### Add New Product:

```sql
-- Get category ID first
SELECT id FROM product_categories WHERE name = 'Doors';

INSERT INTO product_catalog (
  category_id,
  name,
  sku,
  description,
  base_price,
  is_customizable
) VALUES (
  '[category_id]',
  'Custom Mahogany Door',
  'DOOR-CUST-MAH',
  'Custom crafted mahogany door',
  35000.00,
  true
);
```

### Add Product Specifications:

```sql
-- Get product ID
SELECT id FROM product_catalog WHERE sku = 'DOOR-CUST-MAH';

INSERT INTO product_specifications (product_id, spec_key, spec_value, spec_unit) VALUES
  ('[product_id]', 'width', '36', 'inches'),
  ('[product_id]', 'height', '80', 'inches'),
  ('[product_id]', 'thickness', '1.75', 'inches'),
  ('[product_id]', 'wood_type', 'Mahogany', NULL),
  ('[product_id]', 'finish', 'Natural Stain', NULL);
```

### Define Bill of Materials (BOM):

```sql
-- Get product and material IDs
SELECT id FROM product_catalog WHERE sku = 'DOOR-CUST-MAH';
SELECT id, name FROM materials WHERE wood_species = 'Mahogany';

INSERT INTO product_materials (
  product_id,
  material_id,
  quantity_required,
  unit,
  waste_factor
) VALUES (
  '[product_id]',
  '[material_id]',
  25.00,  -- board feet
  'board_feet',
  15.00   -- 15% waste allowance
);
```

---

## 🪵 Wood Inventory Management

### Add Wood Materials:

```sql
INSERT INTO materials (
  name,
  sku,
  category,
  unit_of_measure,
  stock_quantity,
  unit_cost,
  wood_species,
  board_feet,
  grade,
  thickness,
  width,
  length,
  dimension_unit,
  moisture_content,
  seasoning_status,
  storage_location
) VALUES (
  'Mahogany Lumber - Premium Grade',
  'WOOD-MAH-PREM',
  'Hardwood',
  'board_feet',
  500.00,
  250.00,
  'Mahogany',
  500.00,
  'Premium',
  2.00,
  8.00,
  96.00,
  'inches',
  8.5,
  'kiln_dried',
  'Warehouse A - Section 3'
);
```

### Common Philippine Wood Species:

- **Narra** (Philippine Mahogany) - Premium, expensive
- **Molave** - Very durable, heavy
- **Yakal** - Extremely hard
- **Kamagong** (Ironwood) - Luxury wood
- **Mahogany** - Common, affordable
- **Acacia** - Fast-growing, sustainable
- **Dao** - Light-colored hardwood

---

## 🎯 Production Workflow

### Standard Production Flow:

```
1. Design & Planning (1-2 days)
   └─ Create technical drawings
   └─ Calculate materials needed
   └─ Review with client

2. Wood Cutting (2-3 days)
   └─ Select and prepare wood
   └─ Cut to specifications
   └─ Initial sanding

3. Assembly (3-5 days)
   └─ Join components
   └─ Install hardware
   └─ First assembly check

4. Finishing & Polishing (3-4 days)
   └─ Apply stain/paint
   └─ Multiple coats
   └─ Final polishing

5. Quality Control (1 day)
   └─ Inspect for defects
   └─ Verify dimensions
   └─ Test functionality

6. Packaging (1 day)
   └─ Protective wrapping
   └─ Prepare for delivery

7. Delivery (1 day)
   └─ Transport to client site
   └─ Installation (if included)
```

---

## 📊 Reports & Analytics

### View Production Statistics:

```sql
-- Orders by status
SELECT 
  status,
  COUNT(*) as count,
  SUM(quantity) as total_units
FROM production_orders
GROUP BY status
ORDER BY status;

-- Orders by priority
SELECT 
  priority,
  COUNT(*) as count
FROM production_orders
WHERE status IN ('pending', 'approved', 'in_progress')
GROUP BY priority
ORDER BY 
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END;

-- Average production time
SELECT 
  AVG(EXTRACT(DAY FROM (actual_end_date - actual_start_date))) as avg_days
FROM production_orders
WHERE status = 'completed'
AND actual_start_date IS NOT NULL
AND actual_end_date IS NOT NULL;
```

---

## 🐛 Troubleshooting

### Issue: Migration fails with "table already exists"

**Solution:** The migration is idempotent and uses `IF NOT EXISTS`. If you see this, it means tables are already created. You can:
1. Skip the migration (already applied)
2. Or drop tables and re-run (caution: will lose data)

### Issue: Can't see production menu

**Solution:** Check user permissions:
```sql
SELECT 
  p.first_name,
  p.last_name,
  r.name as role,
  perm.name as permission
FROM profiles p
JOIN roles r ON r.id = p.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions perm ON perm.id = rp.permission_id
WHERE p.id = '[your_user_id]'
AND perm.name LIKE 'orders.%';
```

### Issue: Production order number not generating

**Solution:** Check function exists:
```sql
SELECT generate_production_order_number();
```

### Issue: Can't create production stages

**Solution:** Verify `production_stages` table exists and user has `orders.edit` permission.

---

## 🎓 Next Steps

Now that production system is set up:

1. ✅ **Phase 1 Complete**: Production Orders ✓
2. 🔄 **Phase 2 (Next)**: Build Product Catalog UI
3. 🔄 **Phase 3**: Production Order Detail Page with Stage Tracking
4. 🔄 **Phase 4**: Quality Control UI
5. 🔄 **Phase 5**: Material Usage & Waste Tracking
6. 🔄 **Phase 6**: Production Reports & Analytics

---

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Verify database migration ran successfully
3. Check user permissions
4. Review server logs for errors

---

**🎉 Congratulations! Your production system is now ready for TWO HEADS Wood Furniture Manufacturing!**
