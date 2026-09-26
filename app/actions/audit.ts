'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';
import type {
  AuditLogRow,
  AuditLogFilters,
  AuditLogResult,
  AuditUserOption,
} from '@/types/audit';

export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { rows: [], total: 0 };
  if (!ctx.permissions.includes('audit.view')) {
    return { rows: [], total: 0 };
  }

  const supabase = createSupabaseServerClient();
  const {
    search = '',
    userId,
    action = 'all',
    entityType = 'all',
    dateFrom,
    dateTo,
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 25,
  } = filters;

  let query = supabase.from('audit_logs').select(
    `
      *,
      user:profiles!audit_logs_user_id_fkey(email, first_name, last_name)
    `,
    { count: 'exact' }
  );

  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (action !== 'all') {
    query = query.eq('action', action);
  }
  if (entityType !== 'all') {
    query = query.eq('entity_type', entityType);
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo + 'T23:59:59.999Z');
  }
  if (search) {
    query = query.or(
      `entity_type.ilike.%${search}%,entity_name.ilike.%${search}%`
    );
  }

  const validSortColumns = [
    'created_at',
    'action',
    'entity_type',
    'user_id',
  ];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  query = query.order(sortColumn, { ascending: sortDir === 'asc' });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error || !data) return { rows: [], total: 0 };

  const rows: AuditLogRow[] = data.map((row) => {
    const user = row.user as unknown as {
      email: string;
      first_name: string | null;
      last_name: string | null;
    } | null;

    const userName = user
      ? [user.first_name, user.last_name].filter(Boolean).join(' ') || null
      : null;

    return {
      id: row.id,
      user_id: row.user_id,
      user_email: user?.email ?? null,
      user_name: userName,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id ?? null,
      entity_name: row.entity_name ?? null,
      old_values: row.old_values as Record<string, unknown> | null,
      new_values: row.new_values as Record<string, unknown> | null,
      created_at: row.created_at,
    };
  });

  return { rows, total: count || 0 };
}

export async function getAuditUsers(): Promise<AuditUserOption[]> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return [];
  if (!ctx.permissions.includes('audit.view')) return [];

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .order('email', { ascending: true });

  return (data || []).map((p) => ({
    id: p.id,
    email: p.email,
    name:
      [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
  }));
}

export async function logExport(
  entityType: string,
  format: string,
  fileName: string
): Promise<void> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return;
  if (!ctx.permissions.includes('reports.view')) return;
  await logAuditForCurrentUser(ctx.id, 'export', entityType, {
    entityName: fileName,
    newValues: { format, fileName },
  });
}
