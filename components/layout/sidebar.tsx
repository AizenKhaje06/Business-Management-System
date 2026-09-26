'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { navSections, type NavItem } from '@/lib/navigation';
import { Badge } from '@/components/ui/badge';

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  const Icon: LucideIcon = item.icon;

  if (!item.enabled) {
    return (
      <div
        className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50"
        title="Coming soon"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        <Badge variant="outline" className="text-[10px] font-normal">
          Soon
        </Badge>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <Badge variant="secondary" className="text-[10px]">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}

export function SidebarContent() {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Boxes className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight">BizManage</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Business Management System
        </p>
        <p className="text-xs text-muted-foreground/60">v0.1.0</p>
      </div>
    </div>
  );
}
