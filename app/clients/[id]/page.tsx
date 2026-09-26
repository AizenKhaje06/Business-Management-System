import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ClientProfile } from '@/components/clients/client-profile';
import {
  getClientById,
  getClientStats,
  getClientProjects,
  getClientPayments,
  getClientDocuments,
  getClientActivity,
} from '@/app/actions/clients';

interface ClientDetailPageProps {
  params: { id: string };
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
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

  if (!ctx.permissions.includes('contacts.view')) {
    return (
      <AppShell>
        <PageHeader title="Client" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view clients."
        />
      </AppShell>
    );
  }

  const client = await getClientById(params.id);

  if (!client) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/clients">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
              </Link>
            </Button>
          </div>
          <ErrorState
            title="Client Not Found"
            message="The client you are looking for does not exist or has been removed."
          />
        </div>
      </AppShell>
    );
  }

  const [stats, projects, payments, documents, activity] = await Promise.all([
    getClientStats(params.id),
    getClientProjects(params.id),
    getClientPayments(params.id),
    getClientDocuments(params.id),
    getClientActivity(params.id),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Link>
          </Button>
        </div>
        <ClientProfile
          client={client}
          stats={stats}
          projects={projects}
          payments={payments}
          documents={documents}
          activity={activity}
          canEdit={ctx.permissions.includes('contacts.edit')}
          canDelete={ctx.permissions.includes('contacts.delete')}
        />
      </div>
    </AppShell>
  );
}
