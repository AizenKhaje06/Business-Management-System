'use client';

import { FolderTree } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MaterialCategory } from '@/types/product-settings';

export function MaterialCategoriesTable({
  categories,
}: {
  categories: MaterialCategory[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Material Categories</h3>
        <p className="text-sm text-muted-foreground">
          {categories.length} categories configured for materials inventory
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <div key={category.id} className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              {category.icon && (
                <div className="text-2xl">{category.icon}</div>
              )}
              <div className="flex-1">
                <div className="font-medium">{category.name}</div>
                {category.is_active ? (
                  <Badge variant="secondary" className="mt-1">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-1">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
            {category.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {category.description}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <FolderTree className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-medium">Full Management Coming Soon</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add, edit, and delete categories will be available soon.
          <br />
          For now, categories can be added via database migration.
        </p>
      </div>
    </div>
  );
}
