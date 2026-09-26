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
  ExpenseWithRelations,
  ExpenseStatus,
  ExpensePaymentMethod,
} from '@/types/expense';
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
  categories: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  projects: Array<{
    id: string;
    name: string;
    project_code: string | null;
  }>;
}

interface ExpensesTableProps {
  expenses: ExpenseWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  status: ExpenseStatus | 'all';
  method: ExpensePaymentMethod | 'all';
  categoryId: string;
  supplierId: string;
  projectId: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  canCreate: boolean;
  filterOptions: FilterOptions;
  totalAmount: number;
  approvedTotal: number;
}

const statusColors: Record<ExpenseStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  submitted: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  approved: 'bg-green-100 text-green-700 hover:bg-green-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  void: 'bg-zinc-200 text-zinc-600 hover:bg-zinc-200',
};

const statusLabels: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  void: 'Void',
};

const methodLabels: Record<ExpensePaymentMethod, string> = {
  cash: 'Cash',
  bank_deposit: 'Bank Deposit',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  check: 'Check',
  other: 'Other',
};

const sortableColumns = [
  { key: 'expense_code', label: 'Code' },
  { key: 'expense_date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'category', label: 'Category' },
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

export function ExpensesTable({
  expenses,
  total,
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
  canCreate,
  filterOptions,
  totalAmount,
  approvedTotal,
}: ExpensesTableProps) {
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
      router.push(`/expenses?${buildParams(params)}`);
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
    return `/expenses?${buildParams({ page: String(newPage) })}`;
  }

  const hasFilters =
    status !== 'all' ||
    method !== 'all' ||
    categoryId ||
    supplierId ||
    projectId ||
    dateFrom ||
    dateTo ||
    search;

  return (
    <div className="space-y-4">
      {/* Search + New */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search code, invoice, description..."
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
          <Button size="sm" onClick={() => router.push('/expenses/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Expense
          </Button>
        )}
      </div>

      {/* Filters */}
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
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryId || 'all'}
          onValueChange={(v) =>
            updateParams({ categoryId: v === 'all' ? undefined : v, page: '1' })
          }
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Category" />
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

        <Select
          value={supplierId || 'all'}
          onValueChange={(v) =>
            updateParams({ supplierId: v === 'all' ? undefined : v, page: '1' })
          }
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Supplier" />
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

        <Select
          value={projectId || 'all'}
          onValueChange={(v) =>
            updateParams({ projectId: v === 'all' ? undefined : v, page: '1' })
          }
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Project" />
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

        <div className="flex items-center gap-1">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) =>
              updateParams({ dateFrom: e.target.value || undefined, page: '1' })
            }
            className="h-8 w-[130px] text-xs"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) =>
              updateParams({ dateTo: e.target.value || undefined, page: '1' })
            }
            className="h-8 w-[130px] text-xs"
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() =>
              updateParams({
                status: undefined,
                method: undefined,
                categoryId: undefined,
                supplierId: undefined,
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

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} expense{total !== 1 ? 's' : ''}
        </p>
        {total > 0 && (
          <div className="flex gap-4 text-sm">
            <span>
              Total:{' '}
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </span>
            <span>
              Approved:{' '}
              <span className="font-medium text-green-600">
                {formatCurrency(approvedTotal)}
              </span>
            </span>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses found"
          description={
            hasFilters
              ? 'Try adjusting your search or filters.'
              : 'Record your first expense to get started.'
          }
          action={
            canCreate ? (
              <Button size="sm" onClick={() => router.push('/expenses/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Expense
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
                <TableHead>Supplier</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow
                  key={expense.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/expenses/${expense.id}`)}
                >
                  <TableCell>
                    <span className="font-mono text-sm text-muted-foreground">
                      {expense.expense_code}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(expense.expense_date)}
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {formatCurrency(Number(expense.amount))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[expense.status]}
                      variant="outline"
                    >
                      {statusLabels[expense.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.category_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.supplier_name || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {expense.project_name || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {expense.invoice_number || '-'}
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
        basePath="/expenses"
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
