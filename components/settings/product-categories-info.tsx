'use client';

import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProductCategory } from '@/types/production';

export function ProductCategoriesInfo({
  categories,
}: {
  categories: ProductCategory[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Product Categories</h3>
        <p className="text-sm text-muted-foreground">
          {categories.length} categories for organizing products
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <div key={category.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium">{category.name}</div>
              </div>
              {category.is_active && <Badge variant="secondary">Active</Badge>}
            </div>
            {category.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {category.description}
              </p>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              Order: {category.display_order}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-medium">Product Categories</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Product categories (Doors, Components, Stair, etc.) are pre-configured in the database.
          <br />
          These categories organize your wood furniture products.
        </p>
      </div>
    </div>
  );
}
