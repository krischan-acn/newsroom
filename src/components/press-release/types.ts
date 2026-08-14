// press-release/types.ts
export interface CompanyData {
  comp_ID: string;
  company_Name: string;
  companyNameCH?: string;
  companyNameCT?: string;
  companyNameJP?: string;
  companyNameKO?: string;
  logofilename: string;
  url: string;
  description?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
  telegram?: string;
}

export interface Location {
  name: string;
  sub_Location: string;
}

export interface PressReleaseData {
  id: number;
  headline: string;
  subHeadline?: string | null;
  dateTime: string;
  bodyText?: string;
  bodyHtml: string;
  /** Editor-written abstract, shown as the sidebar's release summary. */
  summary?: string | null;
  language?: string;
  source: string;
  supplier: string;
  location: Location;
  url: string;
  photo?: string[];
  sector: string[];
  topic: string;
  views: string;
  companies: CompanyData[];
  stock: null | any;
}