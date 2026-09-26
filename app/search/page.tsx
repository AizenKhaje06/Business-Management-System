import { redirect } from 'next/navigation';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { globalSearch } from '@/app/actions/search';
import { SearchResultsList } from '@/components/search/search-results-list';
import type { SearchResult } from '@/app/actions/search';

interface PageProps {
  searchParams: {
    q?: string;
    type?: string;
    page?: string;
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/login');

  const query = searchParams.q || '';
  const types = searchParams.type
    ? (searchParams.type.split(',').filter(Boolean) as SearchResult['type'][])
    : undefined;
  const page = parseInt(searchParams.page || '1', 10) || 1;
  const limit = 50;

  const { results, total } = query.trim().length >= 2
    ? await globalSearch(query, { types, limit })
    : { results: [] as SearchResult[], total: 0 };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Search"
          description="Search across clients, projects, payments, expenses, suppliers, materials, and documents."
        />
        <SearchResultsList
          results={results}
          total={total}
          query={query}
          activeTypes={types ?? []}
        />
      </div>
    </AppShell>
  );
}
