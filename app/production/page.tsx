import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ProductionOrdersTable } from '@/components/production/production-orders-table';
import { getProductionOrders, getProductionStats } from '@/app/actions/production';
import type { ProductionOrderStatus, ProductionOrderPriority } from '@/types/production';

interface ProductionPageProps {
  searchParams: {
    search?: string;
    status?: string;
    priority?: string;
    page?: string;
  };
}

export default async function ProductionPage({
  searchParams,
}: ProductionPageProps) {
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

  if (!ctx.permissions.includes('orders.view')) {
    return (
      <AppShell>
        <PageHeader title="Production Orders" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view production orders."
        />
      </AppShell>
    );
  }

  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 20;
  const search = searchParams.search || '';
  const status = (searchParams.status as ProductionOrderStatus | 'all') || 'all';
  const priority = (searchParams.priority as ProductionOrderPriority | 'all') || 'all';

  const [{ orders, total }, stats] = await Promise.all([
    getProductionOrders({
      search,
      status: status !== 'all' ? status : undefined,
      priority: priority !== 'all' ? priority : undefined,
      page,
      pageSize,
    }),
    getProductionStats(),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Production Orders"
          description="Manage manufacturing orders and track production workflow."
        />
        
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Orders</div>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
        </div>

        <ProductionOrdersTable
          orders={orders}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          status={status}
          priority={priority}
          canCreate={ctx.permissions.includes('orders.create')}
        />
      </div>
    </AppShell>
  );
}
