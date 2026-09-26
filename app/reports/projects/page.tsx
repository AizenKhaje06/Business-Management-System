import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ProjectReportClient } from '@/components/reports/project-report-client';
import {
  getProjectReport,
  getProjectReportFilterOptions,
} from '@/app/actions/reports';

interface ProjectReportPageProps {
  searchParams: {
    search?: string;
    status?: string;
    clientId?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    managerId?: string;
    staffId?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  };
}

export default async function ProjectReportPage({
  searchParams,
}: ProjectReportPageProps) {
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

  const canView =
    ctx.permissions.includes('invoices.view') ||
    ctx.permissions.includes('reports.view');

  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 15;
  const search = searchParams.search || '';
  const status = searchParams.status || 'all';
  const clientId = searchParams.clientId || '';
  const projectId = searchParams.projectId || '';
  const dateFrom = searchParams.dateFrom || '';
  const dateTo = searchParams.dateTo || '';
  const managerId = searchParams.managerId || '';
  const staffId = searchParams.staffId || '';
  const sortBy = searchParams.sortBy || 'name';
  const sortDir = (searchParams.sortDir as 'asc' | 'desc') || 'asc';

  const [data, filterOptions] = await Promise.all([
    getProjectReport({
      search,
      status,
      clientId: clientId || undefined,
      projectId: projectId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      managerId: managerId || undefined,
      staffId: staffId || undefined,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    getProjectReportFilterOptions(),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Project Reports"
          description="Financial performance across all projects — contract, payments, cost, and difference."
        />
        <ProjectReportClient
          data={data}
          filterOptions={filterOptions}
          page={page}
          pageSize={pageSize}
          search={search}
          status={status}
          clientId={clientId}
          projectId={projectId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          managerId={managerId}
          staffId={staffId}
          sortBy={sortBy}
          sortDir={sortDir}
          canView={canView}
        />
      </div>
    </AppShell>
  );
}
