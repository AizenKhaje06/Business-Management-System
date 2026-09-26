'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ArrowUpDown,
  Loader2,
  Filter,
  TrendingDown,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TableFooter,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportButtons } from '@/components/reports/export-buttons';
import type { ExportColumn } from '@/lib/export-utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { ExpenseReportRow, ReportFilterOptions } from '@/app/actions/reports';

interface ExpenseReportClientProps {
  rows: ExpenseReportRow[];
  total: number;
  totalAmount: number;
  filterOptions: ReportFilterOptions;
  page: number;
  pageSize: number;
  search: string;
  status: string;
  method: string;
  categoryId: string;
  supplierId: string;
  projectId: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  canView: boolean;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  void: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  void: 'Void',
};

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  bank_deposit: 'Bank Deposit',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  check: 'Check',
  other: 'Other',
};

const sortableColumns = [
  { key: 'expense_date', label: 'Date' },
  { key: 'expense_code', label: 'Code' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const expenseExportColumns: ExportColumn[] = [
  { header: 'Date', key: 'expense_date', align: 'left', format: 'date' },
  { header: 'Code', key: 'expense_code', align: 'left' },
  { header: 'Project', key: 'project_name', align: 'left' },
  { header: 'Supplier', key: 'supplier_name', align: 'left' },
  { header: 'Category', key: 'category_name', align: 'left' },
  { header: 'Description', key: 'description', align: 'left' },
  { header: 'Amount', key: 'amount', align: 'right', format: 'currency' },
  { header: 'Payment Method', key: 'payment_method', align: 'left' },
  { header: 'Status', key: 'status', align: 'left' },
];

export function ExpenseReportClient({
  rows,
  total,
  totalAmount,
  filterOptions,
  page,
  pageSize,
  search,
  status,
  method,
  categoryId,
  supplierId,
  projectId,
  dateFrom,
  dateTo,
  sortBy,
  sortDir,
  canView,
}: ExpenseReportClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  const pageTotal = useMemo(
    () => rows.reduce((s, r) => s + r.amount, 0),
    [rows]
  );

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
      router.push(`/reports/expenses?${buildParams(params)}`);
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
    return `/reports/expenses?${buildParams({ page: String(newPage) })}`;
  }

  if (!canView) {
    return (
      <EmptyState
        title="Access Denied"
        description="You do not have permission to view reports."
      />
    );
  }

  const hasActiveFilters =
    categoryId || supplierId || projectId || status !== 'all' || method !== 'all' || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Expense Amount (filtered)
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-rose-600" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(totalAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {total} expense{total !== 1 ? 's' : ''} matched
          </p>
        </CardContent>
      </Card>

      {/* Search and action bar */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Search
                </Button>
              </form>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters((v) => !v)}
                >
                  <Filter className="mr-1.5 h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-1.5 flex h-2 w-2 rounded-full bg-primary" />
                  )}
                </Button>
                <ExportButtons
                  columns={expenseExportColumns}
                  rows={rows as unknown as Record<string, unknown>[]}
                  meta={{
                    title: 'Expense Report',
                    filters: [
                      ...(search ? [{ label: 'Search', value: search }] : []),
                      ...(status !== 'all' ? [{ label: 'Status', value: statusLabels[status] || status }] : []),
                      ...(method !== 'all' ? [{ label: 'Payment Method', value: methodLabels[method] || method }] : []),
                      ...(projectId ? [{ label: 'Project', value: filterOptions.projects.find((p) => p.id === projectId)?.name || projectId }] : []),
                      ...(supplierId ? [{ label: 'Supplier', value: filterOptions.suppliers.find((s) => s.id === supplierId)?.name || supplierId }] : []),
                      ...(categoryId ? [{ label: 'Category', value: filterOptions.categories.find((c) => c.id === categoryId)?.name || categoryId }] : []),
                      ...(dateFrom ? [{ label: 'Date From', value: dateFrom }] : []),
                      ...(dateTo ? [{ label: 'Date To', value: dateTo }] : []),
                    ],
                    totals: [
                      { label: 'Total Amount', value: formatCurrency(totalAmount) },
                    ],
                  }}
                  fileName="expense-report"
                />
              </div>
            </div>

            {showFilters && (
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Project</Label>
                  <Select
                    value={projectId || 'all'}
                    onValueChange={(v) =>
                      updateParams({ projectId: v === 'all' ? undefined : v, page: '1' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {filterOptions.projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Supplier</Label>
                  <Select
                    value={supplierId || 'all'}
                    onValueChange={(v) =>
                      updateParams({ supplierId: v === 'all' ? undefined : v, page: '1' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {filterOptions.suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select
                    value={categoryId || 'all'}
                    onValueChange={(v) =>
                      updateParams({ categoryId: v === 'all' ? undefined : v, page: '1' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {filterOptions.categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Payment Method</Label>
                  <Select
                    value={method}
                    onValueChange={(v) =>
                      updateParams({ method: v === 'all' ? undefined : v, page: '1' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All methods" />
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
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) =>
                      updateParams({ status: v === 'all' ? undefined : v, page: '1' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="void">Void</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) =>
                      updateParams({ dateFrom: e.target.value || undefined, page: '1' })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) =>
                      updateParams({ dateTo: e.target.value || undefined, page: '1' })
                    }
                  />
                </div>

                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateParams({
                          projectId: undefined,
                          supplierId: undefined,
                          categoryId: undefined,
                          status: undefined,
                          method: undefined,
                          dateFrom: undefined,
                          dateTo: undefined,
                          page: '1',
                        });
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses found"
          description={
            search || hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'No expenses match the current criteria.'
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/expenses/${row.id}`)}
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(row.expense_date)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.expense_code || '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[row.status] || ''}
                        variant="outline"
                      >
                        {statusLabels[row.status] || row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.project_name ? (
                        <div className="flex flex-col">
                          <span>{row.project_name}</span>
                          {row.project_code && (
                            <span className="text-xs text-muted-foreground">
                              {row.project_code}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.supplier_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">{row.category_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {row.description || '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {methodLabels[row.payment_method || ''] || row.payment_method || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[row.status] || ''}
                        variant="outline"
                      >
                        {statusLabels[row.status] || row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell colSpan={8}>Total (page)</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(pageTotal)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {page > 1 && (
              <PaginationItem>
                <PaginationPrevious href={buildPageURL(page - 1)} />
              </PaginationItem>
            )}
            {Array.from(
              { length: Math.min(totalPages, 7) },
              (_, i) => i + 1
            ).map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href={buildPageURL(pageNum)}
                  isActive={page === pageNum}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}
            {page < totalPages && (
              <PaginationItem>
                <PaginationNext href={buildPageURL(page + 1)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}

      {isPending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      )}
    </div>
  );
}
