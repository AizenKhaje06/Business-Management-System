import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { MonthlyReportClient } from '@/components/reports/monthly-report-client';
import { getMonthlyReport } from '@/app/actions/reports';

interface MonthlyReportPageProps {
  searchParams: {
    year?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export default async function MonthlyReportPage({
  searchParams,
}: MonthlyReportPageProps) {
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

  const year = searchParams.year
    ? parseInt(searchParams.year, 10)
    : undefined;
  const dateFrom = searchParams.dateFrom || undefined;
  const dateTo = searchParams.dateTo || undefined;

  const data = await getMonthlyReport({ year, dateFrom, dateTo });

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Monthly Financial Report"
          description="Monthly input, output, and net difference across all projects."
        />
        <MonthlyReportClient data={data} canView={canView} />
      </div>
    </AppShell>
  );
}
