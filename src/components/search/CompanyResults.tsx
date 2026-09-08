// components/search/CompanyResults.tsx
//
// The company-search result list. Takes props only; the lookup happens in
// app/search/page.tsx, per the fetch-in-pages convention.

import Link from 'next/link';
import type { CompanySearchResult } from '@/services/company-search';
import { Pagination } from './Pagination';

interface CompanyResultsProps {
  results: CompanySearchResult[];
  totalResults: number;
  query: string;
  currentPage: number;
  limit: number;
}

function CompanyRow({ company }: { company: CompanySearchResult }) {
  return (
    <Link
      href={`/company/${company.id}`}
      className="flex items-center gap-4 py-4 group"
    >
      {/*
        Raw <img>: www.acnnewswire.com is not in next.config.ts remotePatterns,
        the same constraint the event photos hit. A company with no logo gets the
        initial rather than a broken frame or a layout shift.
      */}
      <span className="flex-shrink-0 w-12 h-12 flex items-center justify-center border border-gray-200 bg-white overflow-hidden">
        {company.logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoSrc}
            alt=""
            className="max-w-full max-h-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-lg text-gray-400">{company.name.charAt(0)}</span>
        )}
      </span>

      <span className="min-w-0">
        <span className="block text-base text-gray-900 group-hover:underline">
          {company.name}
        </span>
        {company.altNames.length > 0 && (
          <span className="block text-sm text-gray-500 truncate">
            {company.altNames.join(' · ')}
          </span>
        )}
      </span>
    </Link>
  );
}

export function CompanyResults({
  results,
  totalResults,
  query,
  currentPage,
  limit,
}: CompanyResultsProps) {
  const totalPages = Math.ceil(totalResults / limit);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        Showing <span className="font-semibold text-gray-700">{results.length}</span> of{' '}
        <span className="font-semibold text-gray-700">{totalResults}</span>{' '}
        compan{totalResults === 1 ? 'y' : 'ies'}
        {query && (
          <>
            {' '}for &ldquo;<span className="font-semibold text-gray-800">{query}</span>&rdquo;
          </>
        )}
      </p>

      {results.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-base">
            No companies found{query ? ` for "${query}"` : ''}.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Search by company name — this looks up companies, not headlines.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-200">
            {results.map((company) => (
              <li key={company.id}>
                <CompanyRow company={company} />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          )}
        </>
      )}
    </div>
  );
}
