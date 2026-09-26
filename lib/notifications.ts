import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  NotificationCategory,
  NotificationType,
} from '@/types/notification';

/**
 * Create a notification for a single user. Non-blocking — errors are
 * swallowed so the calling operation is never affected.
 */
export async function createNotification(
  userId: string,
  category: NotificationCategory,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    await supabase.from('notifications').insert({
      user_id: userId,
      category,
      type,
      title,
      message,
      data: data ?? null,
    });
  } catch {
    // Notification creation must never break the primary operation
  }
}

/**
 * Create a notification for multiple users. Non-blocking.
 */
export async function createNotificationsForUsers(
  userIds: string[],
  category: NotificationCategory,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const supabase = createSupabaseServerClient();
    const rows = userIds.map((userId) => ({
      user_id: userId,
      category,
      type,
      title,
      message,
      data: data ?? null,
    }));
    await supabase.from('notifications').insert(rows);
  } catch {
    // Notification creation must never break the primary operation
  }
}

/**
 * Create a notification for all users who have a specific permission.
 * This is used for role-targeted notifications (e.g. notify all approvers).
 */
export async function createNotificationsForPermission(
  permission: string,
  category: NotificationCategory,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();

    // Find all role IDs that have this permission
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('role_id')
      .in(
        'permission_id',
        (
          await supabase
            .from('permissions')
            .select('id')
            .eq('name', permission)
        ).data?.map((p) => p.id) ?? []
      );

    if (!rolePerms || rolePerms.length === 0) return;

    const roleIds = rolePerms.map((rp) => rp.role_id);

    // Find all active users with those roles
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', true)
      .in('role_id', roleIds);

    if (!users || users.length === 0) return;

    await createNotificationsForUsers(
      users.map((u) => u.id),
      category,
      type,
      title,
      message,
      data
    );
  } catch {
    // Notification creation must never break the primary operation
  }
}

/**
 * Create a notification for all active users. Non-blocking.
 */
export async function createNotificationsForAll(
  category: NotificationCategory,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', true);

    if (!users || users.length === 0) return;

    await createNotificationsForUsers(
      users.map((u) => u.id),
      category,
      type,
      title,
      message,
      data
    );
  } catch {
    // Notification creation must never break the primary operation
  }
}
