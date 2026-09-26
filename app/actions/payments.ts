'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';
import { createNotificationsForPermission, createNotification } from '@/lib/notifications';
import type {
  Payment,
  PaymentWithRelations,
  PaymentStatus,
  PaymentMethod,
  CreatePaymentInput,
  UpdatePaymentInput,
} from '@/types/payment';

export type PaymentActionResult =
  { success: true; data?: unknown } | { success: false; error: string };

export async function createPayment(
  input: CreatePaymentInput
): Promise<PaymentActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.create')) {
    return {
      success: false,
      error: 'You do not have permission to create payments.',
    };
  }

  // Creating a payment already in approved/posted status requires approve permission
  const initialStatus = input.status || 'pending';
  if ((initialStatus === 'approved' || initialStatus === 'posted') && !ctx.permissions.includes('invoices.approve')) {
    return {
      success: false,
      error: 'You do not have permission to create approved payments.',
    };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('project_payments')
    .insert({
      project_id: input.project_id,
      amount: input.amount,
      payment_date: input.payment_date,
      payment_method: input.payment_method || null,
      status: initialStatus,
      reference_number: input.reference_number || null,
      notes: input.notes || null,
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'create', 'payment', {
    entityId: data.id,
    entityName: data.payment_code,
    newValues: { amount: input.amount, project_id: input.project_id, status: initialStatus },
  });

  if (data.status === 'approved' || data.status === 'posted') {
    await createNotificationsForPermission(
      'invoices.view',
      'payment_received',
      'success',
      'Payment Received',
      `Payment ${data.payment_code || ''} of ${input.amount.toLocaleString()} has been recorded.`,
      { paymentId: data.id, projectId: input.project_id, amount: input.amount }
    );
  }

  revalidatePath('/payments');
  revalidatePath(`/projects/${input.project_id}`);
  return { success: true, data };
}

export async function updatePayment(
  input: UpdatePaymentInput
): Promise<PaymentActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return {
      success: false,
      error: 'You do not have permission to edit payments.',
    };
  }

  // Changing status to approved/posted requires invoices.approve permission
  if ((input.status === 'approved' || input.status === 'posted') && !ctx.permissions.includes('invoices.approve')) {
    return {
      success: false,
      error: 'You do not have permission to approve payments.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { id, ...rest } = input;

  const { error } = await supabase
    .from('project_payments')
    .update({
      project_id: rest.project_id,
      amount: rest.amount,
      payment_date: rest.payment_date,
      payment_method: rest.payment_method || null,
      status: rest.status,
      reference_number: rest.reference_number || null,
      notes: rest.notes || null,
    })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'update', 'payment', {
    entityId: id,
    newValues: { amount: rest.amount, status: rest.status },
  });

  if (rest.status === 'approved' || rest.status === 'posted') {
    await createNotificationsForPermission(
      'invoices.view',
      'payment_received',
      'success',
      'Payment Received',
      `Payment has been updated to ${rest.status} — ${(rest.amount ?? 0).toLocaleString()}.`,
      { paymentId: id, amount: rest.amount }
    );
  }

  revalidatePath('/payments');
  revalidatePath(`/payments/${id}`);
  return { success: true };
}

export async function deletePayment(
  paymentId: string
): Promise<PaymentActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.delete')) {
    return {
      success: false,
      error: 'You do not have permission to delete payments.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('project_payments')
    .delete()
    .eq('id', paymentId);

  if (error) return { success: false, error: error.message };

  await logAuditForCurrentUser(ctx.id, 'delete', 'payment', {
    entityId: paymentId,
  });

  revalidatePath('/payments');
  return { success: true };
}

