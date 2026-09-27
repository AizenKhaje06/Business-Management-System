import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { ProductSettingsTabs } from '@/components/settings/product-settings-tabs';
import {
  getWoodTypes,
  getWoodFinishes,
  getMaterialCategories,
} from '@/app/actions/product-settings';
import { getProductCategories } from '@/app/actions/production';

export default async function ProductSettingsPage() {
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

  // Check permission
  if (!ctx.permissions.includes('inventory.edit')) {
    return (
      <AppShell>
        <PageHeader title="Product Settings" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to manage product settings."
        />
      </AppShell>
    );
  }

  // Load all settings data
  const [woodTypes, finishes, materialCategories, productCategories] =
    await Promise.all([
      getWoodTypes(true), // Include inactive
      getWoodFinishes(true),
      getMaterialCategories(true),
      getProductCategories(),
    ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Product Settings"
          description="Manage wood types, finishes, material categories, and product categories for your inventory system."
        />

        <ProductSettingsTabs
          woodTypes={woodTypes}
          finishes={finishes}
          materialCategories={materialCategories}
          productCategories={productCategories}
        />
      </div>
    </AppShell>
  );
}
