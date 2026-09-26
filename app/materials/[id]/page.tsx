import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { MaterialProfile } from '@/components/materials/material-profile';
import { getMaterialById, getMaterialPurchases } from '@/app/actions/suppliers';

interface MaterialDetailPageProps {
  params: { id: string };
}

export default async function MaterialDetailPage({
  params,
}: MaterialDetailPageProps) {
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

  if (!ctx.permissions.includes('inventory.view')) {
    return (
      <AppShell>
        <PageHeader title="Material" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view materials."
        />
      </AppShell>
    );
  }

  const material = await getMaterialById(params.id);

  if (!material) {
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
          <ErrorState
            title="Material Not Found"
            message="The material you are looking for does not exist."
          />
        </div>
      </AppShell>
    );
  }

  const purchases = await getMaterialPurchases(params.id);

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
        <MaterialProfile
          material={material}
          purchases={purchases}
          canEdit={ctx.permissions.includes('inventory.edit')}
          canDelete={ctx.permissions.includes('inventory.delete')}
        />
      </div>
    </AppShell>
  );
}
