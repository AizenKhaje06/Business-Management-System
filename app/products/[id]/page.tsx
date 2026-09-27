import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package, Tag, DollarSign, Clock } from 'lucide-react';
import { getProductById } from '@/app/actions/production';

interface ProductDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
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
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view products."
        />
      </AppShell>
    );
  }

  const product = await getProductById(params.id);

  if (!product) {
    notFound();
  }

  const formatPrice = (price: number | null) => {
    if (!price) return 'Not set';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(price);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/products">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Products
                </Link>
              </Button>
            </div>
            <PageHeader
              title={product.name}
              description={product.description || undefined}
            />
          </div>
          <div className="flex gap-2">
            {product.is_active ? (
              <Badge variant="secondary">Active</Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
            {product.is_customizable && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Customizable
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  SKU
                </div>
                <div className="mt-1">
                  {product.sku ? (
                    <code className="rounded bg-muted px-2 py-1 text-sm">
                      {product.sku}
                    </code>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Category
                </div>
                <div className="mt-1 font-medium">{product.category.name}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Description
                </div>
                <div className="mt-1">
                  {product.description || (
                    <span className="text-muted-foreground">
                      No description provided
                    </span>
                  )}
                </div>
              </div>

              {product.notes && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Notes
                  </div>
                  <div className="mt-1 text-sm">{product.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Production */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing & Production
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Base Price
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {formatPrice(product.base_price)}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Estimated Production Hours
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {product.estimated_production_hours
                      ? `${product.estimated_production_hours} hours`
                      : 'Not specified'}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Customization
                </div>
                <div className="mt-1">
                  {product.is_customizable ? (
                    <span className="text-green-600">
                      ✓ Can be customized per order
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Standard product only
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specifications */}
          {product.specifications && product.specifications.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {product.specifications.map((spec) => (
                    <div key={spec.id}>
                      <div className="text-sm font-medium text-muted-foreground">
                        {spec.spec_key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </div>
                      <div className="mt-1 font-medium">
                        {spec.spec_value}
                        {spec.spec_unit && (
                          <span className="ml-1 text-sm text-muted-foreground">
                            {spec.spec_unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bill of Materials */}
          {product.materials && product.materials.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Bill of Materials (BOM)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.materials.map((bom) => (
                    <div
                      key={bom.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{bom.material.name}</div>
                        {bom.notes && (
                          <div className="text-sm text-muted-foreground">
                            {bom.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {bom.quantity_required} {bom.unit}
                        </div>
                        {bom.waste_factor > 0 && (
                          <div className="text-xs text-muted-foreground">
                            +{bom.waste_factor}% waste
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
