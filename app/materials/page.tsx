import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { MaterialsTable } from '@/components/materials/materials-table';
import { getMaterials } from '@/app/actions/suppliers';

interface MaterialsPageProps {
  searchParams: {
    search?: string;
    isActive?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  };
}

export default async function MaterialsPage({
  searchParams,
}: MaterialsPageProps) {
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

  if (!ctx.permissions.includes('inventory.view')) {
    return (
      <AppShell>
        <PageHeader title="Materials" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view materials."
        />
      </AppShell>
    );
  }

  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 15;
  const search = searchParams.search || '';
  const isActive =
    searchParams.isActive === 'true'
      ? true
      : searchParams.isActive === 'false'
        ? false
        : 'all';
  const sortBy = searchParams.sortBy || 'created_at';
  const sortDir = (searchParams.sortDir as 'asc' | 'desc') || 'desc';

  const { materials, total } = await getMaterials({
    search,
    isActive,
    sortBy,
    sortDir,
    page,
    pageSize,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Materials"
          description="Manage materials and track their default costs."
        />
        <MaterialsTable
          materials={materials}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          isActive={isActive}
          sortBy={sortBy}
          sortDir={sortDir}
          canCreate={ctx.permissions.includes('inventory.create')}
        />
      </div>
    </AppShell>
  );
}
