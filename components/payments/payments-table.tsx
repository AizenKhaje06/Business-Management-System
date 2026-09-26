'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  ArrowUpDown,
  Loader2,
  Receipt,
  CalendarIcon,
} from 'lucide-react';
import type {
  PaymentWithRelations,
  PaymentStatus,
  PaymentMethod,
} from '@/types/payment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { PaginationNav } from '@/components/ui/pagination-nav';

interface FilterOptions {
  clients: Array<{ id: string; name: string; client_code: string | null }>;
  projects: Array<{
    id: string;
    name: string;
    project_code: string | null;
    client_id: string;
  }>;
}

interface PaymentsTableProps {
  payments: PaymentWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  status: PaymentStatus | 'all';
  method: PaymentMethod | 'all';
  clientId: string;
  projectId: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  canCreate: boolean;
  filterOptions: FilterOptions;
  totalAmount: number;
}

const statusColors: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  approved: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  posted: 'bg-green-100 text-green-700 hover:bg-green-100',
  partial: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const statusLabels: Record<PaymentStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  posted: 'Posted',
  partial: 'Partial',
  cancelled: 'Cancelled',
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_deposit: 'Bank Deposit',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  check: 'Check',
  other: 'Other',
};

const sortableColumns = [
  { key: 'payment_code', label: 'Code' },
  { key: 'payment_date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'payment_method', label: 'Method' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PaymentsTable({
  payments,
  total,
  page,
  pageSize,
  search,
  status,
  method,
  clientId,
  projectId,
  dateFrom,
  dateTo,
  sortBy,
  sortDir,
  canCreate,
  filterOptions,
  totalAmount,
}: PaymentsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / pageSize);

  function buildParams(extra: Record<string, string | undefined>): string {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    return next.toString();
  }

  function updateParams(params: Record<string, string | undefined>) {
    startTransition(() => {
      router.push(`/payments?${buildParams(params)}`);
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: searchInput, page: '1' });
  }

  function handleSort(column: string) {
    const newDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: column, sortDir: newDir, page: '1' });
  }

  function buildPageURL(newPage: number): string {
    return `/payments?${buildParams({ page: String(newPage) })}`;
  }

  return (
    <div className="space-y-4">
      {/* Search bar + New button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search code, reference..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
        {canCreate && (
          <Button size="sm" onClick={() => router.push('/payments/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Payment
          </Button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={status}
          onValueChange={(v) =>
            updateParams({ status: v === 'all' ? undefined : v, page: '1' })
          }
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={method}
          onValueChange={(v) =>
            updateParams({ method: v === 'all' ? undefined : v, page: '1' })
          }
        >
          <SelectTrigger className="h-8 w-[145px] text-xs">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank_deposit">Bank Deposit</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="gcash">GCash</SelectItem>
            <SelectItem value="maya">Maya</SelectItem>
            <SelectItem value="check">Check</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={clientId || 'all'}
          onValueChange={(v) =>
            updateParams({
              clientId: v === 'all' ? undefined : v,
              projectId: undefined,
              page: '1',
            })
          }
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {filterOptions.clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={projectId || 'all'}
          onValueChange={(v) =>
            updateParams({
              projectId: v === 'all' ? undefined : v,
              page: '1',
            })
          }
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {filterOptions.projects
              .filter((p) => !clientId || p.client_id === clientId)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="flex items-center gap-1">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) =>
              updateParams({ dateFrom: e.target.value || undefined, page: '1' })
            }
            className="h-8 w-[130px] text-xs"
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) =>
              updateParams({ dateTo: e.target.value || undefined, page: '1' })
            }
            className="h-8 w-[130px] text-xs"
            placeholder="To"
          />
        </div>

        {/* Clear filters */}
        {(status !== 'all' ||
          method !== 'all' ||
          clientId ||
          projectId ||
          dateFrom ||
          dateTo ||
          search) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() =>
              updateParams({
                status: undefined,
                method: undefined,
                clientId: undefined,
                projectId: undefined,
                dateFrom: undefined,
                dateTo: undefined,
                search: undefined,
                page: '1',
              })
            }
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} payment{total !== 1 ? 's' : ''}
        </p>
        {total > 0 && (
          <p className="text-sm font-medium">
            Total:{' '}
            <span className="text-green-600">
              {formatCurrency(totalAmount)}
            </span>
          </p>
        )}
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payments found"
          description={
            search ||
            status !== 'all' ||
            method !== 'all' ||
            clientId ||
            projectId ||
            dateFrom ||
            dateTo
              ? 'Try adjusting your search or filters.'
              : 'Record your first payment to get started.'
          }
          action={
            canCreate ? (
              <Button size="sm" onClick={() => router.push('/payments/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Payment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {sortableColumns.map((col) => (
                  <TableHead key={col.key}>
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.label}
                      <ArrowUpDown
                        className={`h-3 w-3 ${
                          sortBy === col.key
                            ? 'text-foreground'
                            : 'text-muted-foreground/50'
                        }`}
                      />
                    </button>
                  </TableHead>
                ))}
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/payments/${payment.id}`)}
                >
                  <TableCell>
                    <span className="font-mono text-sm text-muted-foreground">
                      {payment.payment_code}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(payment.payment_date)}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-green-600">
                    {formatCurrency(Number(payment.amount))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[payment.status]}
                      variant="outline"
                    >
                      {statusLabels[payment.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.payment_method
                      ? methodLabels[payment.payment_method]
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{payment.project_name}</span>
                      {payment.project_code && (
                        <span className="text-xs text-muted-foreground">
                          {payment.project_code}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{payment.client_name}</span>
                      {payment.client_code && (
                        <span className="text-xs text-muted-foreground">
                          {payment.client_code}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.reference_number || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationNav
        currentPage={page}
        totalPages={totalPages}
        basePath="/payments"
        queryParams={Object.fromEntries(searchParams.entries())}
      />

      {isPending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      )}
    </div>
  );
}
