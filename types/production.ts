/**
 * Production System Types
 * Types for production orders, product catalog, and manufacturing workflow
 */

// ============================================================================
// PRODUCT CATALOG
// ============================================================================

export type ProductCategory = {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductCatalog = {
  id: string;
  category_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  base_price: number | null;
  estimated_production_hours: number | null;
  is_active: boolean;
  is_customizable: boolean;
  image_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductSpecification = {
  id: string;
  product_id: string;
  spec_key: string;
  spec_value: string;
  spec_unit: string | null;
  is_default: boolean;
  display_order: number;
  created_at: string;
};

export type ProductMaterial = {
  id: string;
  product_id: string;
  material_id: string;
  quantity_required: number;
  unit: string;
  waste_factor: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// PRODUCTION ORDERS
// ============================================================================

export type ProductionOrderStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'on_hold';

export type ProductionOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ProductionOrder = {
  id: string;
  order_number: string;
  project_id: string | null;
  product_id: string;
  client_id: string | null;
  quantity: number;
  status: ProductionOrderStatus;
  priority: ProductionOrderPriority;
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  custom_specifications: Record<string, any> | null;
  notes: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// PRODUCTION STAGES
// ============================================================================

export type ProductionStageName =
  | 'design'
  | 'cutting'
  | 'assembly'
  | 'finishing'
  | 'quality_control'
  | 'packaging'
  | 'delivery';

export type ProductionStageStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped';

export type ProductionStage = {
  id: string;
  production_order_id: string;
  stage_name: ProductionStageName;
  stage_order: number;
  status: ProductionStageStatus;
  assigned_to: string | null;
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// MATERIALS
// ============================================================================

export type WoodGrade =
  | 'A'
  | 'B'
  | 'C'
  | 'Select'
  | 'Premium'
  | 'Standard';

export type SeasoningStatus =
  | 'green'
  | 'air_dried'
  | 'kiln_dried'
  | 'ready';

export type DimensionUnit = 'inches' | 'mm' | 'cm' | 'feet';

export type EnhancedMaterial = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit_cost: number | null;
  stock_quantity: number;
  min_stock_level: number | null;
  unit_of_measure: string;
  is_active: boolean;
  // Wood-specific fields
  wood_species: string | null;
  board_feet: number | null;
  moisture_content: number | null;
  grade: WoodGrade | null;
  storage_location: string | null;
  seasoning_status: SeasoningStatus | null;
  thickness: number | null;
  width: number | null;
  length: number | null;
  dimension_unit: DimensionUnit;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductionMaterialsUsage = {
  id: string;
  production_order_id: string;
  material_id: string;
  planned_quantity: number;
  actual_quantity: number | null;
  waste_quantity: number;
  unit: string;
  cost_per_unit: number | null;
  total_cost: number | null;
  waste_reason: string | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
  created_at: string;
};

// ============================================================================
// QUALITY CONTROL
// ============================================================================

export type QCResult = 'pass' | 'fail' | 'conditional_pass';

export type QCActionTaken = 'approved' | 'rework' | 'scrap' | 'pending';

export type QCInspection = {
  id: string;
  production_order_id: string;
  stage_name: string;
  inspector_id: string;
  inspection_date: string;
  result: QCResult;
  score: number | null;
  notes: string | null;
  action_taken: QCActionTaken | null;
  created_at: string;
  updated_at: string;
};

export type DefectSeverity = 'minor' | 'major' | 'critical';

export type QCDefect = {
  id: string;
  inspection_id: string;
  defect_type: string;
  severity: DefectSeverity;
  location: string | null;
  description: string | null;
  resolution: string | null;
  photo_url: string | null;
  created_at: string;
};

// ============================================================================
// WITH RELATIONS (for queries that join tables)
// ============================================================================

export type ProductCatalogWithCategory = ProductCatalog & {
  category: ProductCategory;
};

export type ProductCatalogWithDetails = ProductCatalog & {
  category: ProductCategory;
  specifications: ProductSpecification[];
  materials: (ProductMaterial & {
    material: EnhancedMaterial;
  })[];
};

export type ProductionOrderWithDetails = ProductionOrder & {
  product: ProductCatalog;
  client: {
    id: string;
    name: string;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
  created_by_user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  assigned_to_user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  stages: ProductionStage[];
};

export type ProductionStageWithDetails = ProductionStage & {
  production_order: ProductionOrder;
  assigned_to_user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export type QCInspectionWithDetails = QCInspection & {
  production_order: ProductionOrder;
  inspector: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
  defects: QCDefect[];
};

// ============================================================================
// FORM TYPES (for creating/updating records)
// ============================================================================

export type CreateProductCatalogInput = {
  category_id: string;
  name: string;
  sku?: string;
  description?: string;
  base_price?: number;
  estimated_production_hours?: number;
  is_customizable?: boolean;
  image_url?: string;
  notes?: string;
};

export type UpdateProductCatalogInput = Partial<CreateProductCatalogInput> & {
  id: string;
};

export type CreateProductionOrderInput = {
  project_id?: string;
  product_id: string;
  client_id?: string;
  quantity: number;
  priority?: ProductionOrderPriority;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  estimated_hours?: number;
  custom_specifications?: Record<string, any>;
  notes?: string;
  assigned_to?: string;
};

export type UpdateProductionOrderInput = Partial<CreateProductionOrderInput> & {
  id: string;
  status?: ProductionOrderStatus;
  actual_start_date?: string;
  actual_end_date?: string;
  actual_hours?: number;
};

export type CreateProductionStageInput = {
  production_order_id: string;
  stage_name: ProductionStageName;
  stage_order: number;
  assigned_to?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  estimated_hours?: number;
  notes?: string;
};

export type UpdateProductionStageInput = {
  id: string;
  status?: ProductionStageStatus;
  actual_start_date?: string;
  actual_end_date?: string;
  actual_hours?: number;
  notes?: string;
};

export type CreateQCInspectionInput = {
  production_order_id: string;
  stage_name: string;
  result: QCResult;
  score?: number;
  notes?: string;
  action_taken?: QCActionTaken;
};

export type CreateQCDefectInput = {
  inspection_id: string;
  defect_type: string;
  severity: DefectSeverity;
  location?: string;
  description?: string;
  resolution?: string;
  photo_url?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const PRODUCTION_STAGE_LABELS: Record<ProductionStageName, string> = {
  design: 'Design & Planning',
  cutting: 'Wood Cutting',
  assembly: 'Assembly',
  finishing: 'Finishing & Polishing',
  quality_control: 'Quality Control',
  packaging: 'Packaging',
  delivery: 'Delivery',
};

export const PRODUCTION_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  in_progress: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

export const PRODUCTION_PRIORITY_LABELS: Record<
  ProductionOrderPriority,
  string
> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const QC_RESULT_LABELS: Record<QCResult, string> = {
  pass: 'Pass',
  fail: 'Fail',
  conditional_pass: 'Conditional Pass',
};

export const DEFECT_SEVERITY_LABELS: Record<DefectSeverity, string> = {
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical',
};
