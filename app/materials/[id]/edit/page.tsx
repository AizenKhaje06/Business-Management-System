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
import { getMaterialById, getActiveSuppliers } from '@/app/actions/suppliers';

interface EditMaterialPageProps {
  params: { id: string };
}

export default async function EditMaterialPage({
  params,
}: EditMaterialPageProps) {
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

  if (!ctx.permissions.includes('inventory.edit')) {
    return (
      <AppShell>
        <PageHeader title="Edit Material" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to edit materials."
        />
      </AppShell>
    );
  }

  const [material, suppliers] = await Promise.all([
    getMaterialById(params.id),
    getActiveSuppliers(),
  ]);

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

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/materials/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Material
            </Link>
          </Button>
        </div>
        <PageHeader
          title={`Edit ${material.name}`}
          description="Update material information."
        />
        <div className="max-w-2xl rounded-lg border bg-card p-6 shadow-sm">
          <MaterialForm mode="edit" material={material} suppliers={suppliers} />
        </div>
      </div>
    </AppShell>
  );
}
