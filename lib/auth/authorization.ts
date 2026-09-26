import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import type {
  CurrentUserContext,
  ProfileWithRole,
  PermissionName,
  RoleName,
  Role,
} from '@/types/auth';

/**
 * Server-side authorization helpers.
 *
 * These functions query the database to determine the current user's
 * role and permissions. They are the single source of truth for
 * server-side access control — UI hiding is a convenience layer only.
 */

/**
 * Fetch the current user's profile with role information.
 */
export async function getProfileWithRole(
  userId: string
): Promise<ProfileWithRole | null> {
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from('profiles')
    .select(
      `
      *,
      role:roles(*)
    `
    )
    .eq('id', userId)
    .maybeSingle();

  return data as ProfileWithRole | null;
}

/**
 * Fetch all permission names for a given role ID.
 */
export async function getRolePermissions(
  roleId: string
): Promise<PermissionName[]> {
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from('role_permissions')
    .select(
      `
      permission:permissions(name)
    `
    )
    .eq('role_id', roleId);

  if (!data) return [];

  return data
    .map((item) => {
      const perm = item.permission as unknown as
        { name: PermissionName } | { name: PermissionName }[] | null;
      if (Array.isArray(perm)) {
        return perm[0]?.name ?? null;
      }
      return perm?.name ?? null;
    })
    .filter((name): name is PermissionName => name != null);
}

/**
 * Build a complete authorization context for the current user.
 * Includes profile, role, and all permissions.
 */
export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getProfileWithRole(user.id);

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? '',
      profile: null,
      permissions: [],
      role: null,
    };
  }

  const permissions = profile.role_id
    ? await getRolePermissions(profile.role_id)
    : [];

  return {
    id: user.id,
    email: user.email ?? '',
    profile,
    permissions,
    role: profile.role?.name ?? null,
  };
}

/**
 * Require authentication — throws if no user session.
 */
export async function requireAuth(): Promise<User> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required.');
  }

  return user;
}

/**
 * Require a specific permission. Throws if the user lacks it.
 */
export async function requirePermission(
  permission: PermissionName
): Promise<CurrentUserContext> {
  const ctx = await getCurrentUserContext();

  if (!ctx) {
    throw new Error('Authentication required.');
  }

  if (!ctx.permissions.includes(permission)) {
    throw new Error(`Access denied: missing permission "${permission}".`);
  }

  return ctx;
}

/**
 * Check if the current user has a specific permission.
 */
export async function hasPermission(
  permission: PermissionName
): Promise<boolean> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return false;
  return ctx.permissions.includes(permission);
}

/**
 * Check if the current user has any of the specified permissions.
 */
export async function hasAnyPermission(
  permissions: PermissionName[]
): Promise<boolean> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return false;
  return permissions.some((p) => ctx.permissions.includes(p));
}

/**
 * Check if the current user has ALL of the specified permissions.
 */
export async function hasAllPermissions(
  permissions: PermissionName[]
): Promise<boolean> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return false;
  return permissions.every((p) => ctx.permissions.includes(p));
}

/**
 * Get the current user's role hierarchy level (1 = highest, 6 = lowest).
 * Returns 99 if no role is assigned.
 */
export async function getRoleLevel(): Promise<number> {
  const ctx = await getCurrentUserContext();
  return ctx?.profile?.role?.level ?? 99;
}

/**
 * Check if the current user can manage a target user.
 * A user can manage another user if their role level is lower (higher authority)
 * than the target's role level, OR they are managing themselves.
 */
export async function canManageUser(targetUserId: string): Promise<boolean> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return false;

  // Users can always edit their own profile
  if (ctx.id === targetUserId) return true;

  // Must have user management permission
  if (!ctx.permissions.includes('users.manage')) return false;

  // Get target user's role level
  const targetProfile = await getProfileWithRole(targetUserId);
  if (!targetProfile?.role) return true; // No role = can manage

  const myLevel = ctx.profile?.role?.level ?? 99;
  const targetLevel = targetProfile.role.level;

  return myLevel < targetLevel;
}

// Convenience helpers for common permission checks
export async function canCreateExpense() {
  return hasPermission('expenses.create');
}

export async function canApproveExpense() {
  return hasPermission('expenses.approve');
}

export async function canManageUsers() {
  return hasPermission('users.manage');
}

export async function canViewReports() {
  return hasPermission('reports.view');
}

export async function canCreateUser() {
  return hasPermission('users.create');
}

export async function canEditUser() {
  return hasPermission('users.edit');
}

export async function canDeactivateUser() {
  return hasPermission('users.deactivate');
}
