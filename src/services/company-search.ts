// services/company-search.ts
//
// Company lookup for the header search bar, backed by the static index in
// src/data/company-index.json (built by scripts/build-company-index.mjs).
//
// It is static because the API has no company-name search: /api/Articles/search
// takes a CompanyName parameter and returns 0 rows for every input. See the
// header of the build script for why a snapshot is an acceptable fit here and
// not for articles.
//
// The index is committed empty and is filled by running the script against a
// reachable API host. Everything below degrades to "no results" on an empty
// index rather than throwing.

import companyIndex from '@/data/company-index.json';

const LOGO_BASE = 'https://www.acnnewswire.com/images/company/';

/**
 * The on-disk row. Keys are short because they are repeated 9,439 times, and
 * the optional ones are absent rather than null when empty — both to keep the
 * committed file small. `a` holds only the name variants that DIFFER from `n`.
 */
interface IndexedCompany {
  id: number;
  n: string;
  a?: string[];
  l?: string;
  u?: string;
}

export interface CompanySearchResult {
  id: number;
  name: string;
  /** Localised names that differ from `name`, for display under the result. */
  altNames: string[];
  logoSrc: string | null;
  website: string | null;
}

const INDEX = companyIndex as IndexedCompany[];

/** True while the index has not been generated. */
export function isCompanyIndexEmpty(): boolean {
  return INDEX.length === 0;
}

export function companyIndexSize(): number {
  return INDEX.length;
}

/**
 * Casefolds and strips the punctuation that separates an official name from how
 * anyone actually types it: "Mitsubishi Heavy Industries (MHI)" has to match
 * "mitsubishi heavy industries mhi". Diacritics are folded via NFD so "Anhäuser"
 * matches "anhauser". CJK is left alone — it has no case and no spacing to
 * normalise, and the substring match below already handles it.
 */
function normalise(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function allNames(row: IndexedCompany): string[] {
  return row.a ? [row.n, ...row.a] : [row.n];
}

function toResult(row: IndexedCompany): CompanySearchResult {
  return {
    id: row.id,
    name: row.n,
    altNames: row.a ?? [],
    logoSrc: row.l ? `${LOGO_BASE}${row.l}` : null,
    website: row.u ?? null,
  };
}

/**
 * Ranks a row against a normalised query, or null for no match.
 *
 * Lower is better. The tiers exist because a substring match alone puts
 * "Bank of East Asia" above "ANZ Bank" for the query "bank" purely by accident
 * of string length; an exact or prefix hit is almost always the company the
 * reader meant.
 */
function score(row: IndexedCompany, q: string): number | null {
  let best: number | null = null;

  for (const name of allNames(row)) {
    const n = normalise(name);
    if (!n) continue;

    let tier: number | null = null;
    if (n === q) tier = 0;
    else if (n.startsWith(q)) tier = 1;
    // Word-boundary hit: "asia" should rank on "Bank of East Asia" ahead of a
    // company that merely contains the letters mid-word.
    else if (n.includes(` ${q}`)) tier = 2;
    else if (n.includes(q)) tier = 3;

    if (tier === null) continue;

    // Within a tier, prefer the shorter name — it is the closer match to a
    // query that fits inside both.
    const ranked = tier * 100000 + Math.min(n.length, 9999);
    if (best === null || ranked < best) best = ranked;
  }

  return best;
}

/**
 * Matches across every name variant. Returns a page of results and the true
 * total, so the caller can paginate.
 *
 * A query shorter than two characters is treated as no query: a single letter
 * matches several thousand of the 9,439 rows, which is a slower and less useful
 * answer than none.
 */
export function searchCompanies({
  q,
  page = 1,
  limit = 20,
}: {
  q: string;
  page?: number;
  limit?: number;
}): { companies: CompanySearchResult[]; total: number } {
  const query = normalise(q);
  if (query.length < 2) return { companies: [], total: 0 };

  const matches: { row: IndexedCompany; rank: number }[] = [];
  for (const row of INDEX) {
    const rank = score(row, query);
    if (rank !== null) matches.push({ row, rank });
  }

  matches.sort((a, b) => a.rank - b.rank || a.row.n.localeCompare(b.row.n));

  const start = (page - 1) * limit;
  return {
    companies: matches.slice(start, start + limit).map((m) => toResult(m.row)),
    total: matches.length,
  };
}

/** The index row for one company, used to label a page without an API call. */
export function companyFromIndex(id: number): CompanySearchResult | null {
  const row = INDEX.find((c) => c.id === id);
  return row ? toResult(row) : null;
}
