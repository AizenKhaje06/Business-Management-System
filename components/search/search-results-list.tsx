'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  FolderOpen,
  Receipt,
  TrendingDown,
  Truck,
  Package,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/app/actions/search';

const typeIcons: Record<SearchResult['type'], typeof Search> = {
  client: Building2,
  project: FolderOpen,
  payment: Receipt,
  expense: TrendingDown,
  supplier: Truck,
  material: Package,
  document: FileText,
};

const typeLabels: Record<SearchResult['type'], string> = {
  client: 'Clients',
  project: 'Projects',
  payment: 'Payments',
  expense: 'Expenses',
  supplier: 'Suppliers',
  material: 'Materials',
  document: 'Documents',
};

const allTypes: SearchResult['type'][] = [
  'client',
  'project',
  'payment',
  'expense',
  'supplier',
  'material',
  'document',
];

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface SearchResultsListProps {
  results: SearchResult[];
  total: number;
  query: string;
  activeTypes: SearchResult['type'][];
}

export function SearchResultsList({
  results,
  total,
  query,
  activeTypes: initialTypes,
}: SearchResultsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(query);
  const [isPending, startTransition] = useTransition();
  const [selectedTypes, setSelectedTypes] = useState<Set<SearchResult['type']>>(
    new Set(initialTypes)
  );

  function toggleType(type: SearchResult['type']) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);

      const params = new URLSearchParams(searchParams.toString());
      if (next.size === 0 || next.size === allTypes.length) {
        params.delete('type');
      } else {
        params.set('type', Array.from(next).join(','));
      }
      startTransition(() => router.push(`/search?${params.toString()}`));
      return next;
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set('q', searchInput.trim());
    } else {
      params.delete('q');
    }
    startTransition(() => router.push(`/search?${params.toString()}`));
  }

  function clearFilters() {
    setSearchInput('');
    setSelectedTypes(new Set());
    startTransition(() => router.push('/search'));
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search across everything..."
            className="pl-9"
          />
        </form>
        {(selectedTypes.size > 0 || searchInput) && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filter by type:
        </span>
        {allTypes.map((type) => {
          const Icon = typeIcons[type];
          const active = selectedTypes.has(type);
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {typeLabels[type]}
            </button>
          );
        })}
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4 animate-spin" />
          Searching...
        </div>
      )}

      {/* Results */}
      {results.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No results found
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {query
              ? `Try a different search term or adjust your filters.`
              : 'Start typing to search across all your data.'}
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>

          <div className="space-y-6">
            {allTypes.map((type) => {
              const items = grouped[type];
              if (!items || items.length === 0) return null;
              const Icon = typeIcons[type];

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">
                      {typeLabels[type]}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((r) => {
                      const Icon = typeIcons[r.type];
                      return (
                        <Card
                          key={`${r.type}-${r.id}`}
                          className="group flex items-start gap-3 p-3 transition-all hover:shadow-sm hover:border-primary/30"
                        >
                          <a
                            href={r.href}
                            className="flex flex-1 items-start gap-3"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium group-hover:text-primary">
                                  {r.title}
                                </p>
                                {r.badge && (
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      'shrink-0 text-[10px]',
                                      r.badgeColor
                                    )}
                                  >
                                    {r.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {r.subtitle}
                              </p>
                            </div>
                            {r.meta && (
                              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                                {r.meta}
                              </span>
                            )}
                          </a>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
