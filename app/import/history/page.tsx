import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ImportHistoryTable } from '@/components/imports/import-history-table';
import { getImportHistory } from '@/app/actions/imports';

export default async function ImportHistoryPage() {
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

  const history = await getImportHistory();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Import History"
          description="A log of every import operation — what was imported, how many rows, and the result."
        />
        <ImportHistoryTable history={history} />
      </div>
    </AppShell>
  );
}
