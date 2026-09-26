'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Building2,
  FolderOpen,
  Receipt,
  TrendingDown,
  Truck,
  Package,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { searchSuggestions } from '@/app/actions/search';
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
  client: 'Client',
  project: 'Project',
  payment: 'Payment',
  expense: 'Expense',
  supplier: 'Supplier',
  material: 'Material',
  document: 'Document',
};

export function GlobalSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const suggestions = await searchSuggestions(q);
      setResults(suggestions);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debouncedSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && results[focusedIndex]) {
      e.preventDefault();
      setOpen(false);
      router.push(results[focusedIndex].href);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 max-w-md">
      <Popover open={open && (query.trim().length >= 2)} onOpenChange={setOpen}>
        <div className="relative">
          <form onSubmit={handleSubmit}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => query.trim().length >= 2 && setOpen(true)}
              placeholder="Search..."
              className="h-9 pl-9 pr-8"
              aria-label="Global search"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        <PopoverContent
          align="start"
          className="w-[calc(100vw-1.5rem)] max-w-[400px] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollArea className="max-h-[420px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center">
                <Search className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {results.map((r, i) => {
                  const Icon = typeIcons[r.type];
                  return (
                    <Link
                      key={`${r.type}-${r.id}`}
                      href={r.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50',
                        focusedIndex === i && 'bg-muted/50'
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
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
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">
                          {r.meta}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {query.trim().length >= 2 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs"
                onClick={() => {
                  setOpen(false);
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }}
              >
                View all results for &ldquo;{query}&rdquo;
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
