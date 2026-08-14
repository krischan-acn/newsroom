// services/company-articles.ts
import type { NewApiArticle } from './acn-api.types';
import { sanitizeText, sanitizeHeadline } from '@/lib/sanitize';

const NEW_API_BASE = 'https://development.acnnewswire.com';
const PHOTOS_BASE = 'https://photos.acnnewswire.com/';

// The company feed comes from the legacy API. The current API's company
// endpoint — /api/Articles/by-company/{id} — returns HTTP 500 for every id
// ("The required column 'Sectors' was not present in the results of a 'FromSql'
// operation"), and /api/Articles?Cid= filters by *country*, not company, so it
// silently returns other companies' releases. This endpoint paginates properly
// and is the only source that can serve a full archive today.
// Switch COMPANY_FEED back to the new API once by-company is fixed.
const LEGACY_API_BASE = 'https://www.acnnewswire.com/acnnewswireapi';

const REVALIDATE = 3600;

/** The legacy endpoint rejects pageSize outside this range. */
const MAX_PAGE_SIZE = 100;

export interface CompanyArticle {
  id: number;
  headline: string;
  dateTime: string;
  thumbImage: string | null;
  description: string | null;
  // The list endpoints do not return a language field, so this is only
  // populated on paths that have one — today that means search results.
  // Rows without it simply render no tag.
  language?: string | null;
}

export interface CompanyArticlePage {
  articles: CompanyArticle[];
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface LegacyCompanyNews {
  articleId: number;
  headline: string;
  summary: string | null;
  /** e.g. "Thursday, 06 August 2026 14:00" — not ISO. */
  dateTime: string;
  views: string | null;
  photo: { thumbImage: string | null; bigImage: string | null; caption: string | null }[] | null;
  companyLogo: string | null;
}

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
};

/**
 * The legacy feed formats dates as "Thursday, 06 August 2026 14:00". Normalising
 * to ISO here keeps every consumer (formatDateTime, JSON-LD, <time datetime>)
 * on one shape. Anything unparseable is passed through untouched — formatDateTime
 * falls back to printing the raw string rather than showing a broken date.
 */
export function legacyDateToIso(raw: string | null | undefined): string {
  if (!raw) return '';
  const match = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return raw;

  const [, day, monthName, year, hour = '00', minute = '00'] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) return raw;

  return `${year}-${month}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00`;
}

function mapLegacyArticle(row: LegacyCompanyNews): CompanyArticle {
  // bigImage is already an absolute URL on this endpoint, unlike the new API
  // where it is a bare filename.
  const image = row.photo?.[0]?.bigImage ?? null;

  return {
    id: row.articleId,
    headline: sanitizeHeadline(row.headline),
    dateTime: legacyDateToIso(row.dateTime),
    thumbImage: image
      ? (/^https?:\/\//i.test(image) ? image : `${PHOTOS_BASE}${image}`)
      : null,
    description: sanitizeText(row.summary) || null,
  };
}

function mapNewApiArticle(a: NewApiArticle): CompanyArticle {
  const bigImage = a.images?.[0]?.bigImage;
  return {
    id: a.articleId,
    headline: sanitizeHeadline(a.headline),
    dateTime: a.publishDate,
    thumbImage: bigImage ? `${PHOTOS_BASE}${bigImage}` : null,
    description: sanitizeText(a.summary) || null,
  };
}

async function fetchLegacyPage(
  compId: number,
  page: number,
  pageSize: number,
): Promise<LegacyCompanyNews[]> {
  try {
    const res = await fetch(
      `${LEGACY_API_BASE}/api/v1/Company/GetNewsByCompanyId/${compId}?pageNumber=${page}&pageSize=${pageSize}`,
      { next: { revalidate: REVALIDATE } },
    );
    // A company past its last page (or with no releases at all) answers 404.
    if (!res.ok) return [];
    const raw = await res.json();
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
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
  };

  if (!Number.isFinite(id) || id <= 0) return empty;

  const [rows, nextRows] = await Promise.all([
    fetchLegacyPage(id, safePage, safeSize),
    fetchLegacyPage(id, safePage + 1, 1),
  ]);

  return {
    articles: rows.map(mapLegacyArticle),
    page: safePage,
    pageSize: safeSize,
    hasNext: nextRows.length > 0,
    hasPrevious: safePage > 1,
  };
}

/**
 * The handful of related releases shown under an article. Reads from the same
 * legacy feed as the company page, falling back to the new API's by-company
 * endpoint so this starts returning richer rows the moment that is repaired.
 */
export async function fetchCompanyArticles(
  compId: string | undefined | null,
  limit = 5,
): Promise<CompanyArticle[]> {
  if (!compId) return [];

  const id = Number(compId);
  if (!Number.isFinite(id) || id <= 0) return [];

  const rows = await fetchLegacyPage(id, 1, limit);
  if (rows.length > 0) return rows.map(mapLegacyArticle);

  try {
    const res = await fetch(`${NEW_API_BASE}/api/Articles/by-company/${id}`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return [];
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];
    return (raw as NewApiArticle[]).slice(0, limit).map(mapNewApiArticle);
  } catch {
    return [];
  }
}
