// services/news-list.ts
// Lightweight list-feed fetcher for card rows on the home page.

import type { NewApiArticle } from './acn-api.types';
import { sanitizeText, sanitizeHeadline } from '@/lib/sanitize';

const HOMEPAGE_URL = 'https://development.acnnewswire.com/api/articles/homepage';
const BY_INDUSTRY_URL = 'https://development.acnnewswire.com/api/Articles/by-industry';
const LOGO_BASE = 'https://www.acnnewswire.com/images/company/';
const PHOTOS_BASE = 'https://photos.acnnewswire.com/';

export interface NewsListItem {
  id: number;
  headline: string;
  dateTime: string;
  description: string | null;
  thumbImage: string | null;
  logoSrc: string | null;
  companyName: string;
  companyId: number | null;
  sector: string;
}

function dedupeById(items: NewsListItem[]): NewsListItem[] {
  const seen = new Set<number>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function mapArticle(a: NewApiArticle): NewsListItem {
  const company = a.companies[0] ?? null;
  const logoFilename = company?.logoFilename ?? company?.logoFileName ?? null;
  const bigImage = a.images?.[0]?.bigImage;
  return {
    id: a.articleId,
    headline: sanitizeHeadline(a.headline),
    dateTime: a.publishDate,
    description: sanitizeText(a.summary),
    thumbImage: bigImage ? `${PHOTOS_BASE}${bigImage}` : null,
    // These endpoints return companyId/logoFilename; the single-article endpoint
    // returns companyID/logoFileName. Read both so the logo and the company link
    // survive whichever casing the API hands back.
    logoSrc: logoFilename ? `${LOGO_BASE}${logoFilename}` : null,
    companyName: company?.companyName ?? '',
    companyId: company?.companyId ?? company?.companyID ?? null,
    sector: a.sectorName ?? '',
  };
}

export async function fetchNewsList(page = 1, limit = 20): Promise<NewsListItem[]> {
  const res = await fetch(
    `${HOMEPAGE_URL}?Page=${page}&Size=${limit}`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) return [];

  const raw: NewApiArticle[] = await res.json();
  return dedupeById(raw.map(mapArticle));
}

export async function fetchLatestNews(): Promise<NewsListItem[]> {
  const res = await fetch(HOMEPAGE_URL, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const raw: NewApiArticle[] = await res.json();
  return dedupeById(raw.map(mapArticle));
}

export async function fetchArticlesByIndustry(industry: string, pageSize = 10): Promise<NewsListItem[]> {
  const res = await fetch(
    `${BY_INDUSTRY_URL}?industry=${encodeURIComponent(industry)}&pageNumber=1&pageSize=${pageSize}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return [];
  const raw: NewApiArticle[] = await res.json();
  return dedupeById(raw.map(mapArticle));
}

// Fetches the homepage pool, filters to articles with images, returns up to `n`.
export async function fetchHeroSlides(n = 5): Promise<NewsListItem[]> {
  const res = await fetch(HOMEPAGE_URL, { next: { revalidate: 3600 } });

  if (!res.ok) return [];

  const raw: NewApiArticle[] = await res.json();
  return dedupeById(
    raw.filter(a => !!a.images?.[0]?.bigImage).slice(0, n).map(mapArticle),
  );
}
