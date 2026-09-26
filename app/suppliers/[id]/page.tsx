import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { SupplierProfile } from '@/components/suppliers/supplier-profile';
import {
  getSupplierById,
  getSupplierMaterials,
  getSupplierPurchases,
} from '@/app/actions/suppliers';

interface SupplierDetailPageProps {
  params: { id: string };
}

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
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
        <PageHeader title="Supplier" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view suppliers."
        />
      </AppShell>
    );
  }

  const supplier = await getSupplierById(params.id);

  if (!supplier) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/suppliers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Suppliers
              </Link>
            </Button>
          </div>
          <ErrorState
            title="Supplier Not Found"
            message="The supplier you are looking for does not exist."
          />
        </div>
      </AppShell>
    );
  }

  const [materials, purchases] = await Promise.all([
    getSupplierMaterials(params.id),
    getSupplierPurchases(params.id),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/suppliers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Suppliers
            </Link>
          </Button>
        </div>
        <SupplierProfile
          supplier={supplier}
          materials={materials}
          purchases={purchases}
          canEdit={ctx.permissions.includes('inventory.edit')}
        />
      </div>
    </AppShell>
  );
}
