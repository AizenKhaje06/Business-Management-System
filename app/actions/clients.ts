'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';
import type {
  Client,
  ClientStatus,
  CreateClientInput,
  UpdateClientInput,
} from '@/types/client';

export type ClientActionResult =
  { success: true; data?: unknown } | { success: false; error: string };

export async function createClient(
  input: CreateClientInput
): Promise<ClientActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('contacts.create')) {
    return {
      success: false,
      error: 'You do not have permission to create clients.',
    };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: input.name,
      company_name: input.company_name || null,
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
      notes: input.notes || null,
      status: input.status || 'active',
      created_by: ctx.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditForCurrentUser(ctx.id, 'create', 'client', {
    entityId: data.id,
    entityName: input.name,
    newValues: { name: input.name, email: input.email, status: input.status || 'active' },
  });

  revalidatePath('/clients');
  return { success: true, data };
}

export async function updateClient(
  input: UpdateClientInput
): Promise<ClientActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('contacts.edit')) {
    return {
      success: false,
      error: 'You do not have permission to edit clients.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { id, ...updateData } = input;

  const { error } = await supabase
    .from('clients')
    .update({
      name: updateData.name,
      company_name: updateData.company_name || null,
      contact_person: updateData.contact_person || null,
      email: updateData.email || null,
      phone: updateData.phone || null,
      address: updateData.address || null,
      city: updateData.city || null,
      state: updateData.state || null,
      postal_code: updateData.postal_code || null,
      country: updateData.country || 'US',
      website: updateData.website || null,
      tax_id: updateData.tax_id || null,
      notes: updateData.notes || null,
      status: updateData.status || 'active',
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditForCurrentUser(ctx.id, 'update', 'client', {
    entityId: id,
    entityName: input.name,
    newValues: { name: input.name, email: input.email, status: input.status },
  });

  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  revalidatePath(`/clients/${id}/edit`);
  return { success: true };
}

export async function archiveClient(
  clientId: string
): Promise<ClientActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('contacts.edit')) {
    return {
      success: false,
      error: 'You do not have permission to archive clients.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('clients')
    .update({ status: 'archived' })
    .eq('id', clientId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditForCurrentUser(ctx.id, 'archive', 'client', {
    entityId: clientId,
  });

  revalidatePath('/clients');
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function deleteClient(
  clientId: string
): Promise<ClientActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('contacts.delete')) {
    return {
      success: false,
      error: 'You do not have permission to delete clients.',
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('clients').delete().eq('id', clientId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditForCurrentUser(ctx.id, 'delete', 'client', {
    entityId: clientId,
  });

  revalidatePath('/clients');
  return { success: true };
}

export async function getClients(params?: {
  search?: string;
  status?: ClientStatus | 'all';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<{
  clients: Client[];
  total: number;
}> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    status = 'all',
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 10,
  } = params || {};

  let query = supabase.from('clients').select('*', { count: 'exact' });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company_name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%,client_code.ilike.%${search}%`
    );
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const ascending = sortDir === 'asc';
  query = query.order(sortBy, { ascending });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { clients: [], total: 0 };
  }

  return {
    clients: (data || []) as Client[],
    total: count || 0,
  };
}

export async function getClientById(clientId: string): Promise<Client | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();

  return data as Client | null;
}

export async function getClientStats(clientId: string): Promise<{
  projectCount: number;
  totalContractValue: number;
  totalPayments: number;
  outstandingBalance: number;
}> {
  const supabase = createSupabaseServerClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, budget')
    .eq('client_id', clientId);

  const projectIds = (projects || []).map((p) => p.id);
  const totalContractValue = (projects || []).reduce(
    (sum, p) => sum + (p.budget || 0),
    0
  );

  let totalPayments = 0;
  if (projectIds.length > 0) {
    const { data: payments } = await supabase
      .from('project_payments')
      .select('amount')
      .in('project_id', projectIds);
    totalPayments = (payments || []).reduce((sum, p) => sum + p.amount, 0);
  }

  return {
    projectCount: projects?.length || 0,
    totalContractValue,
    totalPayments,
    outstandingBalance: totalContractValue - totalPayments,
  };
}

export async function getClientProjects(clientId: string): Promise<
  Array<{
    id: string;
    name: string;
    status: string;
    budget: number | null;
    progress: number;
    start_date: string | null;
    end_date: string | null;
  }>
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('projects')
    .select('id, name, status, budget, progress, start_date, end_date')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function getClientPayments(clientId: string): Promise<
  Array<{
    id: string;
    project_id: string;
    project_name: string;
    amount: number;
    payment_date: string;
    payment_method: string | null;
    reference_number: string | null;
  }>
> {
  const supabase = createSupabaseServerClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('client_id', clientId);

  const projectIds = (projects || []).map((p) => p.id);
  if (projectIds.length === 0) return [];

  const { data: payments } = await supabase
    .from('project_payments')
    .select(
      'id, project_id, amount, payment_date, payment_method, reference_number'
    )
    .in('project_id', projectIds)
    .order('payment_date', { ascending: false });

  const projectMap = new Map((projects || []).map((p) => [p.id, p.name]));

  return (payments || []).map((p) => ({
    ...p,
    project_name: projectMap.get(p.project_id) || 'Unknown',
  }));
}

export async function getClientDocuments(clientId: string): Promise<
  Array<{
    id: string;
    name: string;
    file_url: string;
    file_type: string | null;
    created_at: string;
  }>
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('documents')
    .select('id, name, file_url, file_type, created_at')
    .eq('entity_type', 'client')
    .eq('entity_id', clientId)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function getClientActivity(clientId: string): Promise<
  Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
    user_email: string | null;
  }>
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, created_at, user:profiles(email)')
    .eq('entity_type', 'client')
    .eq('entity_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data || []).map((row) => ({
    id: row.id,
    action: row.action,
    entity_type: row.entity_type,
    created_at: row.created_at,
    user_email:
      (row.user as unknown as { email: string } | null)?.email ?? null,
  }));
}
