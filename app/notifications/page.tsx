import { redirect } from 'next/navigation';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { getNotifications } from '@/app/actions/notifications';
import { NotificationList } from '@/components/notifications/notification-list';

interface PageProps {
  searchParams: {
    filter?: string;
    page?: string;
  };
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/login');

  const filter = (searchParams.filter as 'all' | 'unread') || 'all';
  const page = parseInt(searchParams.page || '1', 10) || 1;
  const pageSize = 20;

  const data = await getNotifications(filter, page, pageSize);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description="Stay updated on payments, expenses, projects, and more."
        />
        <NotificationList
          notifications={data.notifications}
          total={data.total}
          unreadCount={data.unreadCount}
          page={page}
          pageSize={pageSize}
          filter={filter}
        />
      </div>
    </AppShell>
  );
}
