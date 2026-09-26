import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ProjectsTable } from '@/components/projects/projects-table';
import { getProjects } from '@/app/actions/projects';
import type { ProjectStatus } from '@/types/project';

interface ProjectsPageProps {
  searchParams: {
    search?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  };
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
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

  if (!ctx.permissions.includes('invoices.view')) {
    return (
      <AppShell>
        <PageHeader title="Projects" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view projects."
        />
      </AppShell>
    );
  }

  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 10;
  const search = searchParams.search || '';
  const status = (searchParams.status as ProjectStatus | 'all') || 'all';
  const sortBy = searchParams.sortBy || 'created_at';
  const sortDir = (searchParams.sortDir as 'asc' | 'desc') || 'desc';

  const { projects, total } = await getProjects({
    search,
    status,
    sortBy,
    sortDir,
    page,
    pageSize,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Projects"
          description="Manage projects, track progress, and monitor financials."
        />
        <ProjectsTable
          projects={projects}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          status={status}
          sortBy={sortBy}
          sortDir={sortDir}
          canCreate={ctx.permissions.includes('invoices.create')}
        />
      </div>
    </AppShell>
  );
}
