import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { ClientForm } from '@/components/clients/client-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getClientById } from '@/app/actions/clients';

interface EditClientPageProps {
  params: { id: string };
}

export default async function EditClientPage({ params }: EditClientPageProps) {
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

  if (!ctx.permissions.includes('contacts.edit')) {
    return (
      <AppShell>
        <PageHeader title="Edit Client" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to edit clients."
        />
      </AppShell>
    );
  }

  const client = await getClientById(params.id);

  if (!client) {
    return (
      <AppShell>
        <PageHeader title="Edit Client" />
        <ErrorState
          title="Client Not Found"
          message="The client you are looking for does not exist."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/clients/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Client
            </Link>
          </Button>
        </div>
        <PageHeader
          title={`Edit ${client.name}`}
          description="Update client information."
        />
        <div className="max-w-3xl rounded-lg border bg-card p-6 shadow-sm">
          <ClientForm mode="edit" client={client} />
        </div>
      </div>
    </AppShell>
  );
}
