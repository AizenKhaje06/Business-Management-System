import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ImportWizard } from '@/components/imports/import-wizard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { History } from 'lucide-react';

export default async function ImportPage() {
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

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <PageHeader
            title="Import Data"
            description="Upload CSV or Excel files to bulk import records into your database."
          />
          <Button variant="outline" size="sm" asChild>
            <Link href="/import/history">
              <History className="mr-2 h-4 w-4" />
              Import History
            </Link>
          </Button>
        </div>
        <ImportWizard />
      </div>
    </AppShell>
  );
}
