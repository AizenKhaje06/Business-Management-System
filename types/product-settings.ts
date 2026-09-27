/**
 * Product Settings Types
 * Types for configurable product settings (wood types, finishes, categories)
 */

// ============================================================================
// WOOD TYPES
// ============================================================================

export type WoodType = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  hardness_rating: number | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateWoodTypeInput = {
  name: string;
  description?: string;
  color?: string;
  hardness_rating?: number;
  display_order?: number;
};

export type UpdateWoodTypeInput = Partial<CreateWoodTypeInput> & {
  id: string;
  is_active?: boolean;
};

// ============================================================================
// WOOD FINISHES
// ============================================================================

export type WoodFinish = {
  id: string;
  name: string;
  description: string | null;
  finish_type: string | null;
  drying_time: string | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateWoodFinishInput = {
  name: string;
  description?: string;
  finish_type?: string;
  drying_time?: string;
  display_order?: number;
};

export type UpdateWoodFinishInput = Partial<CreateWoodFinishInput> & {
  id: string;
  is_active?: boolean;
};

// ============================================================================
// MATERIAL CATEGORIES
// ============================================================================

export type MaterialCategory = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateMaterialCategoryInput = {
  name: string;
  description?: string;
  icon?: string;
  display_order?: number;
};

export type UpdateMaterialCategoryInput = Partial<CreateMaterialCategoryInput> & {
  id: string;
  is_active?: boolean;
};

// ============================================================================
// SETTINGS SUMMARY
// ============================================================================

export type ProductSettingsSummary = {
  woodTypes: number;
  finishes: number;
  materialCategories: number;
  productCategories: number;
};
