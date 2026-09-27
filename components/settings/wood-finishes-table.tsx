'use client';

import { Paintbrush } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WoodFinish } from '@/types/product-settings';

export function WoodFinishesTable({ finishes }: { finishes: WoodFinish[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Wood Finishes</h3>
        <p className="text-sm text-muted-foreground">
          {finishes.length} finish options configured
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {finishes.map((finish) => (
          <div key={finish.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium">{finish.name}</div>
                {finish.finish_type && (
                  <div className="text-sm text-muted-foreground">
                    {finish.finish_type}
                  </div>
                )}
              </div>
              {finish.is_active ? (
                <Badge variant="secondary">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
            </div>
            {finish.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {finish.description}
              </p>
            )}
            {finish.drying_time && (
              <div className="mt-2 text-xs text-muted-foreground">
                Drying: {finish.drying_time}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <Paintbrush className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-medium">Full Management Coming Soon</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add, edit, and delete finishes will be available soon.
          <br />
          For now, finishes can be added via database migration.
        </p>
      </div>
    </div>
  );
}
