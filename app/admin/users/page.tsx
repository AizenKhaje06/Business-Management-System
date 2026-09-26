import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { UsersTable } from '@/components/admin/users-table';
import type { ProfileWithRole, Role } from '@/types/auth';

export default async function AdminUsersPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const ctx = await getCurrentUserContext();

  if (!ctx) {
    return (
      <AppShell>
        <ErrorState
          title="Access Error"
          message="Unable to load your user context."
        />
      </AppShell>
    );
  }

  if (!ctx.permissions.includes('users.view')) {
    return (
      <AppShell>
        <PageHeader title="User Management" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view users."
        />
      </AppShell>
    );
  }

  // Fetch all profiles with role info
  const { data: profilesData, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      role:roles(*)
    `
    )
    .order('created_at', { ascending: false });

  // Fetch all roles for the role selector
  const { data: rolesData } = await supabase
    .from('roles')
    .select('*')
    .order('level', { ascending: true });

  const profiles = (profilesData ?? []) as ProfileWithRole[];
  const roles = (rolesData ?? []) as Role[];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          description="Create, edit, and manage user accounts and their roles."
        />
        <UsersTable
          profiles={profiles}
          roles={roles}
          currentUserId={ctx.id}
          currentRoleLevel={ctx.profile?.role?.level ?? 99}
          canCreate={ctx.permissions.includes('users.create')}
          canEdit={ctx.permissions.includes('users.edit')}
          canDeactivate={ctx.permissions.includes('users.deactivate')}
        />
      </div>
    </AppShell>
  );
}
