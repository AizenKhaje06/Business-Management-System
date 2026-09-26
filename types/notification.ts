export type NotificationCategory =
  | 'payment_received'
  | 'payment_overdue'
  | 'expense_submitted'
  | 'expense_approved'
  | 'expense_rejected'
  | 'project_status_changed'
  | 'project_deadline_approaching'
  | 'document_uploaded'
  | 'photo_uploaded'
  | 'system';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface UnreadCount {
  count: number;
}
