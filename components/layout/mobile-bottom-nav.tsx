'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Receipt,
  TrendingDown,
  MoreHorizontal,
  Users,
  Building2,
  Package,
  CalendarRange,
  Bell,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';

const primaryNav = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Payments', href: '/payments', icon: Receipt },
  { label: 'Expenses', href: '/expenses', icon: TrendingDown },
];

const secondaryNav = [
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Suppliers', href: '/suppliers', icon: Building2 },
  { label: 'Materials', href: '/materials', icon: Package },
  { label: 'Monthly Report', href: '/reports/monthly', icon: CalendarRange },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Profile', href: '/settings/profile', icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Mobile navigation"
      >
        {primaryNav.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'fill-primary/10')} />
              <span>{label}</span>
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
            moreOpen
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="More navigation"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <SheetTitle className="sr-only">More navigation</SheetTitle>
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <h2 className="text-base font-semibold">More</h2>
            <button
              onClick={() => setMoreOpen(false)}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 px-4 pb-6">
            {secondaryNav.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
                    active
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-center text-xs font-medium leading-tight">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
