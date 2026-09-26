'use client';

import Link from 'next/link';
import {
  DollarSign,
  Receipt,
  FolderOpen,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type {
  RecentPayment,
  RecentExpense,
  RecentProject,
  RecentActivityEntry,
} from '@/app/actions/dashboard';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const statusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
  void: 'bg-red-100 text-red-700',
  in_progress: 'bg-green-100 text-green-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  quotation: 'bg-blue-100 text-blue-700',
  approved_proj: 'bg-cyan-100 text-cyan-700',
};

function getStatusBadgeClass(status: string): string {
  return statusColors[status] || 'bg-gray-100 text-gray-700';
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface DashboardTablesProps {
  recentPayments: RecentPayment[];
  recentExpenses: RecentExpense[];
  recentProjects: RecentProject[];
  recentActivity: RecentActivityEntry[];
}

export function DashboardTables({
  recentPayments,
  recentExpenses,
  recentProjects,
  recentActivity,
}: DashboardTablesProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Recent Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Recent Payments
          </CardTitle>
          <Link
            href="/payments"
            className="flex items-center text-xs text-primary hover:underline"
          >
            View all
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payments yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p.project_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.client_name} · {formatDate(p.payment_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass(p.status)}
                    >
                      {formatStatus(p.status)}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Recent Expenses
          </CardTitle>
          <Link
            href="/expenses"
            className="flex items-center text-xs text-primary hover:underline"
          >
            View all
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentExpenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No expenses yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentExpenses.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.description || e.category_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.category_name}
                      {e.project_name ? ` · ${e.project_name}` : ''} ·{' '}
                      {formatDate(e.expense_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass(e.status)}
                    >
                      {formatStatus(e.status)}
                    </Badge>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(e.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Recent Projects
          </CardTitle>
          <Link
            href="/projects"
            className="flex items-center text-xs text-primary hover:underline"
          >
            View all
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentProjects.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No projects yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.client_name}
                      {p.project_code ? ` · ${p.project_code}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass(p.status)}
                    >
                      {formatStatus(p.status)}
                    </Badge>
                    {p.budget !== null && (
                      <span className="text-sm font-semibold">
                        {formatCurrency(p.budget)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recent activity
            </p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 border-l-2 border-muted pl-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">
                      {a.action} {a.entity_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.created_at)}
                      {a.user_email ? ` · ${a.user_email}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
