import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ProductsTable } from '@/components/production/products-table';
import { getProducts, getProductCategories } from '@/app/actions/production';

export default async function ProductsPage() {
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
        <PageHeader title="Products" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view products."
        />
      </AppShell>
    );
  }

  const [products, categories] = await Promise.all([
    getProducts({ is_active: true }),
    getProductCategories(),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Product Catalog"
          description="Manage wood furniture products, specifications, and pricing."
        />
        <ProductsTable
          products={products}
          categories={categories}
          canCreate={ctx.permissions.includes('inventory.create')}
          canEdit={ctx.permissions.includes('inventory.edit')}
        />
      </div>
    </AppShell>
  );
}
