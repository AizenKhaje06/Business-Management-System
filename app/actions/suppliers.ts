'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';
import type {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  Material,
  MaterialWithSupplier,
  CreateMaterialInput,
  UpdateMaterialInput,
  MaterialPurchase,
  MaterialPurchaseWithRelations,
  CreatePurchaseInput,
} from '@/types/supplier';

export type SupplierActionResult =
  { success: true; data?: unknown } | { success: false; error: string };

// ============================================================================
// Suppliers
// ============================================================================

export async function createSupplier(
  input: CreateSupplierInput
): Promise<SupplierActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('inventory.create')) {
    return {
      success: false,
      error: 'You do not have permission to create suppliers.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name: input.name,
      contact_person: input.contact_person || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      postal_code: input.postal_code || null,
      country: input.country || 'US',
      website: input.website || null,
      tax_id: input.tax_id || null,
      payment_terms: input.payment_terms || null,
      notes: input.notes || null,
      is_active: input.is_active ?? true,
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'create', 'supplier', {
    entityId: data.id,
    entityName: input.name,
  });

  revalidatePath('/suppliers');
  return { success: true, data };
}

export async function updateSupplier(
  input: UpdateSupplierInput
): Promise<SupplierActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('inventory.edit')) {
    return {
      success: false,
      error: 'You do not have permission to edit suppliers.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { id, ...rest } = input;
  const { error } = await supabase
    .from('suppliers')
    .update({
      name: rest.name,
      contact_person: rest.contact_person || null,
      email: rest.email || null,
      phone: rest.phone || null,
      address: rest.address || null,
      city: rest.city || null,
      state: rest.state || null,
      postal_code: rest.postal_code || null,
      country: rest.country || 'US',
      website: rest.website || null,
      tax_id: rest.tax_id || null,
      payment_terms: rest.payment_terms || null,
      notes: rest.notes || null,
      is_active: rest.is_active,
    })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'update', 'supplier', {
    entityId: id,
    entityName: rest.name,
  });

  revalidatePath('/suppliers');
  revalidatePath(`/suppliers/${id}`);
  return { success: true };
}

export async function deleteSupplier(
  supplierId: string
): Promise<SupplierActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('inventory.delete')) {
    return {
      success: false,
      error: 'You do not have permission to delete suppliers.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplierId);

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'delete', 'supplier', {
    entityId: supplierId,
  });

  revalidatePath('/suppliers');
  return { success: true };
}

export async function getSuppliers(params?: {
  search?: string;
  isActive?: boolean | 'all';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<{ suppliers: Supplier[]; total: number }> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    isActive = 'all',
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 15,
  } = params || {};

  let query = supabase.from('suppliers').select('*', { count: 'exact' });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,supplier_code.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  if (isActive !== 'all') {
    query = query.eq('is_active', isActive);
  }

  query = query.order(sortBy, { ascending: sortDir === 'asc' });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return { suppliers: [], total: 0 };

  return { suppliers: (data || []) as Supplier[], total: count || 0 };
}

export async function getSupplierById(
  supplierId: string
): Promise<Supplier | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .maybeSingle();
  return data as Supplier | null;
}

export async function getSupplierMaterials(
  supplierId: string
): Promise<MaterialWithSupplier[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('materials')
    .select('*, supplier:suppliers(name, supplier_code)')
    .eq('supplier_id', supplierId)
    .order('name');

  return (data || []).map((m) => {
    const supplier = m.supplier as unknown as {
      name: string;
      supplier_code: string | null;
    } | null;
    return {
      ...m,
      supplier_name: supplier?.name ?? null,
      supplier_code: supplier?.supplier_code ?? null,
    } as MaterialWithSupplier;
  });
}

export async function getSupplierPurchases(
  supplierId: string
): Promise<MaterialPurchaseWithRelations[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('material_purchases')
    .select(
      `*, project:projects(name, project_code), material:materials(name, material_code)`
    )
    .eq('supplier_id', supplierId)
    .order('purchase_date', { ascending: false });

  return (data || []).map((p) => {
    const project = p.project as unknown as {
      name: string;
      project_code: string | null;
    } | null;
    const material = p.material as unknown as {
      name: string;
      material_code: string | null;
    } | null;
    return {
      ...p,
      project_name: project?.name ?? null,
      project_code: project?.project_code ?? null,
      supplier_name: null,
      material_name: material?.name ?? null,
      material_code: material?.material_code ?? null,
    } as MaterialPurchaseWithRelations;
  });
}

// ============================================================================
// Materials
// ============================================================================

export async function createMaterial(
  input: CreateMaterialInput
): Promise<SupplierActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('inventory.create')) {
    return {
      success: false,
      error: 'You do not have permission to create materials.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('materials')
    .insert({
      name: input.name,
      description: input.description || null,
      unit: input.unit || null,
      unit_cost: input.unit_cost || null,
      supplier_id: input.supplier_id || null,
      is_active: input.is_active ?? true,
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'create', 'material', {
    entityId: data.id,
    entityName: input.name,
  });

  revalidatePath('/materials');
  return { success: true, data };
}

export async function updateMaterial(
  input: UpdateMaterialInput
): Promise<SupplierActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('inventory.edit')) {
    return {
      success: false,
      error: 'You do not have permission to edit materials.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { id, ...rest } = input;
  const { error } = await supabase
    .from('materials')
    .update({
      name: rest.name,
      description: rest.description || null,
      unit: rest.unit || null,
      unit_cost: rest.unit_cost,
      supplier_id: rest.supplier_id || null,
      is_active: rest.is_active,
    })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'update', 'material', {
    entityId: id,
    entityName: rest.name,
  });

  revalidatePath('/materials');
  revalidatePath(`/materials/${id}`);
  return { success: true };
}

export async function deleteMaterial(
  materialId: string
): Promise<SupplierActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('inventory.delete')) {
    return {
      success: false,
      error: 'You do not have permission to delete materials.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', materialId);

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'delete', 'material', {
    entityId: materialId,
  });

  revalidatePath('/materials');
  return { success: true };
}

