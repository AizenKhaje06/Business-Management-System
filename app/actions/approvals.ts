'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { createNotificationsForPermission, createNotification } from '@/lib/notifications';

export type ApprovalActionResult =
  { success: true } | { success: false; error: string };

async function insertAuditLog(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  newValues: Record<string, unknown>
): Promise<void> {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    new_values: newValues,
  });
}

async function canApproveFinancial(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  submittedBy: string | null,
  approverId: string
): Promise<boolean> {
  if (!submittedBy) return false;
  if (submittedBy === approverId) return false;
  const { data } = await supabase
    .rpc('can_approve_financial', { target_submitter: submittedBy })
    .maybeSingle();
  return Boolean(data);
}

// ===== Expense Approval Workflow =====

export async function submitExpense(expenseId: string): Promise<ApprovalActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return { success: false, error: 'You do not have permission to submit expenses.' };
  }

  const supabase = createSupabaseServerClient();
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, status, submitted_by')
    .eq('id', expenseId)
    .maybeSingle();

  if (!expense) return { success: false, error: 'Expense not found.' };
  if (expense.status !== 'draft') {
    return { success: false, error: 'Only draft expenses can be submitted.' };
  }

  // Only the creator or a user with approve permission can submit
  if (expense.submitted_by !== ctx.id && !ctx.permissions.includes('invoices.approve')) {
    return { success: false, error: 'You can only submit your own expenses.' };
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: ctx.id,
    })
    .eq('id', expenseId);

  if (error) return { success: false, error: error.message };

  await insertAuditLog(supabase, ctx.id, 'update', 'expense', expenseId, {
    action: 'submitted',
    from: 'draft',
    to: 'submitted',
  });

  await createNotificationsForPermission(
    'invoices.approve',
    'expense_submitted',
    'info',
    'Expense Submitted for Approval',
    'A new expense has been submitted and is awaiting your approval.',
    { expenseId }
  );

  revalidatePath('/expenses');
  revalidatePath(`/expenses/${expenseId}`);
  return { success: true };
}

export async function approveExpense(
  expenseId: string,
  notes?: string
): Promise<ApprovalActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.approve')) {
    return { success: false, error: 'You do not have permission to approve expenses.' };
  }

  const supabase = createSupabaseServerClient();
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, status, submitted_by')
    .eq('id', expenseId)
    .maybeSingle();

  if (!expense) return { success: false, error: 'Expense not found.' };
  if (!['submitted', 'pending'].includes(expense.status)) {
    return { success: false, error: 'Only submitted or pending expenses can be approved.' };
  }

  const canApprove = await canApproveFinancial(supabase, expense.submitted_by, ctx.id);
  if (!canApprove) {
    return { success: false, error: 'You cannot approve your own submission.' };
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'approved',
      approved_by: ctx.id,
      approved_at: new Date().toISOString(),
      approval_notes: notes || null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
    })
    .eq('id', expenseId);

  if (error) return { success: false, error: error.message };

  await insertAuditLog(supabase, ctx.id, 'approve', 'expense', expenseId, {
    from: expense.status,
    to: 'approved',
    notes: notes || null,
  });

  if (expense.submitted_by) {
    await createNotification(
      expense.submitted_by,
      'expense_approved',
      'success',
      'Expense Approved',
      'Your submitted expense has been approved.',
      { expenseId }
    );
  }

  revalidatePath('/expenses');
  revalidatePath(`/expenses/${expenseId}`);
  return { success: true };
}

export async function rejectExpense(
  expenseId: string,
  reason: string
): Promise<ApprovalActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.approve')) {
    return { success: false, error: 'You do not have permission to reject expenses.' };
  }

  const supabase = createSupabaseServerClient();
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, status, submitted_by')
    .eq('id', expenseId)
    .maybeSingle();

  if (!expense) return { success: false, error: 'Expense not found.' };
  if (!['submitted', 'pending'].includes(expense.status)) {
    return { success: false, error: 'Only submitted or pending expenses can be rejected.' };
  }

  const canApprove = await canApproveFinancial(supabase, expense.submitted_by, ctx.id);
  if (!canApprove) {
    return { success: false, error: 'You cannot reject your own submission.' };
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'rejected',
      rejected_by: ctx.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', expenseId);

  if (error) return { success: false, error: error.message };

  await insertAuditLog(supabase, ctx.id, 'reject', 'expense', expenseId, {
    from: expense.status,
    to: 'rejected',
    reason,
  });

  if (expense.submitted_by) {
    await createNotification(
      expense.submitted_by,
      'expense_rejected',
      'error',
      'Expense Rejected',
      `Your submitted expense has been rejected. Reason: ${reason}`,
      { expenseId, reason }
    );
  }

  revalidatePath('/expenses');
  revalidatePath(`/expenses/${expenseId}`);
  return { success: true };
}

