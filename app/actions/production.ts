'use server';

/**
 * Production System Server Actions
 * Handle production orders, product catalog, and manufacturing workflow
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import type {
  ProductCatalog,
  ProductCatalogWithDetails,
  ProductionOrder,
  ProductionOrderWithDetails,
  ProductionStage,
  CreateProductCatalogInput,
  UpdateProductCatalogInput,
  CreateProductionOrderInput,
  UpdateProductionOrderInput,
  CreateProductionStageInput,
  UpdateProductionStageInput,
  ProductCategory,
} from '@/types/production';

// ============================================================================
// PRODUCT CATALOG
// ============================================================================

export async function getProductCategories(): Promise<ProductCategory[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

export async function getProducts(filters?: {
  category_id?: string;
  is_active?: boolean;
  search?: string;
}): Promise<ProductCatalog[]> {
  const supabase = createSupabaseServerClient();

  let query = supabase.from('product_catalog').select(`
    *,
    category:product_categories(*)
  `);

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  query = query.order('name');

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getProductById(
  id: string
): Promise<ProductCatalogWithDetails | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('product_catalog')
    .select(
      `
      *,
      category:product_categories(*),
      specifications:product_specifications(*),
      materials:product_materials(
        *,
        material:materials(*)
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProduct(
  input: CreateProductCatalogInput
): Promise<{ success: boolean; error?: string; data?: ProductCatalog }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.create')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('product_catalog')
    .insert({
      ...input,
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/products');
  return { success: true, data };
}

export async function updateProduct(
  input: UpdateProductCatalogInput
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { id, ...updateData } = input;

  const { error } = await supabase
    .from('product_catalog')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/products');
  revalidatePath(`/products/${id}`);
  return { success: true };
}

export async function deleteProduct(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.delete')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('product_catalog')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/products');
  return { success: true };
}

// ============================================================================
// PRODUCTION ORDERS
// ============================================================================

export async function getProductionOrders(filters?: {
  status?: string;
  priority?: string;
  assigned_to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  orders: ProductionOrderWithDetails[];
  total: number;
}> {
  const supabase = createSupabaseServerClient();

  let query = supabase.from('production_orders').select(
    `
      *,
      product:product_catalog(*),
      client:clients(id, name),
      project:projects(id, name),
      created_by_user:profiles!created_by(id, first_name, last_name),
      assigned_to_user:profiles!assigned_to(id, first_name, last_name)
    `,
    { count: 'exact' }
  );

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority);
  }

  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }

  if (filters?.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`
    );
  }

  query = query.order('created_at', { ascending: false });

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // Fetch stages for each order
  const ordersWithStages = await Promise.all(
    (data || []).map(async (order) => {
      const { data: stages } = await supabase
        .from('production_stages')
        .select('*')
        .eq('production_order_id', order.id)
        .order('stage_order');

      return {
        ...order,
        stages: stages || [],
      };
    })
  );

  return {
    orders: ordersWithStages as ProductionOrderWithDetails[],
    total: count || 0,
  };
}

export async function getProductionOrderById(
  id: string
): Promise<ProductionOrderWithDetails | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('production_orders')
    .select(
      `
      *,
      product:product_catalog(*),
      client:clients(id, name),
      project:projects(id, name),
      created_by_user:profiles!created_by(id, first_name, last_name),
      assigned_to_user:profiles!assigned_to(id, first_name, last_name),
      stages:production_stages(*)
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ProductionOrderWithDetails;
}

export async function createProductionOrder(
  input: CreateProductionOrderInput
): Promise<{
  success: boolean;
  error?: string;
  data?: ProductionOrder;
}> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('orders.create')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  // Generate order number
  const { data: orderNumberData, error: orderNumberError } = await supabase.rpc(
    'generate_production_order_number'
  );

  if (orderNumberError) {
    return { success: false, error: orderNumberError.message };
  }

  const { data, error } = await supabase
    .from('production_orders')
    .insert({
      order_number: orderNumberData,
      ...input,
      created_by: ctx.user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Create default production stages
  const defaultStages: CreateProductionStageInput[] = [
    {
      production_order_id: data.id,
      stage_name: 'design',
      stage_order: 1,
    },
    {
      production_order_id: data.id,
      stage_name: 'cutting',
      stage_order: 2,
    },
    {
      production_order_id: data.id,
      stage_name: 'assembly',
      stage_order: 3,
    },
    {
      production_order_id: data.id,
      stage_name: 'finishing',
      stage_order: 4,
    },
    {
      production_order_id: data.id,
      stage_name: 'quality_control',
      stage_order: 5,
    },
    {
      production_order_id: data.id,
      stage_name: 'packaging',
      stage_order: 6,
    },
    {
      production_order_id: data.id,
      stage_name: 'delivery',
      stage_order: 7,
    },
  ];

  const { error: stagesError } = await supabase
    .from('production_stages')
    .insert(defaultStages);

  if (stagesError) {
    console.error('Failed to create production stages:', stagesError);
  }

  revalidatePath('/production');
  return { success: true, data };
}

export async function updateProductionOrder(
  input: UpdateProductionOrderInput
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('orders.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { id, ...updateData } = input;

  const { error } = await supabase
    .from('production_orders')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/production');
  revalidatePath(`/production/${id}`);
  return { success: true };
}

export async function deleteProductionOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('orders.delete')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('production_orders')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/production');
  return { success: true };
}

// ============================================================================
// PRODUCTION STAGES
// ============================================================================

export async function updateProductionStage(
  input: UpdateProductionStageInput
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('orders.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { id, ...updateData } = input;

  const { error } = await supabase
    .from('production_stages')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Get the production_order_id to revalidate the correct path
  const { data: stage } = await supabase
    .from('production_stages')
    .select('production_order_id')
    .eq('id', id)
    .single();

  if (stage) {
    revalidatePath(`/production/${stage.production_order_id}`);
  }
  revalidatePath('/production');

  return { success: true };
}

export async function startProductionStage(
  stageId: string
): Promise<{ success: boolean; error?: string }> {
  return updateProductionStage({
    id: stageId,
    status: 'in_progress',
    actual_start_date: new Date().toISOString(),
  });
}

export async function completeProductionStage(
  stageId: string,
  actualHours?: number
): Promise<{ success: boolean; error?: string }> {
  return updateProductionStage({
    id: stageId,
    status: 'completed',
    actual_end_date: new Date().toISOString(),
    actual_hours: actualHours,
  });
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getProductionStats(): Promise<{
  totalOrders: number;
  inProgress: number;
  completed: number;
  pending: number;
}> {
  const supabase = createSupabaseServerClient();

  const [total, inProgress, completed, pending] = await Promise.all([
    supabase
      .from('production_orders')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('production_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_progress'),
    supabase
      .from('production_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from('production_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  return {
    totalOrders: total.count || 0,
    inProgress: inProgress.count || 0,
    completed: completed.count || 0,
    pending: pending.count || 0,
  };
}
