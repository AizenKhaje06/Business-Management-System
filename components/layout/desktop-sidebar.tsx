import { SidebarContent } from '@/components/layout/sidebar';

/**
 * Fixed desktop sidebar — visible on lg+ screens.
 * The mobile version is rendered via MobileSidebar in the Header.
 */
export function DesktopSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
      <SidebarContent />
    </aside>
  );
}
