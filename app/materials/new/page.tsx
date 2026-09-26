import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { MaterialForm } from '@/components/materials/material-form';
import { getActiveSuppliers } from '@/app/actions/suppliers';

export default async function NewMaterialPage() {
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

  if (!ctx.permissions.includes('inventory.create')) {
    return (
      <AppShell>
        <PageHeader title="New Material" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to create materials."
        />
      </AppShell>
    );
  }

  const suppliers = await getActiveSuppliers();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/materials">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Materials
            </Link>
          </Button>
        </div>
        <PageHeader title="New Material" description="Add a new material." />
        <div className="max-w-2xl rounded-lg border bg-card p-6 shadow-sm">
          <MaterialForm mode="create" suppliers={suppliers} />
        </div>
      </div>
    </AppShell>
  );
}
