'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, ArrowUpDown, Loader2, Building2, X } from 'lucide-react';
import type { Client, ClientStatus } from '@/types/client';
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

interface ClientsTableProps {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  status: ClientStatus | 'all';
  sortBy: string;
  sortDir: 'asc' | 'desc';
  canCreate: boolean;
}

const statusColors: Record<ClientStatus, string> = {
  active: 'bg-green-100 text-green-800 hover:bg-green-100',
  inactive: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  archived: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
};

const sortableColumns = [
  { key: 'name', label: 'Client Name' },
  { key: 'client_code', label: 'Code' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
];

export function ClientsTable({
  clients,
  total,
  page,
  pageSize,
  search,
  status,
  sortBy,
  sortDir,
  canCreate,
}: ClientsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / pageSize);

  function updateParams(params: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`/clients?${next.toString()}`);
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

  function handlePageChange(newPage: number) {
    updateParams({ page: String(newPage) });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <Select
            value={status}
            onValueChange={(v) =>
              updateParams({ status: v === 'all' ? undefined : v, page: '1' })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {canCreate && (
            <Button size="sm" onClick={() => router.push('/clients/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Client
            </Button>
          )}
        </div>
      </div>

      {(search || status !== 'all') && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={isPending}
            onClick={() => {
              setSearchInput('');
              updateParams({ search: undefined, status: undefined, page: '1' });
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear filters
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {total} client{total !== 1 ? 's' : ''} total
      </p>

      {clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients found"
          description={
            search || status !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Create your first client to get started.'
          }
          action={
            canCreate ? (
              <Button size="sm" onClick={() => router.push('/clients/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Client
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
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {client.client_code}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {client.client_code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[client.status]}
                      variant="outline"
                    >
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(client.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {client.contact_person || '-'}
                      </span>
                      {client.company_name && (
                        <span className="text-xs text-muted-foreground">
                          {client.company_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.phone || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.email || '-'}
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
        basePath="/clients"
        queryParams={{
          search: search || undefined,
          status: status !== 'all' ? status : undefined,
          sortBy,
          sortDir,
        }}
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
