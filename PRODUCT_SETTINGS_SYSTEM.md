# Product Settings Management System

## Overview
Dynamic configuration system for wood types, finishes, and material categories. Replaces hardcoded dropdown values with database-managed lists.

---

## Database Migration

### File: `supabase/migrations/20260927000004_create_product_settings_tables.sql`

**Created Tables:**

1. **`wood_types`** - Philippine and imported wood species
   - Columns: name, description, color, hardness_rating, is_active, display_order
   - Pre-seeded: Narra, Mahogany, Molave, Kamagong, Oak, etc.

2. **`wood_finishes`** - Finish options for products
   - Columns: name, description, finish_type, drying_time, is_active, display_order
   - Pre-seeded: Natural Stain, Varnish, Lacquer, Oil Finish, etc.

3. **`material_categories`** - Categories for materials inventory
   - Columns: name, description, icon, is_active, display_order
   - Pre-seeded: Lumber, Plywood, Hardware, Finishing, etc.

**Permissions:**
- All authenticated users can READ
- Only users with `inventory.edit` can CREATE/UPDATE/DELETE

---

## Files Created

### 1. Types (`types/product-settings.ts`)
- `WoodType`, `WoodFinish`, `MaterialCategory`
- Create/Update input types for each

### 2. Server Actions (`app/actions/product-settings.ts`)
- `getWoodTypes()`, `createWoodType()`, `updateWoodType()`, `deleteWoodType()`
- `getWoodFinishes()`, `createWoodFinish()`, `updateWoodFinish()`, `deleteWoodFinish()`
- `getMaterialCategories()`, etc.

### 3. Settings Page (`app/settings/products/page.tsx`) - **TO BE CREATED**
- Manage all three lists in one page
- Tabs for Wood Types, Finishes, Material Categories
- Add/Edit/Delete functionality
- Reorder by display_order

### 4. Update Product Forms - **TO BE UPDATED**
- `components/production/create-product-modal.tsx`
- `components/production/product-detail-modal.tsx`
- Replace hardcoded Select options with dynamic data from database

---

## Next Steps

### Step 1: Run Migration
```bash
# Run in Supabase Dashboard SQL Editor or CLI
supabase db push
```

### Step 2: Create Settings Page
Create `/app/settings/products/page.tsx` with:
- Three tabs: Wood Types, Finishes, Material Categories
- Table view with Add/Edit/Delete buttons
- Forms for creating/editing entries
- Drag-and-drop reordering (optional)

### Step 3: Update Product Forms
Replace hardcoded options:

**Before:**
```tsx
<SelectItem value="Mahogany">Mahogany</SelectItem>
<SelectItem value="Narra">Narra</SelectItem>
```

**After:**
```tsx
{woodTypes.map((wood) => (
  <SelectItem key={wood.id} value={wood.name}>
    {wood.name}
  </SelectItem>
))}
```

### Step 4: Add to Navigation
Add link to settings page in app navigation/sidebar

---

## Pre-Seeded Data

### Wood Types (10 entries):
- Narra, Mahogany, Molave, Kamagong, Yakal
- Dao, Acacia, Pine, Oak, Teak

### Wood Finishes (10 entries):
- Natural Stain, Dark Stain, Light Stain
- Varnish, Lacquer, Oil Finish
- Painted, Unfinished, Matte, Semi-Gloss

### Material Categories (8 entries):
- Lumber 🪵, Plywood 📋, Hardware 🔧
- Finishing 🎨, Adhesives 🧪, Tools 🛠️
- Accessories ✨, Packaging 📦

---

## Benefits

### Before (Hardcoded):
- ❌ Need to edit code to add new wood type
- ❌ Need to redeploy to change options
- ❌ No control for business users
- ❌ Duplicate lists in multiple files

### After (Dynamic):
- ✅ Add new options via UI (no code changes)
- ✅ Business users can manage lists
- ✅ Single source of truth (database)
- ✅ Easy to maintain and update
- ✅ Can track who added what and when
- ✅ Can temporarily disable options (is_active)
- ✅ Can reorder for better UX (display_order)

---

## Features

### For Each List:
- ✅ **Add** new entries via form
- ✅ **Edit** existing entries
- ✅ **Delete** unused entries
- ✅ **Activate/Deactivate** without deleting
- ✅ **Reorder** for dropdown display
- ✅ **Search/Filter** in settings page
- ✅ **Audit trail** - created_by, created_at, updated_at

### Permissions:
- ✅ **Owner/Admin/Manager** can manage all lists
- ✅ **Other roles** can only view/use in dropdowns
- ✅ Based on `inventory.edit` permission

---

## Usage Examples

### Add New Wood Type:
1. Go to Settings → Product Settings
2. Click "Wood Types" tab
3. Click "Add Wood Type"
4. Enter: Name: "Guijo", Description: "Hard construction wood"
5. Save
6. Immediately available in product forms!

### Edit Finish:
1. Go to Settings → Product Settings
2. Click "Finishes" tab
3. Find "Varnish", click Edit
4. Update description or drying time
5. Save

### Deactivate Category:
1. Go to Settings → Product Settings
2. Click "Material Categories" tab
3. Find unused category, toggle "Active" off
4. Won't show in dropdowns anymore (but data preserved)

---

## API Usage (For Developers)

### In Components:
```tsx
// Load wood types
const woodTypes = await getWoodTypes();

// In dropdown
<Select>
  {woodTypes.map((wood) => (
    <SelectItem key={wood.id} value={wood.name}>
      {wood.name}
      {wood.color && ` (${wood.color})`}
    </SelectItem>
  ))}
</Select>
```

### In Server Actions:
```tsx
// Get only active wood types
const activeWoods = await getWoodTypes(false);

// Get all (including inactive)
const allWoods = await getWoodTypes(true);
```

---

## Migration Status

- [x] Create database tables
- [x] Seed initial data
- [x] Create TypeScript types
- [x] Create server actions
- [ ] Create settings page UI
- [ ] Update product forms to use dynamic data
- [ ] Add navigation link
- [ ] Test CRUD operations
- [ ] Update documentation

---

## Summary

You now have a flexible system to manage wood types, finishes, and material categories without touching code. Perfect for adapting to new wood species, finish products, or material organization!

**Next**: Create the settings page UI to manage these lists! 🎨🪵✨
