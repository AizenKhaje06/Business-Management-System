'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';
import type {
  Expense,
  ExpenseWithRelations,
  ExpenseStatus,
  ExpensePaymentMethod,
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/types/expense';

export type ExpenseActionResult =
  { success: true; data?: unknown } | { success: false; error: string };

export async function createExpense(
  input: CreateExpenseInput
): Promise<ExpenseActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.create')) {
    return {
      success: false,
      error: 'You do not have permission to create expenses.',
    };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      expense_date: input.expense_date,
      invoice_number: input.invoice_number || null,
      category_id: input.category_id,
      project_id: input.project_id || null,
      supplier_id: input.supplier_id || null,
      amount: input.amount,
      description: input.description || null,
      status: input.status || 'draft',
      payment_method: input.payment_method || null,
      notes: input.notes || null,
      submitted_by: ctx.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'create', 'expense', {
    entityId: data.id,
    entityName: data.expense_code,
    newValues: { amount: input.amount, description: input.description, status: input.status || 'draft' },
  });

  revalidatePath('/expenses');
  if (input.project_id) revalidatePath(`/projects/${input.project_id}`);
  return { success: true, data };
}

export async function updateExpense(
  input: UpdateExpenseInput
): Promise<ExpenseActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return {
      success: false,
      error: 'You do not have permission to edit expenses.',
    };
  }

  // Setting status to approved requires invoices.approve permission
  if (input.status === 'approved' && !ctx.permissions.includes('invoices.approve')) {
    return {
      success: false,
      error: 'You do not have permission to approve expenses.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { id, ...rest } = input;

  const updateData: Record<string, unknown> = {
    expense_date: rest.expense_date,
    invoice_number: rest.invoice_number || null,
    category_id: rest.category_id,
    project_id: rest.project_id || null,
    supplier_id: rest.supplier_id || null,
    amount: rest.amount,
    description: rest.description || null,
    status: rest.status,
    payment_method: rest.payment_method || null,
    notes: rest.notes || null,
  };

  if (rest.status === 'approved') {
    updateData.approved_by = ctx.id;
    updateData.approved_at = new Date().toISOString();
  } else if (rest.status) {
    updateData.approved_by = null;
    updateData.approved_at = null;
  }

  const { error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'update', 'expense', {
    entityId: id,
    newValues: { amount: rest.amount, status: rest.status },
  });

  revalidatePath('/expenses');
  revalidatePath(`/expenses/${id}`);
  return { success: true };
}

export async function deleteExpense(
  expenseId: string
): Promise<ExpenseActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.delete')) {
    return {
      success: false,
      error: 'You do not have permission to delete expenses.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'delete', 'expense', {
    entityId: expenseId,
  });

  revalidatePath('/expenses');
  return { success: true };
}

