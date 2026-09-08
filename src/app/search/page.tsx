import type { Metadata } from 'next';
import { searchCompanies } from '@/services/company-search';
import { fetchArticlesByIndustry } from '@/services/news-list';
import { sectorOf, sectorLabel } from '@/lib/taxonomy';
import { SearchSidebar } from '@/components/search/SearchSidebar';
import { SearchResults } from '@/components/search/SearchResults';
import { CompanyResults } from '@/components/search/CompanyResults';
import type { SearchResult } from '@/services/search';
import { generateListingMetadata } from '@/lib/metadata';

// /search has two modes, and which one runs is decided by the query string:
//
//   ?q=<name>          company lookup, against the static index in
//                      src/data/company-index.json
//   ?sec=<sector>      live sector browse, against /api/Articles/by-industry
//
// The keyword article search this page used to run is gone. It read the static
// src/data/prefetched-articles.json snapshot, which stays on disk as a secondary
// path (services/search.ts still exports searchArticles), but the search bar now
// answers "which company is this" rather than "which headline mentions this" —
// the flow being search a company, reach its page, read its releases.
//
// Sector browse is live rather than snapshot-backed because by-industry works
// and paginates. Language and region facets do not survive the move: the
// endpoint has no language parameter, and no endpoint exposes a country per
// article since the legacy host went 503. v1 is sector filtering only.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Articles per page in sector browse. by-industry 400s above 100. */
const SECTOR_PAGE_SIZE = 20;

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const q = ((params.q as string | undefined) ?? '').trim();
  return generateListingMetadata('search', q || undefined);
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const q = ((params.q as string | undefined) ?? '').trim();
  const page = Math.max(1, parseInt((params.page as string | undefined) ?? '1', 10));
  const limit = Math.max(1, parseInt((params.limit as string | undefined) ?? '20', 10));

  // Sectors: new ?sec= param, fallback to legacy ?sector= (comma-separated)
  const sectors = params.sec
    ? toArray(params.sec)
    : (params.sector as string | undefined)
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

  // Languages: new ?lang= param, fallback to legacy ?language= (comma-separated)
  const languages = params.lang
    ? toArray(params.lang)
    : (params.language as string | undefined)
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

  // Regions: new ?reg= param only. Read so the sidebar keeps its checked state,
  // but not applied — see the note at the top about country data.
  const regions = toArray(params.reg);

  // A query beats a sector filter: someone who typed a name is looking for that
  // company, not for whatever facet was left checked from a previous search.
  const isCompanyMode = q.length > 0;

  const { companies, total: companyTotal } = isCompanyMode
    ? searchCompanies({ q, page, limit })
    : { companies: [], total: 0 };

  // The mega-menu links per industry (76 values) but by-industry only accepts
  // the nine sector types, so every incoming value is resolved to its parent
  // sector. sectorOf() passes a sector key through unchanged and returns '' for
  // anything it does not recognise, which is then skipped rather than sent.
  const sectorKeys = isCompanyMode
    ? []
    : [...new Set(sectors.map(sectorOf).filter(Boolean))];

  const sectorArticles: SearchResult[] = [];
  if (sectorKeys.length > 0) {
    const batches = await Promise.all(
      sectorKeys.map((key) => fetchArticlesByIndustry(key, SECTOR_PAGE_SIZE, page)),
    );

    // Deduped across sectors: an article tagged under two of the selected
    // sectors comes back in both batches and would otherwise render twice.
    const seen = new Set<number>();
    for (const batch of batches) {
      for (const item of batch) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        sectorArticles.push({
          id: item.id,
          headline: item.headline,
          dateTime: item.dateTime,
          thumbImage: item.thumbImage,
          description: item.description,
          companyName: item.companyName,
          companyLogo: item.logoSrc,
          sectors: item.sector ? [item.sector] : [],
          // by-industry carries no language field, so no tag is rendered rather
          // than one being guessed.
          language: null,
        });
      }
    }
  }

  // The endpoint reports no total, so pagination is driven by whether the page
  // came back full: a short page is the last one. Claiming a total we do not
  // have would print a number that is simply wrong.
  const sectorTotal =
    sectorArticles.length < SECTOR_PAGE_SIZE * sectorKeys.length
      ? (page - 1) * SECTOR_PAGE_SIZE + sectorArticles.length
      : page * SECTOR_PAGE_SIZE + 1;

  const heading = isCompanyMode
    ? `Companies matching “${q}”`
    : sectorKeys.length > 0
      ? sectorKeys.map(sectorLabel).join(', ')
      : 'Search for a company';

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl tracking-tight text-black mb-8">{heading}</h1>

      {isCompanyMode ? (
        // No facet rail in company mode: sector, language and region are article
        // facets and none of them filter a company list.
        <CompanyResults
          results={companies}
          totalResults={companyTotal}
          query={q}
          currentPage={page}
          limit={limit}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[2.5fr_7.5fr] gap-8">
          <aside>
            <SearchSidebar
              activeSectors={sectors}
              activeLanguages={languages}
              activeRegions={regions}
              currentQ={q}
              currentLimit={(params.limit as string | undefined) ?? ''}
            />
          </aside>
          <main>
            <SearchResults
              results={sectorArticles}
              totalResults={sectorTotal}
              query=""
              currentPage={page}
              limit={SECTOR_PAGE_SIZE}
            />
          </main>
        </div>
      )}
    </div>
  );
}
