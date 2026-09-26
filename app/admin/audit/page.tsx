import { redirect } from 'next/navigation';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { AuditLogTable } from '@/components/admin/audit-log-table';
import { getAuditLogs, getAuditUsers } from '@/app/actions/audit';

interface PageProps {
  searchParams: {
    search?: string;
    userId?: string;
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  };
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const ctx = await getCurrentUserContext();

  if (!ctx) redirect('/login');

  if (!ctx.permissions.includes('audit.view')) {
    return (
      <AppShell>
        <PageHeader title="Audit Trail" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view audit logs."
        />
      </AppShell>
    );
  }

  const page = parseInt(searchParams.page || '1', 10) || 1;
  const pageSize = 25;

  const [auditData, users] = await Promise.all([
    getAuditLogs({
      search: searchParams.search || '',
      userId: searchParams.userId || '',
      action: searchParams.action || 'all',
      entityType: searchParams.entityType || 'all',
      dateFrom: searchParams.dateFrom || '',
      dateTo: searchParams.dateTo || '',
      sortBy: searchParams.sortBy || 'created_at',
      sortDir: (searchParams.sortDir as 'asc' | 'desc') || 'desc',
      page,
      pageSize,
    }),
    getAuditUsers(),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Audit Trail"
          description="Complete history of user actions and system events."
        />
        <AuditLogTable
          logs={auditData.rows}
          total={auditData.total}
          page={page}
          pageSize={pageSize}
          search={searchParams.search || ''}
          userId={searchParams.userId || ''}
          action={searchParams.action || 'all'}
          entityType={searchParams.entityType || 'all'}
          dateFrom={searchParams.dateFrom || ''}
          dateTo={searchParams.dateTo || ''}
          sortBy={searchParams.sortBy || 'created_at'}
          sortDir={(searchParams.sortDir as 'asc' | 'desc') || 'desc'}
          users={users}
        />
      </div>
    </AppShell>
  );
}
