// services/company-articles.ts
import type { NewApiArticle } from './acn-api.types';
import { sanitizeText, sanitizeHeadline } from '@/lib/sanitize';

const NEW_API_BASE = 'https://development.acnnewswire.com';
const LOGO_BASE = 'https://www.acnnewswire.com/images/company/';
const PHOTOS_BASE = 'https://photos.acnnewswire.com/';

export interface CompanyArticle {
  id: number;
  headline: string;
  dateTime: string;
  thumbImage: string | null;
  description: string | null;
}

export interface CompanyPageData {
  articles: CompanyArticle[];
  companyName: string | null;
  logoSrc: string | null;
}

function mapArticle(a: NewApiArticle): CompanyArticle {
  const bigImage = a.images?.[0]?.bigImage;
  return {
    id: a.articleId,
    headline: sanitizeHeadline(a.headline),
    dateTime: a.publishDate,
    thumbImage: bigImage ? `${PHOTOS_BASE}${bigImage}` : null,
    description: sanitizeText(a.summary) || null,
  };
}

export async function fetchCompanyArticles(
  compId: string | undefined | null,
): Promise<CompanyArticle[]> {
  if (!compId) return [];

  const res = await fetch(
    `${NEW_API_BASE}/api/Articles/by-company/${compId}`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) return [];

  const raw: NewApiArticle[] = await res.json();
  return raw.slice(0, 5).map(mapArticle);
}

export async function fetchAllCompanyArticles(
  compId: string | undefined | null,
): Promise<CompanyPageData> {
  if (!compId) return { articles: [], companyName: null, logoSrc: null };

  const res = await fetch(
    `${NEW_API_BASE}/api/Articles?Cid=${compId}&Page=1&Size=50`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) return { articles: [], companyName: null, logoSrc: null };

  const raw: NewApiArticle[] = await res.json();
  const first = raw[0];
  const firstCompany = first?.companies[0] ?? null;

  return {
    articles: raw.map(mapArticle),
    companyName: firstCompany?.companyName ?? null,
    logoSrc: firstCompany?.logoFileName
      ? `${LOGO_BASE}${firstCompany.logoFileName}`
      : null,
  };
}
