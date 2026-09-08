// services/company-profile.ts
//
// Assembles the company profile shown in the sidebar of /company/[id].
//
// Sources, and why there are still two:
//   /api/Companies/{id}          → name, logo, boilerplate, sectors, tickers, contacts
//   /api/Companies/{id}/details  → socials only
// and then fills whatever is still blank from src/data/company-profiles.ts.
//
// This used to stitch in a third, /api/Articles/search, for tickers and the
// vendor quote codes. That endpoint returns 0 rows for every input including
// unfiltered (verified 2026-09-09), so it could only ever return null while
// costing a request on every company render. It is gone, the same way the dead
// legacy company feed was removed rather than left as a fallback that can only
// fail. `tickers[]` on the company record is the real source and carries the
// company's own listings rather than whichever exchange row happened to be
// attached to an article.
//
// `/details` is kept for one reason: it is the only source of the social links.
// Its established/listed/employees/address/phone/email fields came back blank on
// 10/10 companies sampled — the client does not supply that data — so those are
// read from `contacts[]` and the curated file instead, and are not chased here.

import { sanitizeText } from '@/lib/sanitize';
import { curatedProfileFor, type CuratedCompanyProfile } from '@/data/company-profiles';
import { apiInit } from '@/lib/api-timeout';
import { companyFromIndex } from '@/services/company-search';

const NEW_API_BASE = 'https://development.acnnewswire.com';
const LOGO_BASE = 'https://www.acnnewswire.com/images/company/';

const REVALIDATE = 3600;

/** A listing on `tickers[]`. Present since the 2026-09-08/09 API changes. */
interface ApiTicker {
  exchangeId?: number | string | null;
  exchangeName?: string | null;
  tickerId?: string | null;
  isin?: string | null;
}

/** A row on `contacts[]`. Replaces the always-blank `/details` contact fields. */
interface ApiContact {
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

interface ApiCompany {
  companyId: number;
  /**
   * The detail endpoint was reported returning `companyName` on 2026-09-09,
   * while the schema capture in docs/api-schemas/company.csv — taken 2026-09-07,
   * before the API changed — shows `companyNameEN` populated on the same
   * endpoint. Both are declared and both are read, so the page renders a real
   * name under either shape rather than betting on one. This is the bug behind
   * every company page rendering "Company {id}" as its h1.
   */
  companyName?: string | null;
  companyNameEN?: string | null;
  companyNameCH: string | null;
  companyNameCT: string | null;
  companyNameJP: string | null;
  companyNameKO: string | null;
  logoFilename: string | null;
  topLogoFilename: string | null;
  boilerPlate: string | null;
  extBoilerPlate: string | null;
  url: string | null;
  /** Full industry names. Tolerates plain strings or {sectorName} objects. */
  sectors?: (string | { sectorName?: string | null })[] | null;
  tickers?: ApiTicker[] | null;
  contacts?: ApiContact[] | null;
  /** Bloomberg quote codes. Shape unverified — read defensively. */
  bloomberg?: (string | { code?: string | null; bloombergCode?: string | null })[] | null;
}

interface ApiCompanyDetails {
  established: string;
  listed: string;
  employees: string;
  dunsNumber: string;
  otc: string;
  marketId: string;
  urlJa: string;
  blog: string;
  facebook: string;
  twitter: string;
  linkedIn: string;
  youTube: string;
  telegram: string;
  addr1: string;
  addr2: string;
  addr3: string;
  addr4: string;
  telephone: string;
  facsimile: string;
  email: string;
}

export interface CompanyTicker {
  exchange: string;
  symbol: string;
  /** Only present on API-sourced listings; curated entries omit it. */
  isin?: string | null;
}

export interface CompanyContact {
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface CompanyProfile {
  id: number;
  name: string;
  /** Localised names, for the language-specific renderings of the page. */
  names: {
    ch: string | null;
    ct: string | null;
    jp: string | null;
    ko: string | null;
  };
  logoSrc: string | null;
  /** Boilerplate split into paragraphs; the API delimits them with <BR /> pairs. */
  description: string[];
  established: string | null;
  listed: string | null;
  employees: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  headquarters: string[];
  telephone: string | null;
  facsimile: string | null;
  /** Named contacts from the company record. Empty where the API has none. */
  contacts: CompanyContact[];
  socials: { label: string; url: string }[];
  /** False for statutory bodies and other unlisted entities: hides the stock card. */
  isListed: boolean;
  tickers: CompanyTicker[];
  exchangeName: string | null;
  otc: string | null;
  quoteCodes: { label: string; value: string }[];
  /** True when nothing beyond the name and logo could be resolved. */
  isSparse: boolean;
  /**
   * True when the API could not be reached and this was assembled from the
   * local index and curated file alone. The page shows a notice and suppresses
   * the "no press releases" claim, which it cannot stand behind.
   */
  isPartial: boolean;
}

/** Trims, and collapses the API's whitespace-only placeholders to null. */
function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = sanitizeText(value);
  return trimmed.length > 0 ? trimmed : null;
}

/** First non-empty value wins — API before curated, always. */
function pick(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    const c = clean(value);
    if (c) return c;
  }
  return null;
}

