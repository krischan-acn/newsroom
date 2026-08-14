// services/company-profile.ts
//
// Assembles the company profile shown in the sidebar of /company/[id].
//
// No single endpoint has all of it, so this stitches three together:
//   /api/Companies/{id}          → name, logo, boilerplate
//   /api/Companies/{id}/details  → established, listed, employees, address, socials
//   /api/Articles/search         → ticker, exchange and the vendor quote codes,
//                                  which live on the article row rather than on
//                                  the company record itself
// and then fills whatever is still blank from src/data/company-profiles.ts.

import { sanitizeText } from '@/lib/sanitize';
import { curatedProfileFor, type CuratedCompanyProfile } from '@/data/company-profiles';

const NEW_API_BASE = 'https://development.acnnewswire.com';
const LOGO_BASE = 'https://www.acnnewswire.com/images/company/';

const REVALIDATE = 3600;

interface ApiCompany {
  companyId: number;
  companyNameEN: string;
  companyNameCH: string | null;
  companyNameCT: string | null;
  companyNameJP: string | null;
  companyNameKO: string | null;
  logoFilename: string | null;
  topLogoFilename: string | null;
  boilerPlate: string | null;
  extBoilerPlate: string | null;
  url: string | null;
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

/** The subset of an /api/Articles/search row that describes the company. */
interface ApiSearchCompanyRow {
  companyId: number;
  companyName: string | null;
  companyURL: string | null;
  sectorName: string | null;
  country: string | null;
  exchangeIdent: string | null;
  exchangeName: string | null;
  bloombergCode: string | null;
  reutersCode: string | null;
  yahooCode: string | null;
  googleCode: string | null;
  ticker: string | null;
}

export interface CompanyTicker {
  exchange: string;
  symbol: string;
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
  socials: { label: string; url: string }[];
  /** False for statutory bodies and other unlisted entities: hides the stock card. */
  isListed: boolean;
  tickers: CompanyTicker[];
  exchangeName: string | null;
  otc: string | null;
  quoteCodes: { label: string; value: string }[];
  /** True when nothing beyond the name and logo could be resolved. */
  isSparse: boolean;
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

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Ticker data hangs off article rows, not the company record, so we read it from
 * a search by company name and then verify the row actually belongs to this
 * company — a name search can match a different company with a similar name, and
 * printing someone else's ticker is worse than printing none.
 */
async function fetchExchangeRow(
  id: number,
  companyName: string | null,
): Promise<ApiSearchCompanyRow | null> {
  if (!companyName) return null;

  const rows = await getJson<ApiSearchCompanyRow[]>(
    `${NEW_API_BASE}/api/Articles/search?CompanyName=${encodeURIComponent(companyName)}&Page=1&Size=5`,
  );
  if (!Array.isArray(rows)) return null;

  return rows.find(row => row.companyId === id) ?? null;
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

function buildQuoteCodes(row: ApiSearchCompanyRow | null): { label: string; value: string }[] {
  if (!row) return [];
  const candidates: [string, string | null][] = [
    ['Bloomberg', row.bloombergCode],
    ['Reuters', row.reutersCode],
    ['Yahoo', row.yahooCode],
    ['Google', row.googleCode],
  ];
  return candidates
    .map(([label, value]) => ({ label, value: clean(value) }))
    .filter((c): c is { label: string; value: string } => c.value !== null);
}

function buildTickers(
  row: ApiSearchCompanyRow | null,
  curated: CuratedCompanyProfile,
): { tickers: CompanyTicker[]; fromApiRow: boolean } {
  // Curated tickers are the company's own primary listings and are preferred:
  // the API row carries whichever exchange record happened to be attached to the
  // article, which for MHI is Frankfurt rather than its home Tokyo listing.
  if (curated.tickers?.length) return { tickers: curated.tickers, fromApiRow: false };

  const symbol = clean(row?.ticker);
  if (!symbol) return { tickers: [], fromApiRow: false };

  const exchange = clean(row?.exchangeIdent) ?? clean(row?.exchangeName) ?? 'Ticker';
  return { tickers: [{ exchange, symbol }], fromApiRow: true };
}

export async function fetchCompanyProfile(
  companyId: string | number,
): Promise<CompanyProfile | null> {
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const company = await getJson<ApiCompany>(`${NEW_API_BASE}/api/Companies/${id}`);
  if (!company || typeof company.companyId !== 'number') return null;

  const name = clean(company.companyNameEN) ?? `Company ${id}`;
  const curated = curatedProfileFor(id);

  const [details, exchangeRow] = await Promise.all([
    getJson<ApiCompanyDetails>(`${NEW_API_BASE}/api/Companies/${id}/details`),
    fetchExchangeRow(id, clean(company.companyNameEN)),
  ]);

  const headquarters = (
    [details?.addr1, details?.addr2, details?.addr3, details?.addr4]
      .map(clean)
      .filter((line): line is string => line !== null)
  );

  const website = toAbsoluteUrl(
    pick(company.url, exchangeRow?.companyURL, curated.website),
  );

  const { tickers, fromApiRow } = buildTickers(exchangeRow, curated);
  const otc = pick(details?.otc, curated.otc);

  // exchangeName and the vendor quote codes describe the exchange record on the
  // article row. When we display curated tickers instead, that record is for a
  // different listing — showing "TSE: 7011" above "Exchange: Frankfurt" reads as
  // one listing when it is two. Drop them unless they match what we are showing.
  const quoteCodes = fromApiRow ? buildQuoteCodes(exchangeRow) : [];

  // Default to listed only when we actually have something to show. An entity
  // curated as unlisted stays unlisted no matter what the article row claims.
  const isListed = curated.isListed ?? (tickers.length > 0 || otc !== null);

  const description = toParagraphs(company.boilerPlate);
  const established = pick(details?.established, curated.established);
  const listed = curated.isListed === false
    ? null
    : pick(details?.listed, curated.listed);
  const employees = pick(details?.employees, curated.employees);
  // Curated first here, against the usual precedence: sectorName is ACN's own
  // newswire taxonomy ("Business"), not the company's industry. Where we have a
  // company-sourced description of what it does, that is the better answer; the
  // sector tag remains the fallback for everyone else.
  const industry = pick(curated.industry, exchangeRow?.sectorName);
  const country = pick(exchangeRow?.country, curated.country);

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
    telephone: pick(details?.telephone, curated.telephone),
    facsimile: pick(details?.facsimile, curated.facsimile),
    socials: buildSocials(details),
    isListed,
    tickers,
    exchangeName: isListed && fromApiRow ? clean(exchangeRow?.exchangeName) : null,
    otc: isListed ? otc : null,
    quoteCodes: isListed ? quoteCodes : [],
    isSparse:
      description.length === 0 &&
      !established &&
      !employees &&
      !country &&
      !website &&
      headquarters.length === 0,
  };
}
