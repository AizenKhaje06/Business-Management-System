'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';
import { createNotificationsForPermission, createNotificationsForAll } from '@/lib/notifications';
import type {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectMember,
  ProjectMemberRole,
  ProjectStatusHistoryEntry,
  ProjectPayment,
  ProjectExpense,
  ProjectMaterial,
  ProjectDocument,
  ProjectActivity,
  ProjectCosting,
  CostBreakdownEntry,
  CreateProjectInput,
  UpdateProjectInput,
  AssignMemberInput,
} from '@/types/project';

export type ProjectActionResult =
  { success: true; data?: unknown } | { success: false; error: string };

export async function createProject(
  input: CreateProjectInput
): Promise<ProjectActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.create')) {
    return {
      success: false,
      error: 'You do not have permission to create projects.',
    };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('projects')
    .insert({
      client_id: input.client_id,
      name: input.name,
      description: input.description || null,
      status: input.status || 'draft',
      priority: input.priority || 'medium',
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      budget: input.budget || null,
      hourly_rate: input.hourly_rate || null,
      progress: input.progress || 0,
      notes: input.notes || null,
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Record initial status history
  await supabase.from('project_status_history').insert({
    project_id: data.id,
    old_status: null,
    new_status: data.status,
    changed_by: ctx.id,
    notes: 'Project created',
  });

  await logAuditForCurrentUser(ctx.id, 'create', 'project', {
    entityId: data.id,
    entityName: input.name,
    newValues: { name: input.name, status: input.status, budget: input.budget },
  });

  revalidatePath('/projects');
  return { success: true, data };
}

export async function updateProject(
  input: UpdateProjectInput
): Promise<ProjectActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return {
      success: false,
      error: 'You do not have permission to edit projects.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { id, ...updateData } = input;

  let oldStatus: string | null = null;

  // Check if status is changing — if so, record in status history
  if (updateData.status) {
    const { data: current } = await supabase
      .from('projects')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (current) {
      oldStatus = current.status;
      if (current.status !== updateData.status) {
        await supabase.from('project_status_history').insert({
          project_id: id,
          old_status: current.status,
          new_status: updateData.status,
          changed_by: ctx.id,
          notes: 'Status updated via edit form',
        });
      }
    }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      client_id: updateData.client_id,
      name: updateData.name,
      description: updateData.description || null,
      status: updateData.status,
      priority: updateData.priority,
      start_date: updateData.start_date || null,
      end_date: updateData.end_date || null,
      actual_end_date: updateData.actual_end_date || null,
      budget: updateData.budget,
      hourly_rate: updateData.hourly_rate,
      progress: updateData.progress,
      notes: updateData.notes || null,
      archived: updateData.archived,
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditForCurrentUser(ctx.id, 'update', 'project', {
    entityId: id,
    entityName: input.name,
    newValues: { name: input.name, status: input.status, budget: input.budget },
  });

  if (oldStatus !== null && updateData.status && oldStatus !== updateData.status) {
    await createNotificationsForPermission(
      'invoices.view',
      'project_status_changed',
      'info',
      'Project Status Changed',
      `Project "${input.name}" status changed from ${oldStatus} to ${updateData.status}.`,
      { projectId: id, oldStatus, newStatus: updateData.status }
    );
  }

  revalidatePath('/projects');
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/edit`);
  return { success: true };
}

export async function archiveProject(
  projectId: string
): Promise<ProjectActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return {
      success: false,
      error: 'You do not have permission to archive projects.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('projects')
    .update({ archived: true })
    .eq('id', projectId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditForCurrentUser(ctx.id, 'archive', 'project', {
    entityId: projectId,
  });

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function deleteProject(
  projectId: string
): Promise<ProjectActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.delete')) {
    return {
      success: false,
      error: 'You do not have permission to delete projects.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditForCurrentUser(ctx.id, 'delete', 'project', {
    entityId: projectId,
  });

  revalidatePath('/projects');
  return { success: true };
}

export async function getProjects(params?: {
  search?: string;
  status?: ProjectStatus | 'all';
  clientId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<{
  projects: (Project & {
    client_name: string;
    client_code: string | null;
  })[];
  total: number;
}> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    status = 'all',
    clientId,
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 10,
  } = params || {};

  let query = supabase
    .from('projects')
    .select('*, client:clients(name, client_code)', { count: 'exact' });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,project_code.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  query = query.eq('archived', false);

  const ascending = sortDir === 'asc';
  query = query.order(sortBy, { ascending });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { projects: [], total: 0 };
  }

  const projects = (data || []).map((p) => {
    const client = p.client as unknown as {
      name: string;
      client_code: string | null;
    } | null;
    return {
      ...p,
      client_name: client?.name ?? 'Unknown',
      client_code: client?.client_code ?? null,
    };
  });

  return { projects, total: count || 0 };
}

export async function getProjectById(
  projectId: string
): Promise<Project | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  return data as Project | null;
}

export async function getProjectWithClient(
  projectId: string
): Promise<
  (Project & { client_name: string; client_code: string | null }) | null
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('projects')
    .select('*, client:clients(name, client_code)')
    .eq('id', projectId)
    .maybeSingle();

  if (!data) return null;
  const client = data.client as unknown as {
    name: string;
    client_code: string | null;
  } | null;
  return {
    ...data,
    client_name: client?.name ?? 'Unknown',
    client_code: client?.client_code ?? null,
  };
}

export async function getProjectStats(projectId: string): Promise<{
  totalPayments: number;
  totalExpenses: number;
  totalMaterials: number;
  outstandingBalance: number;
}> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .rpc('get_project_costing', { p_project_id: projectId })
    .maybeSingle();

  if (error || !data) {
    return {
      totalPayments: 0,
      totalExpenses: 0,
      totalMaterials: 0,
      outstandingBalance: 0,
    };
  }

  const costing = data as {
    contract_amount: number;
    total_payments: number;
    outstanding_balance: number;
    total_expenses: number;
    material_cost: number;
    labor_cost: number;
    other_cost: number;
    total_project_cost: number;
    project_difference: number;
  };

  return {
    totalPayments: Number(costing.total_payments),
    totalExpenses: Number(costing.total_expenses),
    totalMaterials: Number(costing.material_cost),
    outstandingBalance: Number(costing.outstanding_balance),
  };
}

export async function getProjectCosting(
  projectId: string
): Promise<ProjectCosting | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .rpc('get_project_costing', { p_project_id: projectId })
    .maybeSingle();

  if (error || !data) return null;

  const d = data as {
    contract_amount: number;
    total_payments: number;
    outstanding_balance: number;
    total_expenses: number;
    material_cost: number;
    labor_cost: number;
    other_cost: number;
    total_project_cost: number;
    project_difference: number;
  };

  return {
    contract_amount: Number(d.contract_amount),
    total_payments: Number(d.total_payments),
    outstanding_balance: Number(d.outstanding_balance),
    total_expenses: Number(d.total_expenses),
    material_cost: Number(d.material_cost),
    labor_cost: Number(d.labor_cost),
    other_cost: Number(d.other_cost),
    total_project_cost: Number(d.total_project_cost),
    project_difference: Number(d.project_difference),
  };
}

export async function getProjectCostBreakdown(
  projectId: string
): Promise<CostBreakdownEntry[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc('get_project_cost_breakdown', {
    p_project_id: projectId,
  });

  if (error || !data) return [];

  return (
    data as Array<{
      category_name: string;
      cost_group: 'material' | 'labor' | 'other';
      total_amount: number;
      expense_count: number;
    }>
  ).map((row) => ({
    category_name: row.category_name,
    cost_group: row.cost_group,
    total_amount: Number(row.total_amount),
    expense_count: Number(row.expense_count),
  }));
}

export async function getProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('project_members')
    .select('*, user:profiles(email, first_name, last_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  return (data || []).map((m) => {
    const user = m.user as unknown as {
      email: string;
      first_name: string | null;
      last_name: string | null;
    } | null;
    return {
      id: m.id,
      project_id: m.project_id,
      user_id: m.user_id,
      role: m.role as ProjectMemberRole,
      allocated_hours: m.allocated_hours,
      email: user?.email ?? '',
      first_name: user?.first_name ?? null,
      last_name: user?.last_name ?? null,
      created_at: m.created_at,
    };
  });
}

export async function assignProjectMember(
  input: AssignMemberInput
): Promise<ProjectActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return {
      success: false,
      error: 'You do not have permission to assign project members.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('project_members').upsert(
    {
      project_id: input.project_id,
      user_id: input.user_id,
      role: input.role,
      allocated_hours: input.allocated_hours || null,
    },
    { onConflict: 'project_id,user_id' }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${input.project_id}`);
  return { success: true };
}

export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<ProjectActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return {
      success: false,
      error: 'You do not have permission to remove project members.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function getProjectStatusHistory(
  projectId: string
): Promise<ProjectStatusHistoryEntry[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('project_status_history')
    .select('*, changer:profiles(email)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return (data || []).map((h) => {
    const changer = h.changer as unknown as { email: string } | null;
    return {
      id: h.id,
      project_id: h.project_id,
      old_status: h.old_status as ProjectStatus | null,
      new_status: h.new_status as ProjectStatus,
      changed_by: h.changed_by,
      changed_by_email: changer?.email ?? null,
      notes: h.notes,
      created_at: h.created_at,
    };
  });
}