/**
 * Boilerplate arrives as one blob with <BR /> line breaks and HTML entities.
 * Split on runs of breaks so the sidebar description reads as paragraphs.
 */
function toParagraphs(boilerplate: string | null | undefined): string[] {
  if (!boilerplate) return [];
  return boilerplate
    .split(/(?:<\s*br\s*\/?\s*>\s*){1,}/gi)
    .map(part => sanitizeText(part))
    .filter(part => part.length > 0);
}

/** Prefixes a bare host with https:// so the anchor is not treated as relative. */
export function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Strips the scheme and any trailing slash, for display. */
export function toDisplayUrl(url: string | null): string | null {
  if (!url) return null;
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || null;
}

/**
 * Why this is an outcome and not `T | null`.
 *
 * "The API says there is no company 82" and "the API did not answer" are very
 * different facts that both used to collapse to null, and the page turned both
 * into a 404. The first is a correct 404. The second is a 404 on a company that
 * exists, which throws away the name, logo and curated facts we already hold
 * locally — and tells search engines to deindex a real page over an outage.
 *
 * A 5xx counts as unreachable, not missing: a server erroring is a server
 * problem, and it is not evidence that the company does not exist.
 */
type Outcome<T> =
  | { status: 'ok'; data: T }
  | { status: 'missing' }
  | { status: 'unreachable' };

async function getJson<T>(url: string): Promise<Outcome<T>> {
  try {
    const res = await fetch(url, apiInit({ next: { revalidate: REVALIDATE } }));
    if (res.status === 404) return { status: 'missing' };
    if (!res.ok) return { status: 'unreachable' };
    return { status: 'ok', data: (await res.json()) as T };
  } catch {
    // Network failure, DNS failure, or the 6s deadline in apiInit.
    return { status: 'unreachable' };
  }
}

/** Convenience for the calls where a failure genuinely is just "no data". */
async function getJsonOrNull<T>(url: string): Promise<T | null> {
  const outcome = await getJson<T>(url);
  return outcome.status === 'ok' ? outcome.data : null;
}

/** Full industry names off `sectors[]`, which may hold strings or objects. */
function buildIndustry(company: ApiCompany): string | null {
  if (!Array.isArray(company.sectors)) return null;

  const names = company.sectors
    .map(s => (typeof s === 'string' ? clean(s) : clean(s?.sectorName)))
    .filter((s): s is string => s !== null);

  // Deduped because a company tagged under several industries in the same
  // sector repeats the name, and "Financial, Financial" reads as a bug.
  return [...new Set(names)].join(', ') || null;
}

function buildContacts(company: ApiCompany): CompanyContact[] {
  if (!Array.isArray(company.contacts)) return [];

  return company.contacts
    .map(c => ({
      name: clean(c?.contactName),
      phone: clean(c?.contactPhone),
      email: clean(c?.contactEmail),
    }))
    // A contact with no name, phone or email is an empty row upstream, not a
    // person; rendering it would print a blank line in the card.
    .filter(c => c.name || c.phone || c.email);
}

