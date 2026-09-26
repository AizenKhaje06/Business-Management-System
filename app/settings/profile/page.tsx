import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ProfileForm } from '@/components/settings/profile-form';
import { Badge } from '@/components/ui/badge';
import type { ProfileWithRole, Role } from '@/types/auth';

export default async function SettingsProfilePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data } = await supabase
    .from('profiles')
    .select(
      `
      *,
      role:roles(*)
    `
    )
    .eq('id', user.id)
    .maybeSingle();

  const profile = data as ProfileWithRole | null;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Profile Settings"
          description="Update your personal information."
        />

        <div className="max-w-2xl space-y-6">
          {/* Account info */}
          <div className="rounded-lg border p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Email
              </h3>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Role
              </h3>
              <div className="flex items-center gap-2">
                {profile?.role ? (
                  <Badge variant="outline">{profile.role.name}</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Unassigned
                  </Badge>
                )}
                {profile?.role?.description && (
                  <span className="text-xs text-muted-foreground">
                    {profile.role.description}
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Status
              </h3>
              {profile?.is_active ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
          </div>

          {/* Edit form */}
          {profile && <ProfileForm profile={profile} />}
        </div>
      </div>
    </AppShell>
  );
}
