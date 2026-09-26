import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ClientsTable } from '@/components/clients/clients-table';
import { getClients } from '@/app/actions/clients';
import type { ClientStatus } from '@/types/client';

interface ClientsPageProps {
  searchParams: {
    search?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  };
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
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

  if (!ctx.permissions.includes('contacts.view')) {
    return (
      <AppShell>
        <PageHeader title="Clients" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view clients."
        />
      </AppShell>
    );
  }

  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 10;
  const search = searchParams.search || '';
  const status = (searchParams.status as ClientStatus | 'all') || 'all';
  const sortBy = searchParams.sortBy || 'created_at';
  const sortDir = (searchParams.sortDir as 'asc' | 'desc') || 'desc';

  const { clients, total } = await getClients({
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
          title="Clients"
          description="Manage your client relationships and track project activity."
        />
        <ClientsTable
          clients={clients}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          status={status}
          sortBy={sortBy}
          sortDir={sortDir}
          canCreate={ctx.permissions.includes('contacts.create')}
        />
      </div>
    </AppShell>
  );
}
