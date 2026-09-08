// services/company-articles.ts
import type { NewApiArticle } from './acn-api.types';
import { sanitizeText, sanitizeHeadline } from '@/lib/sanitize';
import { apiInit } from '@/lib/api-timeout';

const NEW_API_BASE = 'https://development.acnnewswire.com';
const PHOTOS_BASE = 'https://photos.acnnewswire.com/';

// The company feed reads /api/Articles/by-company/{id}. It returned HTTP 500 for
// every id until 2026-09-08 ("The required column 'Sectors' was not present in
// the results of a 'FromSql' operation"), which is why this module used to lead
// with the legacy GetNewsByCompanyId feed. That backend bug is fixed and the
// legacy host has been 503 since 2026-08-27, so the legacy path was removed
// rather than left as a fallback that can only fail.
//
// Verified on the live endpoint: pageNumber/pageSize paginate correctly, and the
// rows carry sectors, bodyHtml and images that the legacy feed never returned.
// Do not use /api/Articles?Cid= as a substitute — that filters by *country*, not
// company, and silently returns other companies' releases.

const REVALIDATE = 3600;

/** The endpoint rejects pageSize outside this range. */
const MAX_PAGE_SIZE = 100;

export interface CompanyArticle {
  id: number;
  headline: string;
  dateTime: string;
  thumbImage: string | null;
  description: string | null;
  // by-company does not return a language field, so this is only populated on
  // paths that have one — today that means search results. Rows without it
  // simply render no tag.
  language?: string | null;
}

export interface CompanyArticlePage {
  articles: CompanyArticle[];
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  /**
   * True when the feed could not be fetched, as opposed to fetching fine and
   * finding nothing. An empty list means "this company has published nothing";
   * this flag means "we do not know", and the page must not claim the former.
   */
  unavailable: boolean;
}

function mapArticle(a: NewApiArticle): CompanyArticle {
  // bigImage is a bare filename on this endpoint, unlike the legacy feed where
  // it arrived absolute.
  const bigImage = a.images?.[0]?.bigImage;
  return {
    id: a.articleId,
    headline: sanitizeHeadline(a.headline),
    dateTime: a.publishDate,
    thumbImage: bigImage ? `${PHOTOS_BASE}${bigImage}` : null,
    description: sanitizeText(a.summary) || null,
  };
}

/**
 * One page of a company's press releases, newest first.
 *
 * A page past the last one answers 404 rather than an empty array, so a
 * non-ok response is treated as "no rows" rather than an error.
 */
async function fetchPage(
  compId: number,
  page: number,
  pageSize: number,
): Promise<{ rows: NewApiArticle[]; unavailable: boolean }> {
  try {
    const res = await fetch(
      `${NEW_API_BASE}/api/Articles/by-company/${compId}?pageNumber=${page}&pageSize=${pageSize}`,
      apiInit({ next: { revalidate: REVALIDATE }, headers: { Accept: 'application/json' } }),
    );
    // 404 is this endpoint's "past the last page", so it is genuinely no rows.
    // Anything else non-ok is the server failing, which is not the same thing.
    if (res.status === 404) return { rows: [], unavailable: false };
    if (!res.ok) return { rows: [], unavailable: true };
    const raw = await res.json();
    return { rows: Array.isArray(raw) ? raw : [], unavailable: false };
  } catch {
    // Network failure or the request deadline.
    return { rows: [], unavailable: true };
  }
}

/**
 * One page of a company's press releases, newest first.
 *
 * The endpoint returns no total count, so "is there a next page" is answered by
 * asking for a single row of the following page. That is one extra cached
 * request per view, and it keeps us from having to walk the whole archive —
 * these companies have well over a thousand releases each.
 */
export async function fetchCompanyArticlesPage(
  compId: string | number | undefined | null,
  page = 1,
  pageSize = 15,
): Promise<CompanyArticlePage> {
  const id = Number(compId);
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize) || 15));

  const empty: CompanyArticlePage = {
    articles: [],
    page: safePage,
    pageSize: safeSize,
    hasNext: false,
    hasPrevious: safePage > 1,
    unavailable: false,
  };

  if (!Number.isFinite(id) || id <= 0) return empty;

  const [current, next] = await Promise.all([
    fetchPage(id, safePage, safeSize),
    fetchPage(id, safePage + 1, 1),
  ]);

  return {
    articles: current.rows.map(mapArticle),
    page: safePage,
    pageSize: safeSize,
    // Only the current page's outcome decides this. The next-page probe failing
    // on its own just means we cannot offer a Next link.
    unavailable: current.unavailable,
    hasNext: next.rows.length > 0,
    hasPrevious: safePage > 1,
  };
}

/** The handful of related releases shown under an article. */
export async function fetchCompanyArticles(
  compId: string | undefined | null,
  limit = 5,
): Promise<CompanyArticle[]> {
  if (!compId) return [];

  const id = Number(compId);
  if (!Number.isFinite(id) || id <= 0) return [];

  // This one is a sidebar extra, so a failure and an empty result are the same
  // thing to the caller: show nothing.
  const { rows } = await fetchPage(id, 1, Math.min(MAX_PAGE_SIZE, Math.max(1, limit)));
  return rows.slice(0, limit).map(mapArticle);
}
