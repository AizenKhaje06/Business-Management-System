'use client';

import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WoodType } from '@/types/product-settings';

export function WoodTypesTable({ woodTypes }: { woodTypes: WoodType[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Wood Types</h3>
        <p className="text-sm text-muted-foreground">
          {woodTypes.length} wood species configured
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {woodTypes.map((wood) => (
          <div key={wood.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium">{wood.name}</div>
                {wood.color && (
                  <div className="text-sm text-muted-foreground">{wood.color}</div>
                )}
              </div>
              {wood.is_active ? (
                <Badge variant="secondary">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
            </div>
            {wood.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {wood.description}
              </p>
            )}
            {wood.hardness_rating && (
              <div className="mt-2 text-xs text-muted-foreground">
                Hardness: {wood.hardness_rating} (Janka)
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-medium">Full Management Coming Soon</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add, edit, and delete wood types will be available soon.
          <br />
          For now, wood types can be added via database migration.
        </p>
      </div>
    </div>
  );
}
