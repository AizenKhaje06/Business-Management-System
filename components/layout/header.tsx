'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { GlobalSearchBar } from '@/components/search/global-search-bar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/providers/auth-provider';
import { logout } from '@/app/actions/auth';
import { useTransition } from 'react';

export function Header() {
  const { user, loading } = useAuth();
  const [isPending, startTransition] = useTransition();

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:gap-3 sm:px-4"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Mobile menu toggle */}
      <MobileSidebar />

      {/* Search */}
      <GlobalSearchBar />

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        <NotificationCenter />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {loading ? '...' : initials}
              </div>
              <span className="sr-only">Account menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Account</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email || 'Loading...'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={isPending}
              onClick={() => startTransition(() => logout())}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
