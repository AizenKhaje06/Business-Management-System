'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarIcon, X, Filter } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export interface FilterOption {
  id: string;
  name: string;
  client_id?: string;
}

export interface FinancialFilterConfig {
  route: string;
  statusOptions?: { value: string; label: string }[];
  methodOptions?: { value: string; label: string }[];
  categoryOptions?: FilterOption[];
  clientOptions?: FilterOption[];
  projectOptions?: FilterOption[];
  supplierOptions?: FilterOption[];
  showDateRange?: boolean;
  showAmountRange?: boolean;
}

interface FinancialFilterBarProps {
  config: FinancialFilterConfig;
  currentFilters: {
    status?: string;
    method?: string;
    categoryId?: string;
    clientId?: string;
    projectId?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    amountMin?: string;
    amountMax?: string;
    search?: string;
  };
}

export function FinancialFilterBar({
  config,
  currentFilters,
}: FinancialFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(params: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    startTransition(() => {
      router.push(`/${config.route}?${next.toString()}`);
    });
  }

  function clearAllFilters() {
    const next = new URLSearchParams(searchParams.toString());
    const filterKeys = [
      'status', 'method', 'categoryId', 'clientId', 'projectId',
      'supplierId', 'dateFrom', 'dateTo', 'amountMin', 'amountMax', 'search',
    ];
    filterKeys.forEach((k) => next.delete(k));
    next.delete('page');
    startTransition(() => {
      router.push(`/${config.route}?${next.toString()}`);
    });
  }

  const activeFilterCount = [
    currentFilters.status && currentFilters.status !== 'all',
    currentFilters.method && currentFilters.method !== 'all',
    currentFilters.categoryId,
    currentFilters.clientId,
    currentFilters.projectId,
    currentFilters.supplierId,
    currentFilters.dateFrom,
    currentFilters.dateTo,
    currentFilters.amountMin,
    currentFilters.amountMax,
    currentFilters.search,
  ].filter(Boolean).length;

  const filteredProjects = config.projectOptions
    ? currentFilters.clientId
      ? config.projectOptions.filter(
          (p) => !p.client_id || p.client_id === currentFilters.clientId
        )
      : config.projectOptions
    : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter */}
        {config.statusOptions && (
          <Select
            value={currentFilters.status || 'all'}
            onValueChange={(v) =>
              updateParams({ status: v === 'all' ? undefined : v, page: '1' })
            }
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {config.statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Method filter */}
        {config.methodOptions && (
          <Select
            value={currentFilters.method || 'all'}
            onValueChange={(v) =>
              updateParams({ method: v === 'all' ? undefined : v, page: '1' })
            }
          >
            <SelectTrigger className="h-8 w-[145px] text-xs">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {config.methodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Category filter */}
        {config.categoryOptions && (
          <Select
            value={currentFilters.categoryId || 'all'}
            onValueChange={(v) =>
              updateParams({ categoryId: v === 'all' ? undefined : v, page: '1' })
            }
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {config.categoryOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Client filter */}
        {config.clientOptions && (
          <Select
            value={currentFilters.clientId || 'all'}
            onValueChange={(v) =>
              updateParams({
                clientId: v === 'all' ? undefined : v,
                projectId: undefined,
                page: '1',
              })
            }
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {config.clientOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Project filter (client-filtered) */}
        {config.projectOptions && (
          <Select
            value={currentFilters.projectId || 'all'}
            onValueChange={(v) =>
              updateParams({ projectId: v === 'all' ? undefined : v, page: '1' })
            }
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {filteredProjects.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Supplier filter */}
        {config.supplierOptions && (
          <Select
            value={currentFilters.supplierId || 'all'}
            onValueChange={(v) =>
              updateParams({ supplierId: v === 'all' ? undefined : v, page: '1' })
            }
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {config.supplierOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date range */}
        {config.showDateRange && (
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={currentFilters.dateFrom || ''}
              onChange={(e) =>
                updateParams({ dateFrom: e.target.value || undefined, page: '1' })
              }
              className="h-8 w-[130px] text-xs"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={currentFilters.dateTo || ''}
              onChange={(e) =>
                updateParams({ dateTo: e.target.value || undefined, page: '1' })
              }
              className="h-8 w-[130px] text-xs"
            />
          </div>
        )}

        {/* Amount range */}
        {config.showAmountRange && (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="Min $"
              value={currentFilters.amountMin || ''}
              onChange={(e) =>
                updateParams({ amountMin: e.target.value || undefined, page: '1' })
              }
              className="h-8 w-[90px] text-xs"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="number"
              placeholder="Max $"
              value={currentFilters.amountMax || ''}
              onChange={(e) =>
                updateParams({ amountMax: e.target.value || undefined, page: '1' })
              }
              className="h-8 w-[90px] text-xs"
            />
          </div>
        )}

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={isPending}
            onClick={clearAllFilters}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear filters
            {activeFilterCount > 1 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}

        {isPending && (
          <span className="text-xs text-muted-foreground">Updating...</span>
        )}
      </div>
    </div>
  );
}
