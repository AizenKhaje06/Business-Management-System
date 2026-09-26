'use client';

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  FolderOpen,
  CheckCircle2,
  Clock,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardKPIs } from '@/app/actions/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendColor?: string;
  iconColor?: string;
  iconBg?: string;
}

function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  trendColor,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: KPICardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          {trend && (
            <span
              className={cn(
                'flex items-center text-xs font-medium',
                trendColor
              )}
            >
              {trend === 'up' ? (
                <ArrowUpRight className="mr-0.5 h-3 w-3" />
              ) : trend === 'down' ? (
                <ArrowDownRight className="mr-0.5 h-3 w-3" />
              ) : null}
            </span>
          )}
        </div>
        <p className="mt-3 text-lg font-bold tracking-tight sm:text-2xl">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

interface KPIGridProps {
  kpis: DashboardKPIs;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function KPIGrid({ kpis }: KPIGridProps) {
  const isNetPositive = kpis.netTotal >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KPICard
        label="Gross Input"
        value={formatCurrency(kpis.grossInput)}
        icon={TrendingUp}
        iconColor="text-green-600"
        iconBg="bg-green-100"
        trend="up"
        trendColor="text-green-600"
      />
      <KPICard
        label="Gross Output"
        value={formatCurrency(kpis.grossOutput)}
        icon={TrendingDown}
        iconColor="text-red-600"
        iconBg="bg-red-100"
        trend="down"
        trendColor="text-red-600"
      />
      <KPICard
        label="Net Total"
        value={formatCurrency(kpis.netTotal)}
        icon={Wallet}
        iconColor={isNetPositive ? 'text-green-600' : 'text-red-600'}
        iconBg={isNetPositive ? 'bg-green-100' : 'bg-red-100'}
        trend={isNetPositive ? 'up' : 'down'}
        trendColor={isNetPositive ? 'text-green-600' : 'text-red-600'}
      />
      <KPICard
        label="Outstanding Receivables"
        value={formatCurrency(kpis.outstandingReceivables)}
        icon={AlertCircle}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
      />
      <KPICard
        label="Active Projects"
        value={String(kpis.activeProjects)}
        icon={FolderOpen}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
      />
      <KPICard
        label="Completed Projects"
        value={String(kpis.completedProjects)}
        icon={CheckCircle2}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-100"
      />
      <KPICard
        label="Pending Payments"
        value={String(kpis.pendingPayments)}
        icon={Clock}
        iconColor="text-orange-600"
        iconBg="bg-orange-100"
      />
      <KPICard
        label="Pending Expenses"
        value={String(kpis.pendingExpenses)}
        icon={Receipt}
        iconColor="text-purple-600"
        iconBg="bg-purple-100"
      />
    </div>
  );
}
