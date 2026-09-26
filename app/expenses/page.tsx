import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ExpensesTable } from '@/components/expenses/expenses-table';
import { getExpenses, getExpenseFilterOptions } from '@/app/actions/expenses';
import type { ExpenseStatus, ExpensePaymentMethod } from '@/types/expense';

interface ExpensesPageProps {
  searchParams: {
    search?: string;
    status?: string;
    method?: string;
    categoryId?: string;
    supplierId?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  };
}

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
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
        <PageHeader title="Expenses" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view expenses."
        />
      </AppShell>
    );
  }

  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 15;
  const search = searchParams.search || '';
  const status = (searchParams.status as ExpenseStatus | 'all') || 'all';
  const method = (searchParams.method as ExpensePaymentMethod | 'all') || 'all';
  const categoryId = searchParams.categoryId || '';
  const supplierId = searchParams.supplierId || '';
  const projectId = searchParams.projectId || '';
  const dateFrom = searchParams.dateFrom || '';
  const dateTo = searchParams.dateTo || '';
  const sortBy = searchParams.sortBy || 'expense_date';
  const sortDir = (searchParams.sortDir as 'asc' | 'desc') || 'desc';

  const [{ expenses, total }, filterOptions] = await Promise.all([
    getExpenses({
      search,
      status,
      method,
      categoryId: categoryId || undefined,
      supplierId: supplierId || undefined,
      projectId: projectId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    getExpenseFilterOptions(),
  ]);

  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const approvedTotal = expenses
    .filter((e) => e.status === 'approved')
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Expenses"
          description="Track expenses and monitor approved totals."
        />
        <ExpensesTable
          expenses={expenses}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          status={status}
          method={method}
          categoryId={categoryId}
          supplierId={supplierId}
          projectId={projectId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          sortBy={sortBy}
          sortDir={sortDir}
          canCreate={ctx.permissions.includes('invoices.create')}
          filterOptions={filterOptions}
          totalAmount={totalAmount}
          approvedTotal={approvedTotal}
        />
      </div>
    </AppShell>
  );
}
