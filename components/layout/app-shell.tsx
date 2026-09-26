'use client';

import { AuthProvider } from '@/components/providers/auth-provider';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

/**
 * App shell — sidebar + header + main content area.
 * Wraps content in AuthProvider for client-side session state.
 * Responsive: sidebar collapses to a slide-out drawer on mobile.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-8 lg:pb-8">{children}</main>
          <MobileBottomNav />
        </div>
      </div>
    </AuthProvider>
  );
}
