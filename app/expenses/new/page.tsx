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
import { getExpenseFilterOptions } from '@/app/actions/expenses';

export default async function NewExpensePage() {
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
        <PageHeader title="New Expense" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to create expenses."
        />
      </AppShell>
    );
  }

  const filterOptions = await getExpenseFilterOptions();

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
        <PageHeader
          title="New Expense"
          description="Record a new expense for a project or category."
        />
        <div className="max-w-2xl rounded-lg border bg-card p-6 shadow-sm">
          <ExpenseForm
            mode="create"
            categories={filterOptions.categories}
            suppliers={filterOptions.suppliers}
            projects={filterOptions.projects}
          />
        </div>
      </div>
    </AppShell>
  );
}
