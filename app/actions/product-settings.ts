'use server';

/**
 * Product Settings Server Actions
 * Manage wood types, finishes, and material categories
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import type {
  WoodType,
  WoodFinish,
  MaterialCategory,
  CreateWoodTypeInput,
  UpdateWoodTypeInput,
  CreateWoodFinishInput,
  UpdateWoodFinishInput,
  CreateMaterialCategoryInput,
  UpdateMaterialCategoryInput,
} from '@/types/product-settings';

// ============================================================================
// WOOD TYPES
// ============================================================================

export async function getWoodTypes(includeInactive = false): Promise<WoodType[]> {
  const supabase = createSupabaseServerClient();

  let query = supabase.from('wood_types').select('*').order('display_order');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createWoodType(
  input: CreateWoodTypeInput
): Promise<{ success: boolean; error?: string; data?: WoodType }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('wood_types')
    .insert({
      ...input,
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/products');
  return { success: true, data };
}

export async function updateWoodType(
  input: UpdateWoodTypeInput
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { id, ...updateData } = input;

  const { error } = await supabase
    .from('wood_types')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/products');
  return { success: true };
}

export async function deleteWoodType(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from('wood_types').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/products');
  return { success: true };
}

// ============================================================================
// WOOD FINISHES
// ============================================================================

export async function getWoodFinishes(includeInactive = false): Promise<WoodFinish[]> {
  const supabase = createSupabaseServerClient();

  let query = supabase.from('wood_finishes').select('*').order('display_order');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createWoodFinish(
  input: CreateWoodFinishInput
): Promise<{ success: boolean; error?: string; data?: WoodFinish }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('wood_finishes')
    .insert({
      ...input,
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/products');
  return { success: true, data };
}

export async function updateWoodFinish(
  input: UpdateWoodFinishInput
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { id, ...updateData } = input;

  const { error } = await supabase
    .from('wood_finishes')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/products');
  return { success: true };
}

export async function deleteWoodFinish(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from('wood_finishes').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/products');
  return { success: true };
}

// ============================================================================
// MATERIAL CATEGORIES
// ============================================================================

export async function getMaterialCategories(
  includeInactive = false
): Promise<MaterialCategory[]> {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from('material_categories')
    .select('*')
    .order('display_order');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createMaterialCategory(
  input: CreateMaterialCategoryInput
): Promise<{ success: boolean; error?: string; data?: MaterialCategory }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('material_categories')
    .insert({
      ...input,
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/products');
  return { success: true, data };
}

export async function updateMaterialCategory(
  input: UpdateMaterialCategoryInput
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { id, ...updateData } = input;

  const { error } = await supabase
    .from('material_categories')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/products');
  return { success: true };
}

export async function deleteMaterialCategory(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCurrentUserContext();

  if (!ctx || !ctx.permissions.includes('inventory.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = createSupabaseServerClient();

  const { error} = await supabase.from('material_categories').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/products');
  return { success: true };
}
