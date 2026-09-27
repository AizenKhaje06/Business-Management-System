'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext, canManageUser } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';
import type { RoleName } from '@/types/auth';

export type ActionResult =
  { success: true; data?: unknown } | { success: false; error: string };

/**
 * Create a new user with the admin client.
 * Requires users.create permission.
 */
export async function createUser(input: {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roleName: RoleName;
}): Promise<ActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('users.create')) {
    return {
      success: false,
      error: 'You do not have permission to create users.',
    };
  }

  const admin = createSupabaseAdminClient();

  // Validate username if provided
  if (input.username) {
    const { data: existingUsername } = await admin
      .from('profiles')
      .select('id')
      .eq('username', input.username)
      .maybeSingle();

    if (existingUsername) {
      return { success: false, error: 'Username already taken.' };
    }
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

  if (authError) {
    return { success: false, error: authError.message };
  }

  const userId = authData.user.id;

  // Get role ID
  const { data: role } = await admin
    .from('roles')
    .select('id')
    .eq('name', input.roleName)
    .maybeSingle();

  if (!role) {
    return { success: false, error: `Role "${input.roleName}" not found.` };
  }

  // Generate username if not provided
  let finalUsername = input.username;
  if (!finalUsername) {
    finalUsername = input.email.split('@')[0].toLowerCase();
    // Make unique if needed
    let counter = 1;
    while (true) {
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .eq('username', finalUsername)
        .maybeSingle();
      if (!existing) break;
      finalUsername = `${input.email.split('@')[0].toLowerCase()}_${counter}`;
      counter++;
    }
  }

  // Update the auto-created profile
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      username: finalUsername,
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      role_id: role.id,
    })
    .eq('id', userId);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  await logAuditForCurrentUser(ctx.id, 'create', 'user', {
    entityId: userId,
    entityName: input.email,
    newValues: { email: input.email, username: finalUsername, role: input.roleName },
  });

  revalidatePath('/admin/users');
  return { success: true, data: { id: userId } };
}

/**
 * Edit an existing user's profile and role.
 * Requires users.edit permission and hierarchical authority over the target.
 */
export async function updateUser(input: {
  userId: string;
  firstName?: string;
  lastName?: string;
  roleName: RoleName;
  isActive?: boolean;
}): Promise<ActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('users.edit')) {
    return {
      success: false,
      error: 'You do not have permission to edit users.',
    };
  }

  const canManage = await canManageUser(input.userId);
  if (!canManage) {
    return {
      success: false,
      error: 'You cannot manage a user with an equal or higher role.',
    };
  }

  const admin = createSupabaseAdminClient();

  // Get role ID
  const { data: role } = await admin
    .from('roles')
    .select('id')
    .eq('name', input.roleName)
    .maybeSingle();

  if (!role) {
    return { success: false, error: `Role "${input.roleName}" not found.` };
  }

  const updateData: Record<string, unknown> = {
    first_name: input.firstName || null,
    last_name: input.lastName || null,
    role_id: role.id,
  };

  if (input.isActive !== undefined) {
    if (!ctx.permissions.includes('users.deactivate')) {
      return {
        success: false,
        error: 'You do not have permission to activate/deactivate users.',
      };
    }
    updateData.is_active = input.isActive;
  }

  const { error } = await admin
    .from('profiles')
    .update(updateData)
    .eq('id', input.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditForCurrentUser(ctx.id, 'role_change', 'user', {
    entityId: input.userId,
    newValues: { role: input.roleName, is_active: input.isActive },
  });

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${input.userId}`);
  return { success: true };
}

/**
 * Activate or deactivate a user.
 * Requires users.deactivate permission.
 */
export async function toggleUserActive(input: {
  userId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('users.deactivate')) {
    return {
      success: false,
      error: 'You do not have permission to activate/deactivate users.',
    };
  }

  const canManage = await canManageUser(input.userId);
  if (!canManage) {
    return {
      success: false,
      error: 'You cannot manage a user with an equal or higher role.',
    };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ is_active: input.isActive })
    .eq('id', input.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditForCurrentUser(ctx.id, input.isActive ? 'activate' : 'deactivate', 'user', {
    entityId: input.userId,
  });

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Update the current user's own profile (name fields only).
 * Role and is_active cannot be changed by the user themselves.
 */
export async function updateOwnProfile(input: {
  firstName?: string;
  lastName?: string;
}): Promise<ActionResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated.' };

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: input.firstName || null,
      last_name: input.lastName || null,
    })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/profile');
  revalidatePath('/');
  return { success: true };
}

/**
 * Get all users (for dropdowns and listings).
 * Requires users.view permission.
 */
export async function getUsers(): Promise<{
  users: Array<{
    id: string;
    email: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    is_active: boolean;
    role_name: string;
  }>;
}> {
  const ctx = await getCurrentUserContext();
  if (!ctx || !ctx.permissions.includes('users.view')) {
    return { users: [] };
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, email, username, first_name, last_name, is_active, role:roles(name)')
    .eq('is_active', true)
    .order('first_name', { ascending: true });

  if (!data) return { users: [] };

  return {
    users: data.map((p) => {
      const role = Array.isArray(p.role) ? p.role[0] : p.role;
      return {
        id: p.id,
        email: p.email,
        username: p.username,
        first_name: p.first_name,
        last_name: p.last_name,
        is_active: p.is_active,
        role_name: (role as { name: string } | null)?.name || 'VIEWER',
      };
    }),
  };
}
