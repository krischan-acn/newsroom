// services/company-profile.ts
//
// Assembles the company profile shown in the sidebar of /company/[id].
//
// Source, singular, as of the /full migration:
//   /api/Companies/{id}/full  → everything below
// and then fills whatever is still blank from src/data/company-profiles.ts.
//
// This used to be two calls and was once three. /api/Articles/search went first:
// it returned 0 rows for every input including unfiltered (verified 2026-09-09),
// so it could only ever return null while costing a request on every company
// render. Then /api/Companies/{id} + /api/Companies/{id}/details, the second of
// which existed here solely to supply the social links.
//
// /full folds all of it into one request — it is the response
// contracts/company.after.json asked for. Worth knowing about the merge:
//
//   · socials arrive as ONE object, not six sibling string fields.
//   · the address is four NAMED fields (addressStreet/District/City/Country)
//     rather than the positional addr1..addr4.
//   · contacts[] carries the full shape — position, fax, description, format —
//     that previously needed a separate /api/CompContacts call. The keys are
//     `name`/`phone`/`email`, not the old `contactName`/`contactPhone`/
//     `contactEmail`.
//   · localised names are nested under `names`, keyed by language tag.
//   · logos and `url` come back absolute.
//   · `username`/`password` are GONE. They used to be returned in plaintext on
//     this unauthenticated endpoint; the backend now strips them from every
//     company DTO (re-verified on the list, detail, details and full routes).
//
// The profile block is still sparse — established/listed/employees/address/
// phone/email came back null on every company sampled, before and after the
// merge, because the client does not supply that data. Those keep coming from
// contacts[] and the curated file, and are not chased here.

import { sanitizeText } from '@/lib/sanitize';
import { resolveIndustry } from '@/lib/taxonomy';
import { curatedProfileFor, type CuratedCompanyProfile } from '@/data/company-profiles';
import { apiInit } from '@/lib/api-timeout';
import { companyFromIndex } from '@/services/company-search';

const NEW_API_BASE = 'https://development.acnnewswire.com';

const REVALIDATE = 3600;

/** A listing on `tickers[]`. */
interface ApiTicker {
  exchangeId?: number | string | null;
  exchangeName?: string | null;
  tickerId?: string | null;
  isin?: string | null;
}

/**
 * A row on `contacts[]`.
 *
 * On /full this is the rich shape that used to require /api/CompContacts, and
 * the keys are plain: `name`, `phone`, `email` — NOT the `contactName` /
 * `contactPhone` / `contactEmail` the old detail route used. Reading the old
 * spellings here is what would silently blank every contact card.
 */
interface ApiContact {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  fax?: string | null;
}

/**
 * `GET /api/Companies/{id}/full`.
 *
 * The merged company record. Note what moved relative to the old detail route:
 * the localised names are nested under `names` and keyed by language tag rather
 * than being four flat `companyNameXX` siblings; the logos are absolute URLs
 * rather than bare filenames; `boilerPlate`/`extBoilerPlate` are now
 * `boilerplate`/`boilerplateExtended`; and the socials and address have their
 * own nested blocks.
 */
