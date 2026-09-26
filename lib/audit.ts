import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'archive'
  | 'login'
  | 'logout'
  | 'password_reset'
  | 'approve'
  | 'reject'
  | 'upload'
  | 'download'
  | 'export'
  | 'import'
  | 'role_change'
  | 'activate'
  | 'deactivate';

export interface AuditLogEntry {
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string | null;
  entity_name?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
}

/**
 * Insert an audit log entry. Non-blocking — errors are swallowed so
 * the calling operation is never affected by audit failures.
 */
export async function logAudit(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  entry: AuditLogEntry
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: entry.user_id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      entity_name: entry.entity_name ?? null,
      old_values: entry.old_values ?? null,
      new_values: entry.new_values ?? null,
    });
  } catch {
    // Audit logging must never break the primary operation
  }
}

/**
 * Convenience wrapper that resolves the current user and logs the action.
 */
export async function logAuditForCurrentUser(
  userId: string,
  action: AuditAction,
  entityType: string,
  options?: {
    entityId?: string | null;
    entityName?: string | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  }
): Promise<void> {
  const supabase = createSupabaseServerClient();
  await logAudit(supabase, {
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: options?.entityId ?? null,
    entity_name: options?.entityName ?? null,
    old_values: options?.oldValues ?? null,
    new_values: options?.newValues ?? null,
  });
}