function buildSocials(details: ApiCompanyDetails | null): { label: string; url: string }[] {
  if (!details) return [];
  const candidates: [string, string | null][] = [
    ['Website (JP)', details.urlJa],
    ['Facebook', details.facebook],
    ['X', details.twitter],
    ['LinkedIn', details.linkedIn],
    ['YouTube', details.youTube],
    ['Telegram', details.telegram],
    ['Blog / RSS', details.blog],
  ];

  return candidates
    .map(([label, url]) => ({ label, url: toAbsoluteUrl(clean(url)) }))
    .filter((s): s is { label: string; url: string } => s.url !== null);
}

/**
 * Bloomberg codes off `bloomberg[]`. The array's element shape is not verified —
 * it was named in the 2026-09-09 probe without a field list, and the API has
 * been unreachable since — so a string element and the two plausible object
 * spellings are all accepted, and anything else is skipped rather than rendered
 * as "[object Object]".
 */
function buildQuoteCodes(company: ApiCompany): { label: string; value: string }[] {
  if (!Array.isArray(company.bloomberg)) return [];

  const values = company.bloomberg
    .map(b => (typeof b === 'string' ? clean(b) : clean(b?.bloombergCode ?? b?.code)))
    .filter((v): v is string => v !== null);

  return [...new Set(values)].map(value => ({ label: 'Bloomberg', value }));
}

/**
 * Curated tickers still win. They are the company's own primary listings, and
 * the reason they were curated in the first place stands: for MHI the API's
 * ticker was Frankfurt rather than its home Tokyo listing. `tickers[]` on the
 * company record should be better than the old article-row ticker, but it has
 * not been verified against a live response, so it is the fallback and not the
 * override.
 */
function buildTickers(
  company: ApiCompany,
  curated: CuratedCompanyProfile,
): { tickers: CompanyTicker[]; fromApi: boolean } {
  if (curated.tickers?.length) return { tickers: curated.tickers, fromApi: false };
  if (!Array.isArray(company.tickers)) return { tickers: [], fromApi: false };

  const tickers = company.tickers
    .map((t): CompanyTicker | null => {
      const symbol = clean(t?.tickerId);
      if (!symbol) return null;
      return {
        exchange: clean(t?.exchangeName) ?? 'Ticker',
        symbol,
        isin: clean(t?.isin),
      };
    })
    .filter((t): t is CompanyTicker => t !== null);

  return { tickers, fromApi: tickers.length > 0 };
}

/**
 * The profile we can assemble with no API at all, from the two local sources:
 * the committed company index (name, logo, website — 836 companies today) and
 * the curated file (the richer facts, for the handful that have them).
 *
 * Returns null when neither knows the id. That is the honest 404 case: we have
 * nothing to show and no evidence the company exists, so a page would be a
 * fabrication.
 *
 * Everything here is real data that happens to be stored locally — nothing is
 * invented to fill the layout. The cards self-omit as they always do, so a
 * company with only a name renders a short page rather than a scaffolded one.
 */
function partialProfile(id: number): CompanyProfile | null {
  const indexed = companyFromIndex(id);
  const curated = curatedProfileFor(id);
  const hasCurated = Object.keys(curated).length > 0;

  if (!indexed && !hasCurated) return null;

  const tickers = curated.tickers ?? [];
  const website = toAbsoluteUrl(pick(indexed?.website, curated.website));

  return {
    id,
    name: indexed?.name ?? `Company ${id}`,
    // The index stores only variants that differ from the English name, and
    // does not record which language each one is. Rather than guess a slot,
    // they are left empty here; the API fills them when it is back.
    names: { ch: null, ct: null, jp: null, ko: null },
    logoSrc: indexed?.logoSrc ?? null,
    // Boilerplate only ever comes from the API, so a partial page has no
    // description. The section self-omits rather than showing a grey block.
    description: [],
    established: clean(curated.established),
    listed: curated.isListed === false ? null : clean(curated.listed),
    employees: clean(curated.employees),
    industry: clean(curated.industry),
    country: clean(curated.country),
    website,
    headquarters: curated.headquarters ?? [],
    telephone: clean(curated.telephone),
    facsimile: clean(curated.facsimile),
    contacts: [],
    socials: [],
    isListed: curated.isListed ?? tickers.length > 0,
    tickers,
    exchangeName: null,
    otc: clean(curated.otc),
    quoteCodes: [],
    isSparse:
      !curated.established &&
      !curated.employees &&
      !curated.country &&
      !website &&
      (curated.headquarters?.length ?? 0) === 0,
    isPartial: true,
  };
}

