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
import { getProjectById, getActiveClients } from '@/app/actions/projects';

interface EditProjectPageProps {
  params: { id: string };
}

export default async function EditProjectPage({
  params,
}: EditProjectPageProps) {
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

  if (!ctx.permissions.includes('invoices.edit')) {
    return (
      <AppShell>
        <PageHeader title="Edit Project" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to edit projects."
        />
      </AppShell>
    );
  }

  const [project, clients] = await Promise.all([
    getProjectById(params.id),
    getActiveClients(),
  ]);

  if (!project) {
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
          <ErrorState
            title="Project Not Found"
            message="The project you are looking for does not exist."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/projects/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
        </div>
        <PageHeader
          title={`Edit ${project.name}`}
          description="Update project information."
        />
        <div className="max-w-3xl rounded-lg border bg-card p-6 shadow-sm">
          <ProjectForm mode="edit" project={project} clients={clients} />
        </div>
      </div>
    </AppShell>
  );
}
