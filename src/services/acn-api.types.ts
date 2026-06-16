// services/acn-api.types.ts
// Types for the new development API response shape.

export interface NewApiArticle {
  articleId: number;
  headline: string;
  publishDate: string;
  summary: string;
  hasImage: boolean;
  hasFile: boolean;
  sectorName?: string;
  companies: {
    companyID: number;
    logoFileName: string | null;
    companyName: string;
    companyURL: string | null;
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
