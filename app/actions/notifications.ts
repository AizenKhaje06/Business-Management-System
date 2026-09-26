'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import type { Notification } from '@/types/notification';

export async function getNotifications(
  filter: 'all' | 'unread' = 'all',
  page: number = 1,
  pageSize: number = 20
): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { notifications: [], total: 0, unreadCount: 0 };

  const supabase = createSupabaseServerClient();

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.id)
    .eq('is_read', false);

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.id);

  if (filter === 'unread') {
    query = query.eq('is_read', false);
  }

  query = query.order('created_at', { ascending: false });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error || !data) {
    return { notifications: [], total: 0, unreadCount: unreadCount ?? 0 };
  }

  return {
    notifications: data as Notification[],
    total: count ?? 0,
    unreadCount: unreadCount ?? 0,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return 0;

  const supabase = createSupabaseServerClient();
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.id)
    .eq('is_read', false);

  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return;

  const supabase = createSupabaseServerClient();
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', ctx.id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return;

  const supabase = createSupabaseServerClient();
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', ctx.id)
    .eq('is_read', false);
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return;

  const supabase = createSupabaseServerClient();
  await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', ctx.id);
}
