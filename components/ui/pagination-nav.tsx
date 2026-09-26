import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface PaginationNavProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  queryParams: Record<string, string | undefined>;
  maxVisible?: number;
}

export function PaginationNav({
  currentPage,
  totalPages,
  basePath,
  queryParams,
  maxVisible = 5,
}: PaginationNavProps) {
  if (totalPages <= 1) return null;

  function buildHref(page: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== '') {
        params.set(key, value);
      }
    }
    params.set('page', String(page));
    return `${basePath}?${params.toString()}`;
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  const pages: number[] = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  const showStartEllipsis = start > 1;
  const showEndEllipsis = end < totalPages;

  return (
    <Pagination>
      <PaginationContent>
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious href={buildHref(currentPage - 1)} />
          </PaginationItem>
        )}
        {showStartEllipsis && (
          <>
            <PaginationItem>
              <PaginationLink href={buildHref(1)}>1</PaginationLink>
            </PaginationItem>
            {start > 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
          </>
        )}
        {pages.map((pageNum) => (
          <PaginationItem key={pageNum}>
            <PaginationLink
              href={buildHref(pageNum)}
              isActive={currentPage === pageNum}
            >
              {pageNum}
            </PaginationLink>
          </PaginationItem>
        ))}
        {showEndEllipsis && (
          <>
            {end < totalPages - 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationLink href={buildHref(totalPages)}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}
        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext href={buildHref(currentPage + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
