import { Skeleton } from '@/components/ui/skeleton';
import { AppShell } from '@/components/layout/app-shell';

export default function PaymentsLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="rounded-xl border">
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
