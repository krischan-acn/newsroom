// src/lib/taxonomy.ts
//
// Canonical vocabulary for the two-level classification: SECTOR > INDUSTRY.
//
// WHY THIS FILE EXISTS
// ────────────────────
// The master list in lib/sectors.ts carries the field names the old database
// used, and they sit one level off from what the business actually calls them:
//
//     sector_type   is really the SECTOR    — "Industrial", "Technology"   (9)
//     sector_name   is really the INDUSTRY  — "Construct Engineering"     (76)
//
// The UI already speaks the right language: the nav has a Sector menu listing
// the 9, and an Industry menu listing the 76. Only the data layer is misnamed.
// This module puts the correct names on the existing data so new code can be
// written the right way round, and old code can move over one call site at a
// time.
//
// NON-DESTRUCTIVE BY CONSTRUCTION
// ───────────────────────────────
// Everything here is DERIVED from SECTORS at module load — no data is copied,
// so the two cannot drift. Nothing in this file rewires an existing call site.
// Deleting it cannot change how the app behaves. The ordered steps to adopt it
// live in docs/taxonomy-migration.md.
//
// It also fixes a matching problem that the raw list cannot: the API spells
// some industries with a comma ("Construct, Engineering") where the master list
// uses a space ("Construct Engineering"). resolveIndustry() bridges that. See
// taxonomyKey() below.

import { SECTORS } from './sectors';

/**
 * Internal sector key (from the old `sector_type`) → the label shown in the UI.
 *
 * Keys must match the sector values in lib/sectors.ts exactly. A key that
 * matches nothing is silently inert, which is how "CryptoCurrency" (capital C)
 * went unnoticed in lib/filter-data.ts and services/search.ts — see the dev
 * guard at the bottom of this file.
 */
export const SECTOR_LABELS: Readonly<Record<string, string>> = {
  Financial: 'Finance',
  Medicine: 'Healthcare',
  Sustainability: 'Environment',
  // `Industrial` deliberately has no entry and shows as "Industrial".
  //
  // It used to display as "Industry", which became ambiguous once the child
  // level was named industry — the Industry menu lists 76 industries, one of
  // which sat under a sector also labelled "Industry". Decided 2026-08-27.
  // This also matches config/categories.ts, which already titled the row
  // "Industrial".
  //
  // Any sector with no entry here displays under its own name.
};

export function sectorLabel(sector: string): string {
  return SECTOR_LABELS[sector] ?? sector;
}

/**
 * Labels this codebase used to emit in `?sec=`, still accepted on the way in so
 * existing links and bookmarks keep resolving. Display never uses these.
 */
const LEGACY_SECTOR_ALIASES: Readonly<Record<string, string>> = {
  Industry: 'Industrial',
};

/** One industry — the leaf level. Was a row of `Sector` in lib/sectors.ts. */
export interface Industry {
  /** Stable id from the master list. */
  id: number;
  /** Canonical industry name. Was `sector_name`. */
  industry: string;
  /** Parent sector, internal key. Was `sector_type`. */
  sector: string;
  /** Parent sector as shown in the UI. */
  sectorLabel: string;
  names: {
    en: string;
    ja: string | null;
    zhHans: string | null;
    zhHant: string | null;
    ko: string | null;
  };
}

/** One sector — the parent level, with its industries. */
export interface Sector {
  /** Internal key, e.g. "Industrial". */
  sector: string;
  /** UI label, e.g. "Industry". */
  label: string;
  industries: Industry[];
}

export const INDUSTRIES: readonly Industry[] = SECTORS.map((row) => ({
  id: row.id,
  industry: row.sector_name,
  sector: row.sector_type,
  sectorLabel: sectorLabel(row.sector_type),
  names: {
    en: row.name_en,
    ja: row.name_ja,
    zhHans: row.name_zh_hans,
    zhHant: row.name_zh_hant,
    ko: row.name_ko,
  },
}));

export const SECTOR_LIST: readonly Sector[] = (() => {
  const order: string[] = [];
  const byKey = new Map<string, Industry[]>();

  for (const industry of INDUSTRIES) {
    const existing = byKey.get(industry.sector);
    if (existing) existing.push(industry);
    else {
      byKey.set(industry.sector, [industry]);
      order.push(industry.sector);
    }
  }

  return order.map((sector) => ({
    sector,
    label: sectorLabel(sector),
    industries: byKey.get(sector) ?? [],
  }));
})();

/** Internal sector keys, in master-list order. */
export const SECTOR_KEYS: readonly string[] = SECTOR_LIST.map((s) => s.sector);

