// components/company/CompanyPagination.tsx
// Prev/Next rather than numbered pages: the feed endpoint returns no total
// count, so the last page number is unknowable without walking the archive.

import Link from 'next/link';

interface Props {
  basePath: string;
  page: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const BUTTON = 'px-4 py-2 text-sm rounded border transition-colors';
const ENABLED = 'text-gray-700 border-gray-300 hover:bg-gray-50';
const DISABLED = 'text-gray-300 border-gray-200 pointer-events-none';

export function CompanyPagination({ basePath, page, hasNext, hasPrevious }: Props) {
  if (!hasNext && !hasPrevious) return null;

  const hrefFor = (target: number) =>
    target <= 1 ? basePath : `${basePath}?page=${target}`;

  return (
    <nav className="flex items-center justify-between mt-8" aria-label="Press release pages">
      <Link
        href={hasPrevious ? hrefFor(page - 1) : '#'}
        aria-disabled={!hasPrevious}
        tabIndex={hasPrevious ? undefined : -1}
        className={`${BUTTON} ${hasPrevious ? ENABLED : DISABLED}`}
      >
        Previous
      </Link>

      <span className="text-sm text-gray-600">Page {page}</span>

      <Link
        href={hasNext ? hrefFor(page + 1) : '#'}
        aria-disabled={!hasNext}
        tabIndex={hasNext ? undefined : -1}
        className={`${BUTTON} ${hasNext ? ENABLED : DISABLED}`}
      >
        Next
      </Link>
    </nav>
  );
}
