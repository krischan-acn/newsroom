import articles from '@/data/prefetched-articles.json';
import { getCountryInfo } from '@/lib/countries';
import { REGION_LEAF_COUNTRIES } from '@/lib/filter-data';
import { sanitizeText } from '@/lib/sanitize';
import { resolveLanguage, type LanguageId } from '@/lib/languages';
import {
  isSectorValue,
  resolveSector,
  sectorLabel,
  sectorsOf,
  taxonomyKey,
} from '@/lib/taxonomy';

// Language filtering compares canonical ids on both sides rather than exact raw
// strings, so a ?lang=zh-Hant query matches articles tagged "Traditional
// Chinese", "zh-Hant" or "zh_TW" alike. The previous hardcoded string list
// missed any spelling it had not been told about.

// Sector/industry resolution now comes from lib/taxonomy.ts, which replaces the
// two hand-maintained label maps that used to live here.
//
// Those maps each spelled the crypto sector 'CryptoCurrency' (capital C in the
// middle) while lib/sectors.ts has 'Cryptocurrency', so ?sec=Cryptocurrency
// mapped to a sector that does not exist and returned nothing.
//
// See docs/taxonomy-migration.md, steps 2 and 3.

export function getSectorDisplayName(sectorType: string): string {
  return sectorLabel(sectorType);
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
  /** Raw upstream spelling; normalised for display by <LanguageTag>. */
  language: string | null;
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
  const selectedLanguageIds = new Set(
    languages
      .map((code) => resolveLanguage(code)?.id)
      .filter((id): id is LanguageId => Boolean(id)),
  );

  const filtered = raw.filter((article) => {
    const matchesQuery =
      !q ||
      article.headline.toLowerCase().includes(qLower) ||
      (article.summary ?? '').toLowerCase().includes(qLower);

    // A ?sec= value is either a sector ("Technology", or its label "Finance")
    // or a single industry ("Construct Engineering"). resolveSector tells the
    // two apart, so one parameter still serves both nav menus.
    //
    // Industry comparison goes through taxonomyKey rather than a string equality
    // check: the article data spells eleven industries with a comma
    // ("Construct, Engineering") where the taxonomy uses a space. The old exact
    // match therefore returned nothing for all of them.
    const matchesSector =
      sectors.length === 0 ||
      sectors.some((s) => {
        if (isSectorValue(s)) {
          const sector = resolveSector(s);
          return sector ? sectorsOf(article.sectors).includes(sector.sector) : false;
        }
        const wanted = taxonomyKey(s);
        return (article.sectors ?? []).some((tag) => taxonomyKey(tag) === wanted);
      });

    const articleLanguageId = resolveLanguage(article.rawLanguage)?.id;
    const matchesLanguage =
      selectedLanguageIds.size === 0 ||
      (articleLanguageId !== undefined && selectedLanguageIds.has(articleLanguageId));

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
      language: a.rawLanguage ?? null,
    })),
    total,
  };
}