export async function getProjectPayments(
  projectId: string
): Promise<ProjectPayment[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('project_payments')
    .select(
      'id, project_id, amount, payment_date, payment_method, reference_number, created_at'
    )
    .eq('project_id', projectId)
    .order('payment_date', { ascending: false });
  return (data || []) as ProjectPayment[];
}

export async function getProjectExpenses(
  projectId: string
): Promise<ProjectExpense[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('expenses')
    .select(
      'id, project_id, amount, expense_date, description, category, status, created_at'
    )
    .eq('project_id', projectId)
    .order('expense_date', { ascending: false });
  return (data || []) as ProjectExpense[];
}

export async function getProjectMaterials(
  projectId: string
): Promise<ProjectMaterial[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('materials')
    .select(
      'id, project_id, name, quantity, unit, unit_cost, total_cost, created_at'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  return (data || []) as ProjectMaterial[];
}

export async function getProjectDocuments(
  projectId: string
): Promise<ProjectDocument[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('documents')
    .select('id, name, file_url, file_type, entity_type, created_at')
    .eq('entity_type', 'project')
    .eq('entity_id', projectId)
    .order('created_at', { ascending: false });
  return (data || []) as ProjectDocument[];
}

export async function getProjectActivity(
  projectId: string
): Promise<ProjectActivity[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, created_at, user:profiles(email)')
    .eq('entity_type', 'project')
    .eq('entity_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data || []).map((row) => {
    const user = row.user as unknown as { email: string } | null;
    return {
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      created_at: row.created_at,
      user_email: user?.email ?? null,
    };
  });
}

export async function getActiveClients(): Promise<
  Array<{ id: string; name: string; client_code: string | null }>
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('clients')
    .select('id, name, client_code')
    .eq('status', 'active')
    .order('name', { ascending: true });
  return data || [];
}

export async function getActiveStaff(): Promise<
  Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  }>
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('is_active', true)
    .order('first_name', { ascending: true });
  return data || [];
}
