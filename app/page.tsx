import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { KPIGrid } from '@/components/dashboard/kpi-grid';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { DashboardTables } from '@/components/dashboard/dashboard-tables';
import { getDashboardData } from '@/app/actions/dashboard';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const ctx = await getCurrentUserContext();
  const firstName =
    [ctx?.profile?.first_name, ctx?.profile?.last_name]
      .filter(Boolean)
      .join(' ')
      .split(' ')[0] || user.email;

  const data = await getDashboardData();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description={`Welcome back, ${firstName}.`}
        />

        <KPIGrid kpis={data.kpis} />

        <DashboardCharts
          monthlyData={data.monthlyData}
          expenseByCategory={data.expenseByCategory}
          projectCostDistribution={data.projectCostDistribution}
          paymentStatusData={data.paymentStatusData}
          projectStatusData={data.projectStatusData}
        />

        <DashboardTables
          recentPayments={data.recentPayments}
          recentExpenses={data.recentExpenses}
          recentProjects={data.recentProjects}
          recentActivity={data.recentActivity}
        />
      </div>
    </AppShell>
  );
}
