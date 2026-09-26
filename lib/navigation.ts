/**
 * Navigation configuration shared between sidebar and header.
 * Add new routes here as features are built out.
 */
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderOpen,
  Receipt,
  TrendingDown,
  FileText,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  UserCog,
  CalendarRange,
  FolderKanban,
  CreditCard,
  Upload,
  FileClock,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
  enabled: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        description: 'Business overview and key metrics',
        enabled: true,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Clients',
        href: '/clients',
        icon: Users,
        description: 'Manage client relationships',
        enabled: true,
      },
      {
        label: 'Projects',
        href: '/projects',
        icon: FolderOpen,
        description: 'Manage projects and track progress',
        enabled: true,
      },
      {
        label: 'Payments',
        href: '/payments',
        icon: Receipt,
        description: 'Track collections and outstanding balances',
        enabled: true,
      },
      {
        label: 'Expenses',
        href: '/expenses',
        icon: TrendingDown,
        description: 'Track expenses and monitor approved totals',
        enabled: true,
      },
      {
        label: 'Suppliers',
        href: '/suppliers',
        icon: Building2,
        description: 'Manage suppliers and contact info',
        enabled: true,
      },
      {
        label: 'Invoices',
        href: '/invoices',
        icon: FileText,
        description: 'Create and track invoices',
        enabled: false,
      },
      {
        label: 'Materials',
        href: '/materials',
        icon: Package,
        description: 'Manage materials and record purchases',
        enabled: true,
      },
    ],
  },
  {
    title: 'Insights',
    items: [
      {
        label: 'Monthly Report',
        href: '/reports/monthly',
        icon: CalendarRange,
        description: 'Monthly input vs output financial summary',
        enabled: true,
      },
      {
        label: 'Project Reports',
        href: '/reports/projects',
        icon: FolderKanban,
        description: 'Per-project financial performance',
        enabled: true,
      },
      {
        label: 'Expense Report',
        href: '/reports/expenses',
        icon: TrendingDown,
        description: 'Detailed expense records with breakdowns',
        enabled: true,
      },
      {
        label: 'Payment Report',
        href: '/reports/payments',
        icon: CreditCard,
        description: 'Detailed payment records with breakdowns',
        enabled: true,
      },
      {
        label: 'Client Report',
        href: '/reports/clients',
        icon: Users,
        description: 'Client overview with project and financial totals',
        enabled: true,
      },
    ],
  },
  {
    title: 'Data',
    items: [
      {
        label: 'Import Data',
        href: '/import',
        icon: Upload,
        description: 'Bulk import records from CSV or Excel files',
        enabled: true,
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Users',
        href: '/admin/users',
        icon: UserCog,
        description: 'Manage user accounts and roles',
        enabled: true,
      },
      {
        label: 'Audit Trail',
        href: '/admin/audit',
        icon: FileClock,
        description: 'View system activity and action history',
        enabled: true,
      },
      {
        label: 'Notifications',
        href: '/notifications',
        icon: Bell,
        description: 'View and manage your notifications',
        enabled: true,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        label: 'Profile',
        href: '/settings/profile',
        icon: Settings,
        description: 'Update your personal information',
        enabled: true,
      },
    ],
  },
];