export async function getExpenses(params?: {
  search?: string;
  status?: ExpenseStatus | 'all';
  method?: ExpensePaymentMethod | 'all';
  categoryId?: string;
  supplierId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<{ expenses: ExpenseWithRelations[]; total: number }> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    status = 'all',
    method = 'all',
    categoryId,
    supplierId,
    projectId,
    dateFrom,
    dateTo,
    sortBy = 'expense_date',
    sortDir = 'desc',
    page = 1,
    pageSize = 15,
  } = params || {};

  let query = supabase.from('expenses').select(
    `
      *,
      category:expense_categories(name),
      project:projects(id, name, project_code),
      supplier:suppliers(id, name),
      submitter:profiles!expenses_submitted_by_fkey(email),
      approver:profiles!expenses_approved_by_fkey(email),
      rejecter:profiles!expenses_rejected_by_fkey(email)
    `,
    { count: 'exact' }
  );

  if (search) {
    query = query.or(
      `expense_code.ilike.%${search}%,invoice_number.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (status !== 'all') query = query.eq('status', status);
  if (method !== 'all') query = query.eq('payment_method', method);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (supplierId) query = query.eq('supplier_id', supplierId);
  if (projectId) query = query.eq('project_id', projectId);
  if (dateFrom) query = query.gte('expense_date', dateFrom);
  if (dateTo) query = query.lte('expense_date', dateTo);

  query = query.order(sortBy, { ascending: sortDir === 'asc' });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) return { expenses: [], total: 0 };

  const expenses = (data || []).map((row) => {
    const category = row.category as unknown as { name: string } | null;
    const project = row.project as unknown as {
      id: string;
      name: string;
      project_code: string | null;
    } | null;
    const supplier = row.supplier as unknown as {
      id: string;
      name: string;
    } | null;
    const submitter = row.submitter as unknown as { email: string } | null;
    const approver = row.approver as unknown as { email: string } | null;
    const rejecter = row.rejecter as unknown as { email: string } | null;

    return {
      id: row.id,
      expense_code: row.expense_code,
      expense_date: row.expense_date,
      invoice_number: row.invoice_number,
      category_id: row.category_id,
      project_id: row.project_id,
      supplier_id: row.supplier_id,
      amount: row.amount,
      currency: row.currency,
      description: row.description,
      status: row.status as ExpenseStatus,
      payment_method: row.payment_method as ExpensePaymentMethod | null,
      notes: row.notes,
      submitted_by: row.submitted_by,
      submitted_at: row.submitted_at,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      approval_notes: row.approval_notes,
      rejected_by: row.rejected_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category_name: category?.name ?? 'Unknown',
      project_name: project?.name ?? null,
      project_code: project?.project_code ?? null,
      supplier_name: supplier?.name ?? null,
      submitted_by_email: submitter?.email ?? null,
      approved_by_email: approver?.email ?? null,
      rejected_by_email: rejecter?.email ?? null,
    } as ExpenseWithRelations;
  });

  return { expenses, total: count || 0 };
}

export async function getExpenseById(
  expenseId: string
): Promise<ExpenseWithRelations | null> {
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from('expenses')
    .select(
      `
      *,
      category:expense_categories(name),
      project:projects(id, name, project_code),
      supplier:suppliers(id, name),
      submitter:profiles!expenses_submitted_by_fkey(email),
      approver:profiles!expenses_approved_by_fkey(email),
      rejecter:profiles!expenses_rejected_by_fkey(email)
    `
    )
    .eq('id', expenseId)
    .maybeSingle();

  if (!data) return null;

  const category = data.category as unknown as { name: string } | null;
  const project = data.project as unknown as {
    id: string;
    name: string;
    project_code: string | null;
  } | null;
  const supplier = data.supplier as unknown as {
    id: string;
    name: string;
  } | null;
  const submitter = data.submitter as unknown as { email: string } | null;
  const approver = data.approver as unknown as { email: string } | null;
  const rejecter = data.rejecter as unknown as { email: string } | null;

  return {
    id: data.id,
    expense_code: data.expense_code,
    expense_date: data.expense_date,
    invoice_number: data.invoice_number,
    category_id: data.category_id,
    project_id: data.project_id,
    supplier_id: data.supplier_id,
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    status: data.status as ExpenseStatus,
    payment_method: data.payment_method as ExpensePaymentMethod | null,
    notes: data.notes,
    submitted_by: data.submitted_by,
    submitted_at: data.submitted_at,
    approved_by: data.approved_by,
    approved_at: data.approved_at,
    approval_notes: data.approval_notes,
    rejected_by: data.rejected_by,
    rejected_at: data.rejected_at,
    rejection_reason: data.rejection_reason,
    created_at: data.created_at,
    updated_at: data.updated_at,
    category_name: category?.name ?? 'Unknown',
    project_name: project?.name ?? null,
    project_code: project?.project_code ?? null,
    supplier_name: supplier?.name ?? null,
    submitted_by_email: submitter?.email ?? null,
    approved_by_email: approver?.email ?? null,
    rejected_by_email: rejecter?.email ?? null,
  };
}

export async function getExpenseFilterOptions(): Promise<{
  categories: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  projects: Array<{
    id: string;
    name: string;
    project_code: string | null;
  }>;
}> {
  const supabase = createSupabaseServerClient();

  const [{ data: categories }, { data: suppliers }, { data: projects }] =
    await Promise.all([
      supabase
        .from('expense_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('archived', false)
        .order('name'),
    ]);

  return {
    categories: categories || [],
    suppliers: suppliers || [],
    projects: (projects || []).map((p) => ({
      id: p.id,
      name: p.name,
      project_code: p.project_code,
    })),
  };
}
