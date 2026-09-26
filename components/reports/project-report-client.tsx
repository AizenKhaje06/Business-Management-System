'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ArrowUpDown,
  Loader2,
  FolderOpen,
  Filter,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import type { ProjectStatus } from '@/types/project';
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
import type {
  ProjectReportRow,
  ProjectReportData,
} from '@/app/actions/reports';

interface ProjectReportClientProps {
  data: ProjectReportData;
  filterOptions: {
    clients: Array<{ id: string; name: string; client_code: string | null }>;
    projects: Array<{ id: string; name: string; project_code: string | null }>;
    staff: Array<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
    }>;
  };
  page: number;
  pageSize: number;
  search: string;
  status: string;
  clientId: string;
  projectId: string;
  dateFrom: string;
  dateTo: string;
  managerId: string;
  staffId: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  canView: boolean;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  quotation: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  approved: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
  in_progress: 'bg-green-100 text-green-700 hover:bg-green-100',
  on_hold: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  completed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  quotation: 'Quotation',
  approved: 'Approved',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const sortableColumns = [
  { key: 'project_code', label: 'Project' },
  { key: 'budget', label: 'Contract' },
  { key: 'status', label: 'Status' },
  { key: 'start_date', label: 'Start Date' },
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

const projectExportColumns: ExportColumn[] = [
  { header: 'Project Code', key: 'project_code', align: 'left' },
  { header: 'Project Name', key: 'name', align: 'left' },
  { header: 'Client', key: 'client_name', align: 'left' },
  { header: 'Contract Amount', key: 'contract_amount', align: 'right', format: 'currency' },
  { header: 'Total Payments', key: 'total_payments', align: 'right', format: 'currency' },
  { header: 'Outstanding', key: 'outstanding', align: 'right', format: 'currency' },
  { header: 'Total Cost', key: 'total_cost', align: 'right', format: 'currency' },
  { header: 'Project Difference', key: 'project_difference', align: 'right', format: 'currency' },
  { header: 'Status', key: 'status', align: 'left' },
];

export function ProjectReportClient({
  data,
  filterOptions,
  page,
  pageSize,
  search,
  status,
  clientId,
  projectId,
  dateFrom,
  dateTo,
  managerId,
  staffId,
  sortBy,
  sortDir,
  canView,
}: ProjectReportClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  const { rows, total } = data;
  const totalPages = Math.ceil(total / pageSize);

  const summary = useMemo(() => {
    const totalContract = rows.reduce((s, r) => s + r.contract_amount, 0);
    const totalPayments = rows.reduce((s, r) => s + r.total_payments, 0);
    const totalCost = rows.reduce((s, r) => s + r.total_cost, 0);
    const totalDifference = rows.reduce((s, r) => s + r.project_difference, 0);
    return { totalContract, totalPayments, totalCost, totalDifference };
  }, [rows]);

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
      router.push(`/reports/projects?${buildParams(params)}`);
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
    return `/reports/projects?${buildParams({ page: String(newPage) })}`;
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
    clientId || projectId || status !== 'all' || dateFrom || dateTo || managerId || staffId;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contract
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrency(summary.totalContract)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrency(summary.totalPayments)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrency(summary.totalCost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Difference
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-bold tabular-nums ${
                summary.totalDifference >= 0
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {formatCurrency(summary.totalDifference)}
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
                    placeholder="Search projects..."
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
                  columns={projectExportColumns}
                  rows={rows as unknown as Record<string, unknown>[]}
                  meta={{
                    title: 'Project Report',
                    filters: [
                      ...(search ? [{ label: 'Search', value: search }] : []),
                      ...(status !== 'all' ? [{ label: 'Status', value: statusLabels[status] || status }] : []),
                      ...(clientId ? [{ label: 'Client', value: filterOptions.clients.find((c) => c.id === clientId)?.name || clientId }] : []),
                      ...(projectId ? [{ label: 'Project', value: filterOptions.projects.find((p) => p.id === projectId)?.name || projectId }] : []),
                      ...(dateFrom ? [{ label: 'Date From', value: dateFrom }] : []),
                      ...(dateTo ? [{ label: 'Date To', value: dateTo }] : []),
                    ],
                    totals: [
                      { label: 'Total Contract', value: formatCurrency(summary.totalContract) },
                      { label: 'Total Payments', value: formatCurrency(summary.totalPayments) },
                      { label: 'Total Cost', value: formatCurrency(summary.totalCost) },
                      { label: 'Total Difference', value: formatCurrency(summary.totalDifference) },
                    ],
                  }}
                  fileName="project-report"
                />
              </div>
            </div>

            {showFilters && (
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Client</Label>
                  <Select
                    value={clientId || 'all'}
                    onValueChange={(v) =>
                      updateParams({
                        clientId: v === 'all' ? undefined : v,
                        page: '1',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All clients" />
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
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Project</Label>
                  <Select
                    value={projectId || 'all'}
                    onValueChange={(v) =>
                      updateParams({
                        projectId: v === 'all' ? undefined : v,
                        page: '1',
                      })
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
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) =>
                      updateParams({
                        status: v === 'all' ? undefined : v,
                        page: '1',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="quotation">Quotation</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Manager</Label>
                  <Select
                    value={managerId || 'all'}
                    onValueChange={(v) =>
                      updateParams({
                        managerId: v === 'all' ? undefined : v,
                        page: '1',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All managers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Managers</SelectItem>
                      {filterOptions.staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name || s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Staff</Label>
                  <Select
                    value={staffId || 'all'}
                    onValueChange={(v) =>
                      updateParams({
                        staffId: v === 'all' ? undefined : v,
                        page: '1',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {filterOptions.staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name || s.email}
                        </SelectItem>
                      ))}
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
                          clientId: undefined,
                          projectId: undefined,
                          status: undefined,
                          dateFrom: undefined,
                          dateTo: undefined,
                          managerId: undefined,
                          staffId: undefined,
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
      <p className="text-sm text-muted-foreground">
        {total} project{total !== 1 ? 's' : ''} total
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects found"
          description={
            search || hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'No projects match the current criteria.'
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
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Contract Amount</TableHead>
                  <TableHead className="text-right">Total Payments</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/projects/${row.id}`)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {row.project_code || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.contract_amount)}
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
                      {formatDate(row.start_date)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{row.client_name}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(row.contract_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">
                      {formatCurrency(row.total_payments)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">
                      {formatCurrency(row.outstanding)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-rose-600">
                      {formatCurrency(row.total_cost)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        row.project_difference >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(row.project_difference)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell colSpan={5}>Totals (page)</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(summary.totalContract)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(summary.totalPayments)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">-</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(summary.totalCost)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      summary.totalDifference >= 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(summary.totalDifference)}
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
