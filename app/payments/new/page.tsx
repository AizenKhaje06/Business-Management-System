import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/payments/payment-form';

export default async function NewPaymentPage() {
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

  if (!ctx.permissions.includes('invoices.create')) {
    return (
      <AppShell>
        <PageHeader title="New Payment" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to create payments."
        />
      </AppShell>
    );
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, project_code, client_id, budget')
    .eq('archived', false)
    .order('name');

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/payments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payments
            </Link>
          </Button>
        </div>
        <PageHeader
          title="Record Payment"
          description="Record a new payment against a project."
        />
        <div className="max-w-2xl rounded-lg border bg-card p-6 shadow-sm">
          {!projects || projects.length === 0 ? (
            <ErrorState
              title="No active projects"
              message="You need at least one active project before recording a payment."
            />
          ) : (
            <PaymentForm mode="create" projects={projects} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
