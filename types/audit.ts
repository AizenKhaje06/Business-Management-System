export interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogFilters {
  search?: string;
  userId?: string;
  action?: string | 'all';
  entityType?: string | 'all';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface AuditLogResult {
  rows: AuditLogRow[];
  total: number;
}

export interface AuditUserOption {
  id: string;
  email: string;
  name: string;
}
