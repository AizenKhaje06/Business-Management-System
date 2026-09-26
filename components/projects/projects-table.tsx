'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, ArrowUpDown, Loader2, FolderOpen, X } from 'lucide-react';
import type { Project, ProjectStatus } from '@/types/project';
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

interface ProjectsTableProps {
  projects: (Project & {
    client_name: string;
    client_code: string | null;
  })[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  status: ProjectStatus | 'all';
  sortBy: string;
  sortDir: 'asc' | 'desc';
  canCreate: boolean;
}

const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  quotation: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  approved: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
  in_progress: 'bg-green-100 text-green-700 hover:bg-green-100',
  on_hold: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  completed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Draft',
  quotation: 'Quotation',
  approved: 'Approved',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const sortableColumns = [
  { key: 'project_code', label: 'Code' },
  { key: 'name', label: 'Project Name' },
  { key: 'status', label: 'Status' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'end_date', label: 'Target Date' },
  { key: 'budget', label: 'Contract Amount' },
];

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProjectsTable({
  projects,
  total,
  page,
  pageSize,
  search,
  status,
  sortBy,
  sortDir,
  canCreate,
}: ProjectsTableProps) {
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
      router.push(`/projects?${buildParams(params)}`);
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
    return `/projects?${buildParams({ page: String(newPage) })}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <Select
            value={status}
            onValueChange={(v) =>
              updateParams({
                status: v === 'all' ? undefined : v,
                page: '1',
              })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
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

          {canCreate && (
            <Button size="sm" onClick={() => router.push('/projects/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
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
        {total} project{total !== 1 ? 's' : ''} total
      </p>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects found"
          description={
            search || status !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Create your first project to get started.'
          }
          action={
            canCreate ? (
              <Button size="sm" onClick={() => router.push('/projects/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
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
                <TableHead>Client</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <TableCell>
                    <span className="text-sm font-mono text-muted-foreground">
                      {project.project_code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{project.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[project.status]}
                      variant="outline"
                    >
                      {statusLabels[project.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(project.start_date)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(project.end_date)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatCurrency(project.budget)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{project.client_name}</span>
                      {project.client_code && (
                        <span className="text-xs text-muted-foreground">
                          {project.client_code}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="relative h-2 w-16 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {project.progress || 0}%
                      </span>
                    </div>
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
        basePath="/projects"
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