/**
 * Comparison key for any taxonomy value, from either side of the wire.
 *
 * The API and the master list disagree on punctuation for eleven industries —
 * "Construct, Engineering" vs "Construct Engineering", "Energy, Alternatives"
 * vs "Energy Alternatives", and so on. Treating a comma as a space, dropping
 * full stops and folding case reconciles every one of them (verified against
 * the article corpus: 59 of 59 previously unmatched assignments resolve, none
 * left over).
 *
 * Use this for matching only — never for display.
 */
export function taxonomyKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const INDUSTRY_BY_KEY = new Map<string, Industry>();
for (const industry of INDUSTRIES) {
  // First spelling wins, so the master list stays authoritative if two
  // industries ever normalise to the same key.
  const key = taxonomyKey(industry.industry);
  if (!INDUSTRY_BY_KEY.has(key)) INDUSTRY_BY_KEY.set(key, industry);
}

const SECTOR_BY_KEY = new Map<string, Sector>();
for (const sector of SECTOR_LIST) {
  SECTOR_BY_KEY.set(taxonomyKey(sector.sector), sector);
  SECTOR_BY_KEY.set(taxonomyKey(sector.label), sector);
}
for (const [alias, sector] of Object.entries(LEGACY_SECTOR_ALIASES)) {
  const target = SECTOR_BY_KEY.get(taxonomyKey(sector));
  if (target) SECTOR_BY_KEY.set(taxonomyKey(alias), target);
}

/**
 * Any spelling of an industry → the canonical record. Punctuation and case
 * insensitive, so it accepts what the API sends as well as what the master
 * list stores.
 */
export function resolveIndustry(value: string | null | undefined): Industry | undefined {
  if (!value) return undefined;
  return INDUSTRY_BY_KEY.get(taxonomyKey(value));
}

/**
 * Any spelling of a sector → the canonical record. Accepts the internal key
 * ("Financial"), the UI label ("Finance"), or an industry name, so a single
 * `?sec=` value can be resolved without the caller knowing which level it is.
 */
export function resolveSector(value: string | null | undefined): Sector | undefined {
  if (!value) return undefined;
  const direct = SECTOR_BY_KEY.get(taxonomyKey(value));
  if (direct) return direct;

  const industry = resolveIndustry(value);
  return industry ? SECTOR_BY_KEY.get(taxonomyKey(industry.sector)) : undefined;
}

/** True when the value names a sector rather than an industry. */
export function isSectorValue(value: string): boolean {
  return SECTOR_BY_KEY.has(taxonomyKey(value));
}

/**
 * Industry name → its sector's internal key, or '' when unrecognised.
 *
 * The correctly-named replacement for getSectorCategory() in lib/sector-mapper.ts.
 * Same contract, except it also matches the API's comma spellings.
 */
export function sectorOf(industryValue: string | null | undefined): string {
  if (!industryValue) return '';
  const industry = resolveIndustry(industryValue);
  if (industry) return industry.sector;

  const sector = SECTOR_BY_KEY.get(taxonomyKey(industryValue));
  return sector ? sector.sector : '';
}

/**
 * One article's industry tags → its unique sectors.
 *
 * The correctly-named replacement for getArticleCategories() in
 * lib/sector-mapper.ts.
 */
export function sectorsOf(values: string | string[] | null | undefined): string[] {
  if (!values) return [];
  const list = Array.isArray(values) ? values : [values];
  const seen = new Set<string>();

  for (const value of list) {
    const sector = sectorOf(value);
    if (sector) seen.add(sector);
  }

  return [...seen];
}

/** The industries under a sector, addressed by key, label or industry name. */
export function industriesOf(sectorValue: string): readonly Industry[] {
  return resolveSector(sectorValue)?.industries ?? [];
}

/** Free-text search across industry names, sector names and localised names. */
export function searchTaxonomy(query: string): readonly Industry[] {
  const q = query.trim().toLowerCase();
  if (!q) return INDUSTRIES;

  return INDUSTRIES.filter((i) =>
    [i.industry, i.sector, i.sectorLabel, i.names.en].some((field) =>
      field?.toLowerCase().includes(q),
    ),
  );
}

// A label key that matches no sector does nothing at all, so this class of typo
// is invisible until someone notices a filter returning zero rows. That is
// exactly how ?sec=Cryptocurrency came to match nothing. Fail loudly in dev.
if (process.env.NODE_ENV !== 'production') {
  const keys = new Set(SECTOR_KEYS);
  const orphans = Object.keys(SECTOR_LABELS).filter((k) => !keys.has(k));
  if (orphans.length > 0) {
    console.warn(
      `[taxonomy] SECTOR_LABELS keys match no sector in lib/sectors.ts and are inert: ${orphans.join(', ')}`,
    );
  }
}
