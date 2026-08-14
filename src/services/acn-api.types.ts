// services/acn-api.types.ts
// Types for the new development API response shape.

export interface NewApiArticle {
  articleId: number;
  headline: string;
  publishDate: string;
  summary: string;
  hasImage: boolean;
  hasFile: boolean;
  imageUrl?: string | null;
  language?: string | null;
  sectorName?: string;
  // The list endpoints (/api/Articles, /homepage, /by-industry) return a
  // trimmed company object keyed companyId/logoFilename. The single-article
  // endpoint uses companyID/logoFileName instead — see NewApiPressRelease.
  // Both spellings are declared optional here so a shape change on either side
  // surfaces as a null value rather than a silently missing logo.
  companies: {
    companyId?: number;
    companyID?: number;
    logoFilename?: string | null;
    logoFileName?: string | null;
    companyName: string;
    companyURL?: string | null;
    companyNameCH?: string | null;
    companyNameCT?: string | null;
    companyNameJP?: string | null;
    companyNameKO?: string | null;
  }[];
  images: {
    thumbImage: string;
    bigImage: string;
    caption: string;
  }[];
}

/**
 * Shape of the legacy /api/v1/News/GetArticleById/{artId} response.
 *
 * Kept alive because it still carries several fields the current API's
 * press-release endpoint does not return at all: language, location, views,
 * supplier, the origin URL, the full sector list, and the company's social
 * profiles. See fetchPressRelease() for how the two are merged.
 */
export interface LegacyApiArticle {
  id: number;
  headline: string;
  subHeadline: string | null;
  /** Formatted, not ISO: "Thursday, 06 August 2026 14:00". */
  dateTime: string;
  bodyText: string | null;
  bodyHtml: string | null;
  language: string | null;
  source: string | null;
  supplier: string | null;
  location: { name: string | null; sub_Location: string | null } | null;
  url: string | null;
  photo: string[] | null;
  sector: string[] | null;
  topic: string | null;
  views: string | null;
  companies: {
    comp_ID: string;
    company_Name: string;
    companyNameCH: string | null;
    companyNameCT: string | null;
    companyNameJP: string | null;
    companyNameKO: string | null;
    issuer: string | null;
    /** Already an absolute URL on this endpoint. */
    logofilename: string | null;
    url: string | null;
    facebook: string | null;
    twitter: string | null;
    youtube: string | null;
    linkedin: string | null;
    telegram: string | null;
  }[] | null;
  stock: unknown;
}

export interface NewApiPressRelease {
  articleId: number;
  headline: string;
  subHeadLine: string | null;
  body: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  publishDate: string;
  summary: string | null;
  sourceId: number;
  hasImage: boolean;
  hasFile: boolean;
  sectorName: string | null;
  /** JSON-encoded array, e.g. "[\"Engineering\",\"Smart Cities\"]". */
  sectors?: string | null;
  topicName?: string | null;
  sourceName?: string | null;
  language?: string | null;
  companies: {
    companyID: number;
    topLogoFileName: string | null;
    logoFileName: string | null;
    companyURL: string | null;
    companyName: string | null;
    sectorName: string | null;
    companyNameCH: string | null;
    companyNameCT: string | null;
    companyNameJP: string | null;
    companyNameKO: string | null;
  }[];
  images: {
    thumbImage: string;
    bigImage: string;
    caption: string;
  }[];
}
