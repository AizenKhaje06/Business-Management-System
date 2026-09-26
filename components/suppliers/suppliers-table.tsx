'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, ArrowUpDown, Loader2, Building2, X } from 'lucide-react';
import type { Supplier } from '@/types/supplier';
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

interface SuppliersTableProps {
  suppliers: Supplier[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  isActive: boolean | 'all';
  sortBy: string;
  sortDir: 'asc' | 'desc';
  canCreate: boolean;
}

const sortableColumns = [
  { key: 'supplier_code', label: 'Code' },
  { key: 'name', label: 'Supplier Name' },
  { key: 'contact_person', label: 'Contact' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

export function SuppliersTable({
  suppliers,
  total,
  page,
  pageSize,
  search,
  isActive,
  sortBy,
  sortDir,
  canCreate,
}: SuppliersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.ceil(total / pageSize);

  function buildParams(extra: Record<string, string | undefined>): string {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    return next.toString();
  }

  function updateParams(params: Record<string, string | undefined>) {
    startTransition(() => {
      router.push(`/suppliers?${buildParams(params)}`);
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
    return `/suppliers?${buildParams({ page: String(newPage) })}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
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
          <Select
            value={
              isActive === 'all' ? 'all' : isActive ? 'active' : 'inactive'
            }
            onValueChange={(v) =>
              updateParams({
                isActive: v === 'all' ? undefined : v,
                page: '1',
              })
            }
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {canCreate && (
            <Button size="sm" onClick={() => router.push('/suppliers/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Supplier
            </Button>
          )}
        </div>
      </div>

      {(search || isActive !== 'all') && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={isPending}
            onClick={() => {
              setSearchInput('');
              updateParams({ search: undefined, isActive: undefined, page: '1' });
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear filters
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {total} supplier{total !== 1 ? 's' : ''}
      </p>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No suppliers found"
          description={
            search || isActive !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Add your first supplier to get started.'
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
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/suppliers/${s.id}`)}
                >
                  <TableCell>
                    <span className="font-mono text-sm text-muted-foreground">
                      {s.supplier_code}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.contact_person || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.email || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.phone || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        s.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
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
        basePath="/suppliers"
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