// ===== Payment Approval Workflow =====

export async function submitPayment(paymentId: string): Promise<ApprovalActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return { success: false, error: 'You do not have permission to submit payments.' };
  }

  const supabase = createSupabaseServerClient();
  const { data: payment } = await supabase
    .from('project_payments')
    .select('id, status, created_by')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) return { success: false, error: 'Payment not found.' };
  if (payment.status !== 'pending') {
    return { success: false, error: 'Only pending payments can be submitted.' };
  }

  // Only the creator or a user with approve permission can submit
  if (payment.created_by !== ctx.id && !ctx.permissions.includes('invoices.approve')) {
    return { success: false, error: 'You can only submit your own payments.' };
  }

  const { error } = await supabase
    .from('project_payments')
    .update({
      status: 'submitted',
      submitted_by: ctx.id,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) return { success: false, error: error.message };

  await insertAuditLog(supabase, ctx.id, 'update', 'payment', paymentId, {
    from: 'pending',
    to: 'submitted',
  });

  await createNotificationsForPermission(
    'invoices.approve',
    'payment_received',
    'info',
    'Payment Submitted for Approval',
    'A payment has been submitted and is awaiting approval.',
    { paymentId }
  );

  revalidatePath('/payments');
  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

export async function approvePayment(
  paymentId: string,
  notes?: string
): Promise<ApprovalActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.approve')) {
    return { success: false, error: 'You do not have permission to approve payments.' };
  }

  const supabase = createSupabaseServerClient();
  const { data: payment } = await supabase
    .from('project_payments')
    .select('id, status, submitted_by')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) return { success: false, error: 'Payment not found.' };
  if (!['pending', 'submitted'].includes(payment.status)) {
    return { success: false, error: 'Only pending or submitted payments can be approved.' };
  }

  const canApprove = await canApproveFinancial(supabase, payment.submitted_by, ctx.id);
  if (!canApprove) {
    return { success: false, error: 'You cannot approve your own submission.' };
  }

  const { error } = await supabase
    .from('project_payments')
    .update({
      status: 'approved',
      approved_by: ctx.id,
      approved_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
    })
    .eq('id', paymentId);

  if (error) return { success: false, error: error.message };

  await insertAuditLog(supabase, ctx.id, 'approve', 'payment', paymentId, {
    from: 'pending',
    to: 'approved',
    notes: notes || null,
  });

  await createNotificationsForPermission(
    'invoices.view',
    'payment_received',
    'success',
    'Payment Approved',
    'A payment has been approved.',
    { paymentId }
  );

  revalidatePath('/payments');
  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

export async function rejectPayment(
  paymentId: string,
  reason: string
): Promise<ApprovalActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.approve')) {
    return { success: false, error: 'You do not have permission to reject payments.' };
  }

  const supabase = createSupabaseServerClient();
  const { data: payment } = await supabase
    .from('project_payments')
    .select('id, status, submitted_by')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) return { success: false, error: 'Payment not found.' };
  if (!['pending', 'submitted', 'approved'].includes(payment.status)) {
    return { success: false, error: 'Only pending, submitted, or approved payments can be rejected.' };
  }

  const canApprove = await canApproveFinancial(supabase, payment.submitted_by, ctx.id);
  if (!canApprove) {
    return { success: false, error: 'You cannot reject your own submission.' };
  }

  const { error } = await supabase
    .from('project_payments')
    .update({
      status: 'cancelled',
      rejected_by: ctx.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', paymentId);

  if (error) return { success: false, error: error.message };

  await insertAuditLog(supabase, ctx.id, 'reject', 'payment', paymentId, {
    from: payment.status,
    to: 'cancelled',
    reason,
  });

  revalidatePath('/payments');
  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

export async function postPayment(paymentId: string): Promise<ApprovalActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.approve')) {
    return { success: false, error: 'You do not have permission to post payments.' };
  }

  const supabase = createSupabaseServerClient();
  const { data: payment } = await supabase
    .from('project_payments')
    .select('id, status')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) return { success: false, error: 'Payment not found.' };
  if (payment.status !== 'approved') {
    return { success: false, error: 'Only approved payments can be posted.' };
  }

  const { error } = await supabase
    .from('project_payments')
    .update({
      status: 'posted',
      posted_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) return { success: false, error: error.message };

  await insertAuditLog(supabase, ctx.id, 'update', 'payment', paymentId, {
    from: 'approved',
    to: 'posted',
  });

  revalidatePath('/payments');
  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}
