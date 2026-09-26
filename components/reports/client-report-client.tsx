'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ArrowUpDown,
  Loader2,
  Filter,
  Users,
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
import type { ClientReportRow } from '@/app/actions/reports';

interface ClientReportClientProps {
  rows: ClientReportRow[];
  total: number;
  totalContract: number;
  totalPayments: number;
  totalOutstanding: number;
  page: number;
  pageSize: number;
  search: string;
  status: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  canView: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-700',
  blacklisted: 'bg-rose-100 text-rose-700',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blacklisted: 'Blacklisted',
};

const sortableColumns = [
  { key: 'name', label: 'Client' },
  { key: 'client_code', label: 'Code' },
  { key: 'status', label: 'Status' },
  { key: 'city', label: 'City' },
];

const clientExportColumns: ExportColumn[] = [
  { header: 'Client Code', key: 'client_code', align: 'left' },
  { header: 'Name', key: 'name', align: 'left' },
  { header: 'Company', key: 'company_name', align: 'left' },
  { header: 'Email', key: 'email', align: 'left' },
  { header: 'Phone', key: 'phone', align: 'left' },
  { header: 'City', key: 'city', align: 'left' },
  { header: 'Status', key: 'status', align: 'left' },
  { header: 'Total Projects', key: 'total_projects', align: 'right' },
  { header: 'Active Projects', key: 'active_projects', align: 'right' },
  { header: 'Total Contract', key: 'total_contract', align: 'right', format: 'currency' },
  { header: 'Total Payments', key: 'total_payments', align: 'right', format: 'currency' },
  { header: 'Outstanding', key: 'outstanding', align: 'right', format: 'currency' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ClientReportClient({
  rows,
  total,
  totalContract,
  totalPayments,
  totalOutstanding,
  page,
  pageSize,
  search,
  status,
  city,
  dateFrom,
  dateTo,
  sortBy,
  sortDir,
  canView,
}: ClientReportClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  const pageTotals = useMemo(
    () => ({
      contract: rows.reduce((s, r) => s + r.total_contract, 0),
      payments: rows.reduce((s, r) => s + r.total_payments, 0),
      outstanding: rows.reduce((s, r) => s + r.outstanding, 0),
    }),
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
      router.push(`/reports/clients?${buildParams(params)}`);
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
    return `/reports/clients?${buildParams({ page: String(newPage) })}`;
  }

  if (!canView) {
    return (
      <EmptyState
        title="Access Denied"
        description="You do not have permission to view reports."
      />
    );
  }

  const hasActiveFilters = status !== 'all' || city || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(totalContract)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">
              {formatCurrency(totalPayments)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-amber-600">
              {formatCurrency(totalOutstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

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
                    placeholder="Search clients..."
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
                  columns={clientExportColumns}
                  rows={rows as unknown as Record<string, unknown>[]}
                  meta={{
                    title: 'Client Report',
                    filters: [
                      ...(search ? [{ label: 'Search', value: search }] : []),
                      ...(status !== 'all' ? [{ label: 'Status', value: statusLabels[status] || status }] : []),
                      ...(city ? [{ label: 'City', value: city }] : []),
                      ...(dateFrom ? [{ label: 'Date From', value: dateFrom }] : []),
                      ...(dateTo ? [{ label: 'Date To', value: dateTo }] : []),
                    ],
                    totals: [
                      { label: 'Total Contract', value: formatCurrency(totalContract) },
                      { label: 'Total Payments', value: formatCurrency(totalPayments) },
                      { label: 'Total Outstanding', value: formatCurrency(totalOutstanding) },
                    ],
                  }}
                  fileName="client-report"
                />
              </div>
            </div>

            {showFilters && (
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input
                    placeholder="Filter by city..."
                    value={city}
                    onChange={(e) =>
                      updateParams({ city: e.target.value || undefined, page: '1' })
                    }
                  />
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
                          status: undefined,
                          city: undefined,
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
          icon={Users}
          title="No clients found"
          description={
            search || hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'No clients match the current criteria.'
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
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Contract</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/clients/${row.id}`)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {row.client_code || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.client_code || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[row.status] || ''}
                        variant="outline"
                      >
                        {statusLabels[row.status] || row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.city || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.company_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        {row.email && <span>{row.email}</span>}
                        {row.phone && (
                          <span className="text-xs text-muted-foreground">
                            {row.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.total_projects}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.active_projects}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(row.total_contract)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">
                      {formatCurrency(row.total_payments)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">
                      {formatCurrency(row.outstanding)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell colSpan={5}>Totals (page)</TableCell>
                  <TableCell colSpan={2}></TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(pageTotals.contract)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    {formatCurrency(pageTotals.payments)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600">
                    {formatCurrency(pageTotals.outstanding)}
                  </TableCell>
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
