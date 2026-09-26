import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { PaymentsTable } from '@/components/payments/payments-table';
import { getPayments, getPaymentFilterOptions } from '@/app/actions/payments';
import type { PaymentStatus, PaymentMethod } from '@/types/payment';

interface PaymentsPageProps {
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

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
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
        <PageHeader title="Payments" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view payments."
        />
      </AppShell>
    );
  }

  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 15;
  const search = searchParams.search || '';
  const status = (searchParams.status as PaymentStatus | 'all') || 'all';
  const method = (searchParams.method as PaymentMethod | 'all') || 'all';
  const clientId = searchParams.clientId || '';
  const projectId = searchParams.projectId || '';
  const dateFrom = searchParams.dateFrom || '';
  const dateTo = searchParams.dateTo || '';
  const sortBy = searchParams.sortBy || 'payment_date';
  const sortDir = (searchParams.sortDir as 'asc' | 'desc') || 'desc';

  const [{ payments, total }, filterOptions] = await Promise.all([
    getPayments({
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
    getPaymentFilterOptions(),
  ]);

  const totalAmount = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Payments"
          description="Track collections and monitor outstanding balances."
        />
        <PaymentsTable
          payments={payments}
          total={total}
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
          canCreate={ctx.permissions.includes('invoices.create')}
          filterOptions={filterOptions}
          totalAmount={totalAmount}
        />
      </div>
    </AppShell>
  );
}
