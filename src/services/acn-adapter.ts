// services/acn-adapter.ts
// Converts new development API shape → PressReleaseData.

import type { NewApiPressRelease } from './acn-api.types';
import type { PressReleaseData } from '@/components/press-release/types';
import { slugify } from 'transliteration';
import { sanitizeText, sanitizeHeadline } from '@/lib/sanitize';

const LOGO_BASE = 'https://www.acnnewswire.com/images/company/';

export function adaptNewApiPressRelease(raw: NewApiPressRelease): PressReleaseData {
  const rawCompany = raw.companies?.[0] ?? null;
  const bigImage = raw.images?.[0]?.bigImage;

  return {
    id:          raw.articleId,
    headline:    sanitizeHeadline(raw.headline),
    subHeadline: sanitizeText(raw.subHeadLine) ?? null,
    dateTime:    raw.publishDate,
    bodyText:    sanitizeText(raw.bodyText) ?? sanitizeText(raw.summary) ?? '',
    bodyHtml:    raw.bodyHtml ?? raw.body ?? '',
    language:    raw.language || undefined,
    source:      rawCompany?.companyName ?? '',
    supplier:    '',
    location:    { name: '', sub_Location: '' },
    url:         '',
    photo:       bigImage ? [`https://photos.acnnewswire.com/${bigImage}`] : [],
    sector:      raw.sectorName ? [raw.sectorName] : [],
    topic:       '',
    views:       '0',
    stock:       null,
    companies:   rawCompany ? [{
      comp_ID:       String(rawCompany.companyID),
      company_Name:  sanitizeText(rawCompany.companyName) ?? '',
      companyNameCH: sanitizeText(rawCompany.companyNameCH),
      companyNameCT: sanitizeText(rawCompany.companyNameCT),
      companyNameJP: sanitizeText(rawCompany.companyNameJP),
      companyNameKO: sanitizeText(rawCompany.companyNameKO),
      logofilename:  rawCompany.logoFileName ? `${LOGO_BASE}${rawCompany.logoFileName}` : '',
      url:           rawCompany.companyURL ?? '',
    }] : [],
  };
}

// Utility: "Japanese" → "japanese", "Simplified Chinese" → "simplified-chinese"
export function languageToSlug(language: string): string {
  return language.toLowerCase().replace(/\s+/g, '-');
}

// Utility: clean SEO slug from headline
// Falls back to press-release-{id} for non-Latin titles
export function headlineToSlug(headline: string, id: number): string {
  const slug = slugify(headline, {
    lowercase: true,
    trim: true,
  }).slice(0, 80);

  return slug.length > 5 ? slug : `press-release-${id}`;
}
