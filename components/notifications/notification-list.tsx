'use client';

import { useState, useTransition } from 'react';
import {
  Check,
  CheckCheck,
  Trash2,
  DollarSign,
  AlertTriangle,
  Receipt,
  FolderKanban,
  CalendarClock,
  Image as ImageIcon,
  FileUp,
  Info,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/app/actions/notifications';
import type { Notification, NotificationCategory } from '@/types/notification';

const categoryIcons: Record<NotificationCategory, typeof Bell> = {
  payment_received: DollarSign,
  payment_overdue: AlertTriangle,
  expense_submitted: Receipt,
  expense_approved: Check,
  expense_rejected: AlertTriangle,
  project_status_changed: FolderKanban,
  project_deadline_approaching: CalendarClock,
  document_uploaded: FileUp,
  photo_uploaded: ImageIcon,
  system: Info,
};

const categoryColors: Record<NotificationCategory, string> = {
  payment_received: 'bg-emerald-100 text-emerald-600',
  payment_overdue: 'bg-red-100 text-red-600',
  expense_submitted: 'bg-blue-100 text-blue-600',
  expense_approved: 'bg-emerald-100 text-emerald-600',
  expense_rejected: 'bg-red-100 text-red-600',
  project_status_changed: 'bg-amber-100 text-amber-600',
  project_deadline_approaching: 'bg-orange-100 text-orange-600',
  document_uploaded: 'bg-cyan-100 text-cyan-600',
  photo_uploaded: 'bg-violet-100 text-violet-600',
  system: 'bg-zinc-100 text-zinc-600',
};

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface NotificationListProps {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  filter: 'all' | 'unread';
}

export function NotificationList({
  notifications: initialNotifications,
  total,
  unreadCount: initialUnread,
  page,
  pageSize,
  filter,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [isPending, startTransition] = useTransition();

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const deleted = notifications.find((n) => n.id === id);
      if (deleted && !deleted.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    });
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs defaultValue={filter}>
          <TabsList>
            <TabsTrigger
              value="all"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('filter');
                window.location.href = url.toString();
              }}
            >
              All ({total})
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('filter', 'unread');
                window.location.href = url.toString();
              }}
            >
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {filter === 'unread'
              ? 'No unread notifications'
              : 'No notifications yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Notifications about payments, expenses, and projects will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = categoryIcons[n.category] || Info;
            const colorClass =
              categoryColors[n.category] || categoryColors.system;

            return (
              <Card
                key={n.id}
                className={cn(
                  'group flex items-start gap-4 p-4 transition-all hover:shadow-sm',
                  !n.is_read && 'border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/20'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    colorClass
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {n.message}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(n.created_at)}
                    </span>
                    <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!n.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={isPending}
                          onClick={() => handleMarkRead(n.id)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Mark read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        disabled={isPending}
                        onClick={() => handleDelete(n.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('page', String(page - 1));
                  window.location.href = url.toString();
                }}
              >
                Previous
              </Button>
            )}
            {page < totalPages && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('page', String(page + 1));
                  window.location.href = url.toString();
                }}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
