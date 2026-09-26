import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { PaymentReportClient } from '@/components/reports/payment-report-client';
import {
  getPaymentReport,
  getReportFilterOptions,
} from '@/app/actions/reports';

interface PaymentReportPageProps {
  searchParams: {
    search?: string;
    status?: string;
    method?: string;
    clientId?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  };
}

export default async function PaymentReportPage({
  searchParams,
}: PaymentReportPageProps) {
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
  const method = searchParams.method || 'all';
  const clientId = searchParams.clientId || '';
  const projectId = searchParams.projectId || '';
  const dateFrom = searchParams.dateFrom || '';
  const dateTo = searchParams.dateTo || '';
  const sortBy = searchParams.sortBy || 'payment_date';
  const sortDir = (searchParams.sortDir as 'asc' | 'desc') || 'desc';

  const [data, filterOptions] = await Promise.all([
    getPaymentReport({
      search,
      status,
      method,
      clientId: clientId || undefined,
      projectId: projectId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    getReportFilterOptions(),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Payment Report"
          description="Detailed payment records with client, project, and method breakdown."
        />
        <PaymentReportClient
          rows={data.rows}
          total={data.total}
          totalAmount={data.totalAmount}
          filterOptions={filterOptions}
          page={page}
          pageSize={pageSize}
          search={search}
          status={status}
          method={method}
          clientId={clientId}
          projectId={projectId}
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
