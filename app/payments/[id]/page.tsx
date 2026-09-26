import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { PaymentDetail } from '@/components/payments/payment-detail';
import {
  getPaymentById,
  getProjectPaymentSummary,
} from '@/app/actions/payments';

interface PaymentDetailPageProps {
  params: { id: string };
}

export default async function PaymentDetailPage({
  params,
}: PaymentDetailPageProps) {
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

  if (!ctx.permissions.includes('invoices.view')) {
    return (
      <AppShell>
        <PageHeader title="Payment" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view payments."
        />
      </AppShell>
    );
  }

  const payment = await getPaymentById(params.id);

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
            <Link href="/payments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payments
            </Link>
          </Button>
        </div>
        <PaymentDetail
          payment={payment}
          summary={summary}
          canEdit={ctx.permissions.includes('invoices.edit')}
          canDelete={ctx.permissions.includes('invoices.delete')}
          canApprove={ctx.permissions.includes('invoices.approve')}
        />
      </div>
    </AppShell>
  );
}