export async function getPayments(params?: {
  search?: string;
  status?: PaymentStatus | 'all';
  method?: PaymentMethod | 'all';
  clientId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<{ payments: PaymentWithRelations[]; total: number }> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    status = 'all',
    method = 'all',
    clientId,
    projectId,
    dateFrom,
    dateTo,
    sortBy = 'payment_date',
    sortDir = 'desc',
    page = 1,
    pageSize = 15,
  } = params || {};

  let query = supabase.from('project_payments').select(
    `
      *,
      project:projects(
        id,
        name,
        project_code,
        budget,
        client_id,
        client:clients(id, name, client_code)
      ),
      submitter:profiles!project_payments_submitted_by_fkey(email),
      approver:profiles!project_payments_approved_by_fkey(email),
      rejecter:profiles!project_payments_rejected_by_fkey(email)
    `,
    { count: 'exact' }
  );

  if (search) {
    query = query.or(
      `payment_code.ilike.%${search}%,reference_number.ilike.%${search}%,notes.ilike.%${search}%`
    );
  }

  if (status !== 'all') query = query.eq('status', status);
  if (method !== 'all') query = query.eq('payment_method', method);
  if (projectId) query = query.eq('project_id', projectId);
  if (dateFrom) query = query.gte('payment_date', dateFrom);
  if (dateTo) query = query.lte('payment_date', dateTo);

  // Filter by client requires a subquery approach via project's client_id
  if (clientId) {
    // Fetch project IDs for the client first
    const { data: clientProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', clientId);
    const ids = (clientProjects || []).map((p) => p.id);
    if (ids.length === 0) return { payments: [], total: 0 };
    query = query.in('project_id', ids);
  }

  query = query.order(sortBy, { ascending: sortDir === 'asc' });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) return { payments: [], total: 0 };

  const payments = (data || []).map((row) => {
    const project = row.project as unknown as {
      id: string;
      name: string;
      project_code: string | null;
      budget: number | null;
      client_id: string;
      client: { id: string; name: string; client_code: string | null } | null;
    } | null;
    const submitter = row.submitter as unknown as { email: string } | null;
    const approver = row.approver as unknown as { email: string } | null;
    const rejecter = row.rejecter as unknown as { email: string } | null;

    return {
      id: row.id,
      payment_code: row.payment_code,
      project_id: row.project_id,
      amount: row.amount,
      payment_date: row.payment_date,
      payment_method: row.payment_method as PaymentMethod | null,
      status: row.status as PaymentStatus,
      reference_number: row.reference_number,
      notes: row.notes,
      created_by: row.created_by,
      submitted_by: row.submitted_by,
      submitted_at: row.submitted_at,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      rejected_by: row.rejected_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
      posted_at: row.posted_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      project_name: project?.name ?? 'Unknown',
      project_code: project?.project_code ?? null,
      project_budget: project?.budget ?? null,
      client_id: project?.client?.id ?? project?.client_id ?? '',
      client_name: project?.client?.name ?? 'Unknown',
      client_code: project?.client?.client_code ?? null,
      submitted_by_email: submitter?.email ?? null,
      approved_by_email: approver?.email ?? null,
      rejected_by_email: rejecter?.email ?? null,
    } as PaymentWithRelations;
  });

  return { payments, total: count || 0 };
}

export async function getPaymentById(
  paymentId: string
): Promise<PaymentWithRelations | null> {
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from('project_payments')
    .select(
      `
      *,
      project:projects(
        id,
        name,
        project_code,
        budget,
        client_id,
        client:clients(id, name, client_code)
      ),
      submitter:profiles!project_payments_submitted_by_fkey(email),
      approver:profiles!project_payments_approved_by_fkey(email),
      rejecter:profiles!project_payments_rejected_by_fkey(email)
    `
    )
    .eq('id', paymentId)
    .maybeSingle();

  if (!data) return null;

  const project = data.project as unknown as {
    id: string;
    name: string;
    project_code: string | null;
    budget: number | null;
    client_id: string;
    client: { id: string; name: string; client_code: string | null } | null;
  } | null;

  const submitter = data.submitter as unknown as { email: string } | null;
  const approver = data.approver as unknown as { email: string } | null;
  const rejecter = data.rejecter as unknown as { email: string } | null;

  return {
    id: data.id,
    payment_code: data.payment_code,
    project_id: data.project_id,
    amount: data.amount,
    payment_date: data.payment_date,
    payment_method: data.payment_method as PaymentMethod | null,
    status: data.status as PaymentStatus,
    reference_number: data.reference_number,
    notes: data.notes,
    created_by: data.created_by,
    submitted_by: data.submitted_by,
    submitted_at: data.submitted_at,
    approved_by: data.approved_by,
    approved_at: data.approved_at,
    rejected_by: data.rejected_by,
    rejected_at: data.rejected_at,
    rejection_reason: data.rejection_reason,
    posted_at: data.posted_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    project_name: project?.name ?? 'Unknown',
    project_code: project?.project_code ?? null,
    project_budget: project?.budget ?? null,
    client_id: project?.client?.id ?? project?.client_id ?? '',
    client_name: project?.client?.name ?? 'Unknown',
    client_code: project?.client?.client_code ?? null,
    submitted_by_email: submitter?.email ?? null,
    approved_by_email: approver?.email ?? null,
    rejected_by_email: rejecter?.email ?? null,
  };
}

export async function getProjectPaymentSummary(projectId: string): Promise<{
  contract_amount: number | null;
  total_payments: number;
  outstanding_balance: number;
}> {
  const supabase = createSupabaseServerClient();

  const { data: project } = await supabase
    .from('projects')
    .select('budget')
    .eq('id', projectId)
    .maybeSingle();

  const budget = project?.budget ?? null;

  const { data: payments } = await supabase
    .from('project_payments')
    .select('amount')
    .eq('project_id', projectId)
    .in('status', ['posted', 'partial']);

  const total = (payments || []).reduce((s, p) => s + Number(p.amount), 0);

  return {
    contract_amount: budget,
    total_payments: total,
    outstanding_balance: (budget ?? 0) - total,
  };
}

export async function getPaymentFilterOptions(): Promise<{
  clients: Array<{ id: string; name: string; client_code: string | null }>;
  projects: Array<{
    id: string;
    name: string;
    project_code: string | null;
    client_id: string;
  }>;
}> {
  const supabase = createSupabaseServerClient();

  const [{ data: clients }, { data: projects }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, client_code')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('projects')
      .select('id, name, project_code, client_id')
      .eq('archived', false)
      .order('name'),
  ]);

  return {
    clients: clients || [],
    projects: (projects || []).map((p) => ({
      id: p.id,
      name: p.name,
      project_code: p.project_code,
      client_id: p.client_id,
    })),
  };
}
