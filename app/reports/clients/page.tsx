import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ClientReportClient } from '@/components/reports/client-report-client';
import { getClientReport } from '@/app/actions/reports';

interface ClientReportPageProps {
  searchParams: {
    search?: string;
    status?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  };
}

export default async function ClientReportPage({
  searchParams,
}: ClientReportPageProps) {
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
  const city = searchParams.city || '';
  const dateFrom = searchParams.dateFrom || '';
  const dateTo = searchParams.dateTo || '';
  const sortBy = searchParams.sortBy || 'name';
  const sortDir = (searchParams.sortDir as 'asc' | 'desc') || 'asc';

  const data = await getClientReport({
    search,
    status,
    city: city || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy,
    sortDir,
    page,
    pageSize,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Client Report"
          description="Client overview with project counts, contract values, payments, and outstanding balances."
        />
        <ClientReportClient
          rows={data.rows}
          total={data.total}
          totalContract={data.totalContract}
          totalPayments={data.totalPayments}
          totalOutstanding={data.totalOutstanding}
          page={page}
          pageSize={pageSize}
          search={search}
          status={status}
          city={city}
          dateFrom={dateFrom}
          dateTo={dateTo}
          sortBy={sortBy}
          sortDir={sortDir}
          canView={canView}
        />
      </div>
    </AppShell>
  );
}
