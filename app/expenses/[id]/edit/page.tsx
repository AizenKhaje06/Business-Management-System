import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { ExpenseForm } from '@/components/expenses/expense-form';
import {
  getExpenseById,
  getExpenseFilterOptions,
} from '@/app/actions/expenses';

interface EditExpensePageProps {
  params: { id: string };
}

export default async function EditExpensePage({
  params,
}: EditExpensePageProps) {
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
        <PageHeader title="Edit Expense" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to edit expenses."
        />
      </AppShell>
    );
  }

  const [expense, filterOptions] = await Promise.all([
    getExpenseById(params.id),
    getExpenseFilterOptions(),
  ]);

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
            <Link href={`/expenses/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Expense
            </Link>
          </Button>
        </div>
        <PageHeader
          title={`Edit ${expense.expense_code}`}
          description="Update expense information."
        />
        <div className="max-w-2xl rounded-lg border bg-card p-6 shadow-sm">
          <ExpenseForm
            mode="edit"
            expense={expense}
            categories={filterOptions.categories}
            suppliers={filterOptions.suppliers}
            projects={filterOptions.projects}
          />
        </div>
      </div>
    </AppShell>
  );
}