export async function getMaterials(params?: {
  search?: string;
  supplierId?: string;
  isActive?: boolean | 'all';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<{ materials: MaterialWithSupplier[]; total: number }> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    supplierId,
    isActive = 'all',
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 15,
  } = params || {};

  let query = supabase
    .from('materials')
    .select('*, supplier:suppliers(name, supplier_code)', {
      count: 'exact',
    });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,material_code.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (supplierId) query = query.eq('supplier_id', supplierId);
  if (isActive !== 'all') query = query.eq('is_active', isActive);

  query = query.order(sortBy, { ascending: sortDir === 'asc' });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return { materials: [], total: 0 };

  const materials = (data || []).map((m) => {
    const supplier = m.supplier as unknown as {
      name: string;
      supplier_code: string | null;
    } | null;
    return {
      ...m,
      supplier_name: supplier?.name ?? null,
      supplier_code: supplier?.supplier_code ?? null,
    } as MaterialWithSupplier;
  });

  return { materials, total: count || 0 };
}

export async function getMaterialById(
  materialId: string
): Promise<MaterialWithSupplier | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('materials')
    .select('*, supplier:suppliers(name, supplier_code)')
    .eq('id', materialId)
    .maybeSingle();

  if (!data) return null;
  const supplier = data.supplier as unknown as {
    name: string;
    supplier_code: string | null;
  } | null;
  return {
    ...data,
    supplier_name: supplier?.name ?? null,
    supplier_code: supplier?.supplier_code ?? null,
  } as MaterialWithSupplier;
}

export async function getMaterialPurchases(
  materialId: string
): Promise<MaterialPurchaseWithRelations[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('material_purchases')
    .select(`*, project:projects(name, project_code), supplier:suppliers(name)`)
    .eq('material_id', materialId)
    .order('purchase_date', { ascending: false });

  return (data || []).map((p) => {
    const project = p.project as unknown as {
      name: string;
      project_code: string | null;
    } | null;
    const supplier = p.supplier as unknown as { name: string } | null;
    return {
      ...p,
      project_name: project?.name ?? null,
      project_code: project?.project_code ?? null,
      supplier_name: supplier?.name ?? null,
      material_name: null,
      material_code: null,
    } as MaterialPurchaseWithRelations;
  });
}

// ============================================================================
// Material Purchases
// ============================================================================

export async function createPurchase(
  input: CreatePurchaseInput
): Promise<SupplierActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('inventory.create')) {
    return {
      success: false,
      error: 'You do not have permission to create purchases.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('material_purchases')
    .insert({
      project_id: input.project_id || null,
      supplier_id: input.supplier_id || null,
      material_id: input.material_id || null,
      purchase_date: input.purchase_date,
      quantity: input.quantity,
      unit_cost: input.unit_cost,
      invoice_number: input.invoice_number || null,
      payment_method: input.payment_method || null,
      notes: input.notes || null,
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/materials');
  if (input.material_id) revalidatePath(`/materials/${input.material_id}`);
  if (input.project_id) revalidatePath(`/projects/${input.project_id}`);
  return { success: true, data };
}

export async function getPurchases(params?: {
  search?: string;
  projectId?: string;
  supplierId?: string;
  materialId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<{
  purchases: MaterialPurchaseWithRelations[];
  total: number;
}> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    projectId,
    supplierId,
    materialId,
    dateFrom,
    dateTo,
    sortBy = 'purchase_date',
    sortDir = 'desc',
    page = 1,
    pageSize = 15,
  } = params || {};

  let query = supabase
    .from('material_purchases')
    .select(
      `*, project:projects(name, project_code), supplier:suppliers(name), material:materials(name, material_code)`,
      { count: 'exact' }
    );

  if (search) {
    query = query.or(
      `purchase_code.ilike.%${search}%,invoice_number.ilike.%${search}%`
    );
  }
  if (projectId) query = query.eq('project_id', projectId);
  if (supplierId) query = query.eq('supplier_id', supplierId);
  if (materialId) query = query.eq('material_id', materialId);
  if (dateFrom) query = query.gte('purchase_date', dateFrom);
  if (dateTo) query = query.lte('purchase_date', dateTo);

  query = query.order(sortBy, { ascending: sortDir === 'asc' });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return { purchases: [], total: 0 };

  const purchases = (data || []).map((p) => {
    const project = p.project as unknown as {
      name: string;
      project_code: string | null;
    } | null;
    const supplier = p.supplier as unknown as { name: string } | null;
    const material = p.material as unknown as {
      name: string;
      material_code: string | null;
    } | null;
    return {
      ...p,
      project_name: project?.name ?? null,
      project_code: project?.project_code ?? null,
      supplier_name: supplier?.name ?? null,
      material_name: material?.name ?? null,
      material_code: material?.material_code ?? null,
    } as MaterialPurchaseWithRelations;
  });

  return { purchases, total: count || 0 };
}

export async function getActiveSuppliers(): Promise<
  Array<{ id: string; name: string; supplier_code: string | null }>
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('suppliers')
    .select('id, name, supplier_code')
    .eq('is_active', true)
    .order('name');
  return data || [];
}

export async function getActiveMaterials(): Promise<
  Array<{
    id: string;
    name: string;
    material_code: string | null;
    unit: string | null;
    unit_cost: number | null;
  }>
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('materials')
    .select('id, name, material_code, unit, unit_cost')
    .eq('is_active', true)
    .order('name');
  return data || [];
}
