import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ProjectForm } from '@/components/projects/project-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getActiveClients } from '@/app/actions/projects';

export default async function NewProjectPage() {
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

  if (!ctx.permissions.includes('invoices.create')) {
    return (
      <AppShell>
        <PageHeader title="New Project" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to create projects."
        />
      </AppShell>
    );
  }

  const clients = await getActiveClients();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
        <PageHeader
          title="New Project"
          description="Create a new project and assign it to a client."
        />
        <div className="max-w-3xl rounded-lg border bg-card p-6 shadow-sm">
          {clients.length === 0 ? (
            <ErrorState
              title="No active clients"
              message="You need at least one active client before creating a project."
            />
          ) : (
            <ProjectForm mode="create" clients={clients} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