interface ApiCompanyFull {
  companyId: number;
  /**
   * `names.en` is the company's English name and is always populated. This
   * replaces the companyName/companyNameEN guessing the old detail route
   * forced — the two spellings disagreed between endpoints, which is the bug
   * behind every company page once rendering "Company {id}" as its h1.
   */
  names?: {
    en?: string | null;
    ja?: string | null;
    zhHans?: string | null;
    zhHant?: string | null;
    ko?: string | null;
  } | null;
  url: string | null;
  urlJa: string | null;
  /** Absolute URLs. The wire used to send bare filenames to prefix. */
  logoArticle: string | null;
  logoTop: string | null;
  boilerplate: string | null;
  boilerplateExtended: string | null;
  /**
   * Full industry names.
   *
   * Objects keyed `name` — `{ compId, id, name, description }`. `sectorName` is
   * kept in the union as a tolerated fallback because it is the key the article
   * endpoints use for their own coarser sector field; it has never been
   * returned here. The plain string form is likewise defensive, not observed.
   *
   * `id` is deliberately not declared: it belongs to a taxonomy that is NOT the
   * one in src/lib/sectors.ts, so nothing here should be tempted to match on
   * it. See buildIndustry.
   */
  sectors?: (string | { name?: string | null; sectorName?: string | null })[] | null;
  tickers?: ApiTicker[] | null;
  contacts?: ApiContact[] | null;
  /** Verified on companies 82 and 574: `{ compId, id, bloombergCode, name }`. */
  bloombergCodes?: (string | { bloombergCode?: string | null; code?: string | null })[] | null;
  /** One object, replacing the six flat social fields on /details. */
  socials?: {
    blog?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    youtube?: string | null;
    linkedin?: string | null;
    telegram?: string | null;
  } | null;
  /**
   * The former /details payload.
   *
   * Every field here except `marketId` came back null on all the companies
   * sampled, before and after the merge — the client does not supply it. Read,
   * but never relied on; the curated file is what actually fills these rows.
   */
  profile?: {
    established?: string | null;
    listedDate?: string | null;
    employees?: string | null;
    otc?: string | null;
    telephone?: string | null;
    facsimile?: string | null;
    addressStreet?: string | null;
    addressDistrict?: string | null;
    addressCity?: string | null;
    addressCountry?: string | null;
  } | null;
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


/**
 * Full industry names off `sectors[]`, which may hold strings or objects.
 *
 * C-M1 — the object form is keyed `name`, NOT `sectorName`.
 *
 * This read `s.sectorName`, which the endpoint has never sent. Every element
 * therefore cleaned to null, `names` came back empty, and the Industry row
 * rendered blank on every company without a curated entry — while the correct
 * data sat in the response untouched. Verified against company 82 on
 * 2026-09-10, which returns seven sectors shaped:
 *
 *   { compId: 82, id: 211, name: "Aerospace & Defence", description: "Aerospace & Defence" }
 *
 * `sectorName` is kept in the union below and read as a fallback: it is the key
 * the article endpoints use for their own (coarser) sector field, so a future
 * shape carrying it is plausible and costs nothing to tolerate. `name` wins.
 *
 * Names resolve through `resolveIndustry` per BIBLE rule 7, which canonicalises
 * the wire's spelling — it is punctuation- and case-insensitive, so the wire's
 * "Construct, Engineering" lands on the master list's "Construct Engineering".
 * All seven of company 82's sector names resolve that way. An unresolved name
 * falls back to the wire's own string rather than being dropped, so a genuinely
 * new industry still renders instead of silently vanishing.
 *
 * Match on NAME, never on `id`. acn-admin resolved this same data by id against
 * its master list and produced wrong-but-real names — Mitsubishi Heavy
 * Industries came out tagged "Fashion & Apparel" and "eSports Gaming". The
 * API's sector ids are a different taxonomy; see AC-M1 in
 * contracts/company.before.json.
 */
function buildIndustry(company: ApiCompanyFull): string | null {
  if (!Array.isArray(company.sectors)) return null;

  const names = company.sectors
    .map(s => (typeof s === 'string' ? clean(s) : clean(s?.name ?? s?.sectorName)))
    .filter((s): s is string => s !== null)
    .map(name => resolveIndustry(name)?.industry ?? name);

  // Deduped because a company tagged under several industries in the same
  // sector repeats the name, and "Financial, Financial" reads as a bug.
  return [...new Set(names)].join(', ') || null;
}

function buildContacts(company: ApiCompanyFull): CompanyContact[] {
  if (!Array.isArray(company.contacts)) return [];

  return company.contacts
    .map(c => ({
      name: clean(c?.name),
      phone: clean(c?.phone),
      email: clean(c?.email),
    }))
    // A contact with no name, phone or email is an empty row upstream, not a
    // person; rendering it would print a blank line in the card.
    .filter(c => c.name || c.phone || c.email);
}

/**
 * The social links, now off the nested `socials` object.
 *
 * Two things changed with the merge and both are easy to get wrong: the casing
 * is flat lowercase (`youtube`, `linkedin`) where /details used `youTube` and
 * `linkedIn`, and `urlJa` is a sibling of `socials` rather than a member of it.
 * The display order and labels are unchanged.
 */
function buildSocials(company: ApiCompanyFull): { label: string; url: string }[] {
  const socials = company.socials;
  const candidates: [string, string | null | undefined][] = [
    ['Website (JP)', company.urlJa],
    ['Facebook', socials?.facebook],
    ['X', socials?.twitter],
    ['LinkedIn', socials?.linkedin],
    ['YouTube', socials?.youtube],
    ['Telegram', socials?.telegram],
    ['Blog / RSS', socials?.blog],
  ];

  return candidates
    .map(([label, url]) => ({ label, url: toAbsoluteUrl(clean(url)) }))
    .filter((s): s is { label: string; url: string } => s.url !== null);
}

/**
 * Bloomberg codes off `bloombergCodes[]` — renamed from `bloomberg[]` by the
 * merge, and now with a verified element shape:
 *
 *   { compId: 82, id: 73, bloombergCode: "ASIA", name: "Asia, Pacific Rim" }
 *
 * The string and `code` forms are kept as tolerated fallbacks rather than
 * expected shapes. Anything else is skipped rather than rendered as
 * "[object Object]".
 */
function buildQuoteCodes(company: ApiCompanyFull): { label: string; value: string }[] {
  if (!Array.isArray(company.bloombergCodes)) return [];

  const values = company.bloombergCodes
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
  company: ApiCompanyFull,
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

  const outcome = await getJson<ApiCompanyFull>(`${NEW_API_BASE}/api/Companies/${id}/full`);

  // The API answered and does not know this id: a genuine 404.
  if (outcome.status === 'missing') return null;

  // The API did not answer. Render what we hold locally rather than 404ing a
  // company that exists — see partialProfile().
  if (outcome.status === 'unreachable') return partialProfile(id);

  const company = outcome.data;
  if (typeof company.companyId !== 'number') return null;

  const name = clean(company.names?.en) ?? `Company ${id}`;
  const curated = curatedProfileFor(id);
  const profile = company.profile;

  // Named fields now, in the order they read as an address. The old positional
  // addr1..addr4 said nothing about what each line held.
  const headquarters = (
    [profile?.addressStreet, profile?.addressDistrict, profile?.addressCity, profile?.addressCountry]
      .map(clean)
      .filter((line): line is string => line !== null)
  );

  const website = toAbsoluteUrl(pick(company.url, curated.website));

  const contacts = buildContacts(company);
  const { tickers, fromApi } = buildTickers(company, curated);
  const otc = pick(profile?.otc, curated.otc);

  // The exchange name and the quote codes describe the listing we are showing.
  // When curated tickers are displayed instead, they may describe a different
  // one — "TSE: 7011" above "Exchange: Frankfurt" reads as one listing when it
  // is two — so they are dropped unless they match what is on screen.
  const quoteCodes = fromApi ? buildQuoteCodes(company) : [];
  const exchangeName = fromApi ? (tickers[0]?.exchange ?? null) : null;

  // Default to listed only when we actually have something to show. An entity
  // curated as unlisted stays unlisted no matter what the article row claims.
  const isListed = curated.isListed ?? (tickers.length > 0 || otc !== null);

  const description = toParagraphs(company.boilerplate);
  const established = pick(profile?.established, curated.established);
  // `listedDate` on /full; it was `listed` on the old /details route.
  const listed = curated.isListed === false
    ? null
    : pick(profile?.listedDate, curated.listed);
  const employees = pick(profile?.employees, curated.employees);
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
      ch: clean(company.names?.zhHans),
      ct: clean(company.names?.zhHant),
      jp: clean(company.names?.ja),
      ko: clean(company.names?.ko),
    },
    // Absolute on the wire now - this used to be a bare filename needing a host.
    logoSrc: clean(company.logoArticle),
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
    telephone: pick(profile?.telephone, curated.telephone),
    facsimile: pick(profile?.facsimile, curated.facsimile),
    contacts,
    socials: buildSocials(company),
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
