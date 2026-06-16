import articles from '@/data/prefetched-articles.json';
import { getArticleCategories } from '@/lib/sector-mapper';
import { getCountryInfo } from '@/lib/countries';
import { INDUSTRY_HIERARCHY, REGION_LEAF_COUNTRIES } from '@/lib/filter-data';
import { sanitizeText } from '@/lib/sanitize';

const LANGUAGE_CODE_TO_RAW: Record<string, string[]> = {
  en: ['English'],
  ja: ['Japanese'],
  ko: ['Korean'],
  'zh-Hant': ['Traditional Chinese', 'zh-Hant'],
  'zh-Hans': ['Simplified Chinese', 'zh-Hans'],
};

// Sidebar display names → actual sector_type values used by getArticleCategories()
const DISPLAY_TO_TYPE: Record<string, string> = {
  Cryptocurrency: 'CryptoCurrency',
  Finance: 'Financial',
  Healthcare: 'Medicine',
  Industry: 'Industrial',
  Environment: 'Sustainability',
};

// Parent display names in the sidebar hierarchy (e.g. 'Technology', 'Communications')
// Used to distinguish category-level selections from exact subsector selections
const PARENT_SECTOR_IDS = new Set(INDUSTRY_HIERARCHY.map((item) => item.id));

// Sector_type values → sidebar display names (for badges)
const TYPE_TO_DISPLAY: Record<string, string> = {
  CryptoCurrency: 'Cryptocurrency',
  Financial: 'Finance',
  Medicine: 'Healthcare',
  Industrial: 'Industry',
  Sustainability: 'Environment',
};

export function getSectorDisplayName(sectorType: string): string {
  return TYPE_TO_DISPLAY[sectorType] ?? sectorType;
}

interface PrefetchedArticle {
  id: number;
  headline: string;
  dateTime: string;
  thumbImage: string | null;
  bigImage: string | null;
  summary: string;
  companyName: string | null;
  companyLogo: string | null;
  companyId: string | null;
  sectors: string[];
  sectorMappings: Array<{ name: string; type: string }>;
  primarySector: string | null;
  primarySectorType: string | null;
  rawLanguage: string;
  rawSource: string;
  location: string;
}

export interface SearchResult {
  id: number;
  headline: string;
  dateTime: string;
  thumbImage: string | null;
  description: string | null;
  companyName: string;
  companyLogo: string | null;
  sectors: string[];
}

export function searchArticles({
  q,
  sectors,
  languages,
  regions,
  page,
  limit,
}: {
  q: string;
  sectors: string[];
  languages: string[];
  regions: string[];
  page: number;
  limit: number;
}): { articles: SearchResult[]; total: number } {
  const raw = articles as unknown as PrefetchedArticle[];
  const qLower = q.toLowerCase();
  const rawLanguages = languages.flatMap((code) => LANGUAGE_CODE_TO_RAW[code] ?? []);

  const filtered = raw.filter((article) => {
    const matchesQuery =
      !q ||
      article.headline.toLowerCase().includes(qLower) ||
      (article.summary ?? '').toLowerCase().includes(qLower);

    // Parent display names (e.g. ?sec=Technology from nav links) → category-level match.
    // Exact subsector names (e.g. ?sec=Advertising from sidebar) → exact article.sectors match.
    const matchesSector =
      sectors.length === 0 ||
      sectors.some((s) => {
        if (PARENT_SECTOR_IDS.has(s)) {
          const sectorType = DISPLAY_TO_TYPE[s] ?? s;
          return getArticleCategories(article.sectors).includes(sectorType);
        }
        return (article.sectors ?? []).includes(s);
      });

    const matchesLanguage =
      rawLanguages.length === 0 || rawLanguages.includes(article.rawLanguage);

    const articleLocation = article.location ?? '';
    const countryInfo = getCountryInfo(articleLocation);
    const matchesRegion =
      regions.length === 0 ||
      regions.some((reg) => {
        if (reg === articleLocation) return true;                       // exact country
        if (countryInfo) {
          if (reg === countryInfo.continent) return true;               // continent (Asia, Europe…)
          if (reg === countryInfo.region) return true;                  // sub-region (East Asia…)
        }
        const leaves = REGION_LEAF_COUNTRIES[reg];                     // hierarchy expansion
        return leaves ? leaves.includes(articleLocation) : false;
      });

    return matchesQuery && matchesSector && matchesLanguage && matchesRegion;
  });

  const total = filtered.length;
  const start = (page - 1) * limit;

  return {
    articles: filtered.slice(start, start + limit).map((a) => ({
      id: a.id,
      headline: a.headline,
      dateTime: a.dateTime,
      thumbImage: a.thumbImage,
      description: a.summary
        ? sanitizeText(a.summary).slice(0, 200)
        : null,
      companyName: a.companyName ?? '',
      companyLogo: a.companyLogo ?? null,
      sectors: a.sectors ?? [],
    })),
    total,
  };
}
