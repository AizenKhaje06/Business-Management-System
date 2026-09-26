'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  FileClock,
  Download,
  Upload,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Archive,
  KeyRound,
  Shield,
  Eye,
  FileDown,
  FileInput,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/lib/audit-constants';
import type { AuditLogRow, AuditUserOption } from '@/types/audit';

const actionIcons: Record<string, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  archive: Archive,
  login: LogIn,
  logout: LogOut,
  password_reset: KeyRound,
  approve: Check,
  reject: X,
  upload: Upload,
  download: Download,
  export: FileDown,
  import: FileInput,
  role_change: Shield,
  activate: Check,
  deactivate: X,
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700 hover:bg-green-100',
  update: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  delete: 'bg-red-100 text-red-700 hover:bg-red-100',
  archive: 'bg-zinc-200 text-zinc-600 hover:bg-zinc-200',
  login: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  logout: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  password_reset: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  approve: 'bg-green-100 text-green-700 hover:bg-green-100',
  reject: 'bg-red-100 text-red-700 hover:bg-red-100',
  upload: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  download: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
  export: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
  import: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
  role_change: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  activate: 'bg-green-100 text-green-700 hover:bg-green-100',
  deactivate: 'bg-red-100 text-red-700 hover:bg-red-100',
};

function formatActionLabel(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatEntityType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncateValues(
  values: Record<string, unknown> | null,
  maxLen = 80
): string {
  if (!values) return '';
  const str = JSON.stringify(values);
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

export interface AuditLogTableProps {
  logs: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  userId: string;
  action: string;
  entityType: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  users: AuditUserOption[];
}

export function AuditLogTable({
  logs,
  total,
  page,
  pageSize,
  search,
  userId,
  action,
  entityType,
  dateFrom,
  dateTo,
  sortBy,
  sortDir,
  users,
}: AuditLogTableProps) {
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
      router.push(`/admin/audit?${buildParams(params)}`);
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
    return `/admin/audit?${buildParams({ page: String(newPage) })}`;
  }

  const hasFilters =
    action !== 'all' ||
    entityType !== 'all' ||
    userId ||
    dateFrom ||
    dateTo ||
    search;

  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead
      className={sortBy === column ? 'cursor-pointer select-none' : 'cursor-pointer select-none opacity-60'}
      onClick={() => handleSort(column)}
    >
      {label}
      {sortBy === column && (
        <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search entity name or type..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={action}
          onValueChange={(v) =>
            updateParams({ action: v === 'all' ? undefined : v, page: '1' })
          }
        >
          <SelectTrigger className="h-8 w-[145px] text-xs">
            <Filter className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {AUDIT_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {formatActionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={entityType}
          onValueChange={(v) =>
            updateParams({ entityType: v === 'all' ? undefined : v, page: '1' })
          }
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {AUDIT_ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {formatEntityType(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={userId || 'all'}
          onValueChange={(v) =>
            updateParams({ userId: v === 'all' ? undefined : v, page: '1' })
          }
        >
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <UserIcon className="mr-1 h-3 w-3" />
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
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
                action: undefined,
                entityType: undefined,
                userId: undefined,
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
          {total} audit {total !== 1 ? 'entries' : 'entry'}
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={FileClock}
          title="No audit entries found"
          description={
            hasFilters
              ? 'Try adjusting your filters to see more results.'
              : 'System activity will appear here as users interact with the system.'
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader column="created_at" label="Timestamp" />
                <SortHeader column="user_id" label="User" />
                <SortHeader column="action" label="Action" />
                <SortHeader column="entity_type" label="Entity" />
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const Icon = actionIcons[log.action] || Eye;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {log.user_name || log.user_email || 'System'}
                        </span>
                        {log.user_name && log.user_email && (
                          <span className="text-xs text-muted-foreground">
                            {log.user_email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`gap-1 ${actionColors[log.action] || ''}`}
                      >
                        <Icon className="h-3 w-3" />
                        {formatActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span>{formatEntityType(log.entity_type)}</span>
                        {log.entity_name && (
                          <span className="text-xs text-muted-foreground">
                            {log.entity_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-muted-foreground">
                      <div className="space-y-1">
                        {log.new_values && (
                          <div>
                            <span className="font-medium text-green-700">
                              New:
                            </span>{' '}
                            {truncateValues(log.new_values)}
                          </div>
                        )}
                        {log.old_values && (
                          <div>
                            <span className="font-medium text-amber-700">
                              Old:
                            </span>{' '}
                            {truncateValues(log.old_values)}
                          </div>
                        )}
                        {!log.new_values && !log.old_values && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => router.push(buildPageURL(page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isPending}
              onClick={() => router.push(buildPageURL(page + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
