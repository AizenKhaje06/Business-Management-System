import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { ExpenseDetail } from '@/components/expenses/expense-detail';
import { getExpenseById } from '@/app/actions/expenses';

interface ExpenseDetailPageProps {
  params: { id: string };
}

export default async function ExpenseDetailPage({
  params,
}: ExpenseDetailPageProps) {
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
        <PageHeader title="Expense" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view expenses."
        />
      </AppShell>
    );
  }

  const expense = await getExpenseById(params.id);

  if (!expense) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/expenses">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Expenses
              </Link>
            </Button>
          </div>
          <ErrorState
            title="Expense Not Found"
            message="The expense record you are looking for does not exist."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/expenses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Expenses
            </Link>
          </Button>
        </div>
        <ExpenseDetail
          expense={expense}
          canEdit={ctx.permissions.includes('invoices.edit')}
          canDelete={ctx.permissions.includes('invoices.delete')}
          canApprove={ctx.permissions.includes('invoices.approve')}
        />
      </div>
    </AppShell>
  );
}
