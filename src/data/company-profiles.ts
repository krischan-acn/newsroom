// data/company-profiles.ts
//
// Curated fallback facts, keyed by companyId.
//
// The API has the shape for all of this (`/api/Companies/{id}/details` returns
// established / listed / employees / addr1-4 / telephone / email), but for most
// companies every one of those fields comes back as an empty string. Rather than
// render a sidebar of blanks we fill the gaps from here.
//
// Precedence: a non-empty API value always wins. This file only fills holes.
// Every entry must be sourced from the company's own published material or a
// comparably reliable public record — never inferred, never guessed. A fact we
// cannot source is simply omitted, and the row does not render.

export interface CuratedCompanyProfile {
  /** Year or full date the company was founded, as displayed. */
  established?: string;
  /** When the company listed. Omit entirely for unlisted entities. */
  listed?: string;
  employees?: string;
  /** Displayed as-is; use the company's own segment wording where possible. */
  industry?: string;
  country?: string;
  headquarters?: string[];
  telephone?: string;
  facsimile?: string;
  website?: string;
  /** Exchange/ticker pairs, e.g. "TSE: 7011". Omit for unlisted entities. */
  tickers?: { exchange: string; symbol: string }[];
  /** Over-the-counter symbol, where one exists. */
  otc?: string;
  /**
   * Set false for entities that are not publicly traded. This suppresses the
   * Stock Details card outright — see HKTDC below for why that matters.
   */
  isListed?: boolean;
  /** Where these facts came from, so the next person can re-verify them. */
  sources?: string[];
}

export const CURATED_COMPANY_PROFILES: Record<number, CuratedCompanyProfile> = {
  // Mitsubishi Heavy Industries, Ltd.
  82: {
    established: 'July 7, 1884',
    listed: 'January 11, 1950 (incorporated)',
    employees: '78,793 (consolidated, as of March 31, 2026)',
    industry: 'Energy Systems, Plants & Infrastructure Systems, Industrial Solution Systems, Aircraft, Defense & Space',
    country: 'Japan',
    headquarters: [
      '2-3, Marunouchi 3-chome',
      'Chiyoda-ku, Tokyo 100-8332',
      'Japan',
    ],
    telephone: '+81-3-6275-6200',
    website: 'https://www.mhi.com',
    isListed: true,
    tickers: [
      { exchange: 'TSE', symbol: '7011' },
      { exchange: 'FSE', symbol: '7011' },
    ],
    otc: 'MHVYF',
    sources: [
      'https://www.mhi.com/company/overview/profile',
      'https://en.wikipedia.org/wiki/Mitsubishi_Heavy_Industries',
    ],
  },

  // Hong Kong Trade Development Council.
  //
  // A statutory body, not a company: there is no IPO, no shareholders and no
  // tradable stock. The API nonetheless returns ticker "0558691D" on XHKG for
  // this record — that is a Bloomberg private-company identifier, not a symbol
  // anyone can trade. isListed:false suppresses the Stock Details card so we
  // never print it as though it were one.
  574: {
    established: '1966',
    employees: 'Approx. 2,200',
    industry: 'Trade promotion, exhibitions and business services',
    country: 'Hong Kong',
    headquarters: [
      '38/F, Office Tower, Convention Plaza',
      '1 Harbour Road, Wan Chai',
      'Hong Kong',
    ],
    website: 'https://www.hktdc.com',
    isListed: false,
    sources: [
      'https://aboutus.hktdc.com/en/',
      'https://en.wikipedia.org/wiki/Hong_Kong_Trade_Development_Council',
    ],
  },
};

export function curatedProfileFor(companyId: number): CuratedCompanyProfile {
  return CURATED_COMPANY_PROFILES[companyId] ?? {};
}
