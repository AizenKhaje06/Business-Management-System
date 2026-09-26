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
import {
  getPaymentById,
  getProjectPaymentSummary,
} from '@/app/actions/payments';

interface EditPaymentPageProps {
  params: { id: string };
}

export default async function EditPaymentPage({
  params,
}: EditPaymentPageProps) {
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

  if (!ctx.permissions.includes('invoices.edit')) {
    return (
      <AppShell>
        <PageHeader title="Edit Payment" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to edit payments."
        />
      </AppShell>
    );
  }

  const [payment, { data: projects }] = await Promise.all([
    getPaymentById(params.id),
    createSupabaseServerClient()
      .from('projects')
      .select('id, name, project_code, client_id, budget')
      .eq('archived', false)
      .order('name'),
  ]);

  if (!payment) {
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
          <ErrorState
            title="Payment Not Found"
            message="The payment record you are looking for does not exist."
          />
        </div>
      </AppShell>
    );
  }

  const summary = await getProjectPaymentSummary(payment.project_id);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/payments/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payment
            </Link>
          </Button>
        </div>
        <PageHeader
          title={`Edit ${payment.payment_code}`}
          description="Update payment information."
        />
        <div className="max-w-2xl rounded-lg border bg-card p-6 shadow-sm">
          <PaymentForm
            mode="edit"
            payment={payment}
            projects={projects || []}
            initialSummary={summary}
          />
        </div>
      </div>
    </AppShell>
  );
}
