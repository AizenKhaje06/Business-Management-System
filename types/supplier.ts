import type { ID, ISODateString } from './index';

export interface Supplier {
  id: ID;
  supplier_code: string | null;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  website: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface CreateSupplierInput {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  tax_id?: string;
  payment_terms?: string;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateSupplierInput extends Partial<CreateSupplierInput> {
  id: ID;
}

export interface Material {
  id: ID;
  material_code: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  unit: string | null;
  unit_cost: number | null;
  stock_quantity: number;
  reorder_level: number;
  is_active: boolean;
  supplier_id: ID | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface MaterialWithSupplier extends Material {
  supplier_name: string | null;
  supplier_code: string | null;
}

export interface CreateMaterialInput {
  name: string;
  description?: string;
  unit?: string;
  unit_cost?: number;
  supplier_id?: ID;
  is_active?: boolean;
}

export interface UpdateMaterialInput extends Partial<CreateMaterialInput> {
  id: ID;
}

export interface MaterialPurchase {
  id: ID;
  purchase_code: string | null;
  project_id: ID | null;
  supplier_id: ID | null;
  material_id: ID | null;
  purchase_date: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  invoice_number: string | null;
  payment_method: string | null;
  notes: string | null;
  created_by: ID | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface MaterialPurchaseWithRelations extends MaterialPurchase {
  project_name: string | null;
  project_code: string | null;
  supplier_name: string | null;
  material_name: string | null;
  material_code: string | null;
}

export interface CreatePurchaseInput {
  project_id?: ID;
  supplier_id?: ID;
  material_id?: ID;
  purchase_date: string;
  quantity: number;
  unit_cost: number;
  invoice_number?: string;
  payment_method?: string;
  notes?: string;
}