export async function fetchCompanyProfile(
  companyId: string | number,
): Promise<CompanyProfile | null> {
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const outcome = await getJson<ApiCompany>(`${NEW_API_BASE}/api/Companies/${id}`);

  // The API answered and does not know this id: a genuine 404.
  if (outcome.status === 'missing') return null;

  // The API did not answer. Render what we hold locally rather than 404ing a
  // company that exists — see partialProfile().
  if (outcome.status === 'unreachable') return partialProfile(id);

  const company = outcome.data;
  if (typeof company.companyId !== 'number') return null;

  // See the companyName/companyNameEN note on ApiCompany: read both.
  const name = pick(company.companyName, company.companyNameEN) ?? `Company ${id}`;
  const curated = curatedProfileFor(id);

  const details = await getJsonOrNull<ApiCompanyDetails>(
    `${NEW_API_BASE}/api/Companies/${id}/details`,
  );

  const headquarters = (
    [details?.addr1, details?.addr2, details?.addr3, details?.addr4]
      .map(clean)
      .filter((line): line is string => line !== null)
  );

  const website = toAbsoluteUrl(pick(company.url, curated.website));

  const contacts = buildContacts(company);
  const { tickers, fromApi } = buildTickers(company, curated);
  const otc = pick(details?.otc, curated.otc);

  // The exchange name and the quote codes describe the listing we are showing.
  // When curated tickers are displayed instead, they may describe a different
  // one — "TSE: 7011" above "Exchange: Frankfurt" reads as one listing when it
  // is two — so they are dropped unless they match what is on screen.
  const quoteCodes = fromApi ? buildQuoteCodes(company) : [];
  const exchangeName = fromApi ? (tickers[0]?.exchange ?? null) : null;

  // Default to listed only when we actually have something to show. An entity
  // curated as unlisted stays unlisted no matter what the article row claims.
  const isListed = curated.isListed ?? (tickers.length > 0 || otc !== null);

  const description = toParagraphs(company.boilerPlate);
  const established = pick(details?.established, curated.established);
  const listed = curated.isListed === false
    ? null
    : pick(details?.listed, curated.listed);
  const employees = pick(details?.employees, curated.employees);
  // Curated first here, against the usual precedence: sectors[] is ACN's own
  // newswire taxonomy ("Business"), not the company's industry. Where we have a
  // company-sourced description of what it does, that is the better answer; the
  // sector tags remain the fallback for everyone else.
  const industry = pick(curated.industry, buildIndustry(company));
  // No endpoint exposes a country per company since the legacy host went 503,
  // so this is curated-only until one does.
  const country = clean(curated.country);

  return {
    id,
    name,
    names: {
      ch: clean(company.companyNameCH),
      ct: clean(company.companyNameCT),
      jp: clean(company.companyNameJP),
      ko: clean(company.companyNameKO),
    },
    logoSrc: company.logoFilename ? `${LOGO_BASE}${company.logoFilename}` : null,
    description,
    established,
    listed,
    employees,
    industry,
    country,
    website,
    headquarters: headquarters.length > 0 ? headquarters : (curated.headquarters ?? []),
    // Deliberately NOT filled from contacts[0].phone: the named contacts render
    // their own rows, and folding the first one in here prints the same number
    // twice on every company that has one.
    telephone: pick(details?.telephone, curated.telephone),
    facsimile: pick(details?.facsimile, curated.facsimile),
    contacts,
    socials: buildSocials(details),
    isListed,
    tickers,
    exchangeName: isListed && fromApi ? exchangeName : null,
    otc: isListed ? otc : null,
    quoteCodes: isListed ? quoteCodes : [],
    isSparse:
      description.length === 0 &&
      !established &&
      !employees &&
      !country &&
      !website &&
      headquarters.length === 0,
    isPartial: false,
  };
}
