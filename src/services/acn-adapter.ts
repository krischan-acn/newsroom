// services/acn-adapter.ts
// Converts new development API shape → PressReleaseData.
//
// Server-only: `transliteration` carries its character tables with it
// (~230KB of client JS when InfiniteArticleFeed imported this file). Client
// code gets finished paths from the server instead - /api/press-release adds
// `urlPath` for exactly that.

import 'server-only';

import type { NewApiPressRelease, LegacyApiArticle } from './acn-api.types';
import type { PressReleaseData } from '@/types/press-release';
import { slugify } from 'transliteration';
import { sanitizeText, sanitizeHeadline } from '@/lib/sanitize';
import { slugFor } from '@/lib/languages';
import { romanizeKana } from '@/lib/romanize-kana';

const LOGO_BASE = 'https://www.acnnewswire.com/images/company/';

/** Trims and collapses whitespace-only values to null. */
function clean(value: string | null | undefined): string | null {
  const text = sanitizeText(value);
  return text.length > 0 ? text : null;
}

/**
 * The press-release endpoint returns `sectors` as a JSON-encoded string rather
 * than an array: "[\"Energy, Alternatives\",\"Engineering\"]". Parsed here so a
 * malformed value degrades to no sectors instead of throwing mid-render.
 */
function parseSectors(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(s => sanitizeText(s)).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(s => sanitizeText(String(s))).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

/**
 * @param raw    the current API's press-release payload — authoritative for
 *               headline, body, images and summary.
 * @param legacy the legacy article record, used only to fill fields the
 *               current API does not return. Null when that call failed, in
 *               which case those fields stay empty as before.
 */
export function adaptNewApiPressRelease(
  raw: NewApiPressRelease,
  legacy: LegacyApiArticle | null = null,
): PressReleaseData {
  const rawCompany = raw.companies?.[0] ?? null;
  const legacyCompany = legacy?.companies?.[0] ?? null;
  const bigImage = raw.images?.[0]?.bigImage;

  // Legacy carries the full sector list; the new payload's is a JSON string and
  // sectorName is absent on this endpoint entirely.
  const legacySectors = parseSectors(legacy?.sector);
  const sector = legacySectors.length > 0
    ? legacySectors
    : parseSectors(raw.sectors ?? raw.sectorName);

  return {
    id:          raw.articleId,
    headline:    sanitizeHeadline(raw.headline),
    subHeadline: sanitizeText(raw.subHeadLine) ?? null,
    dateTime:    raw.publishDate,
    bodyText:    sanitizeText(raw.bodyText) ?? sanitizeText(raw.summary) ?? '',
    bodyHtml:    raw.bodyHtml ?? raw.body ?? '',
    summary:     clean(raw.summary),
    // Only the legacy record knows the language. Without it every article
    // canonicalises to /article/english/… regardless of what it is written in.
    language:    clean(legacy?.language) ?? raw.language ?? undefined,
    source:      clean(legacy?.source) ?? clean(raw.sourceName) ?? rawCompany?.companyName ?? '',
    supplier:    clean(legacy?.supplier) ?? '',
    location:    {
      name:         clean(legacy?.location?.name) ?? '',
      sub_Location: clean(legacy?.location?.sub_Location) ?? '',
    },
    url:         clean(legacy?.url) ?? '',
    photo:       bigImage ? [`https://photos.acnnewswire.com/${bigImage}`] : [],
    sector,
    topic:       clean(legacy?.topic) ?? clean(raw.topicName) ?? '',
    views:       clean(legacy?.views) ?? '0',
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
      // Social profiles exist only on the legacy record.
      facebook:      clean(legacyCompany?.facebook) ?? undefined,
      twitter:       clean(legacyCompany?.twitter) ?? undefined,
      youtube:       clean(legacyCompany?.youtube) ?? undefined,
      linkedin:      clean(legacyCompany?.linkedin) ?? undefined,
      telegram:      clean(legacyCompany?.telegram) ?? undefined,
    }] : [],
  };
}

// Utility: "Japanese" → "japanese", "Simplified Chinese" → "simplified-chinese"
//
// Resolved through the language registry rather than lowercased blindly. The
// old version turned "Traditional Chinese" into "traditional-chinese" but
// "zh-Hant" into "zh-hant" — two canonical URLs for one article, so whenever
// the API changed spelling the /article route redirected to a different
// address and the canonical link churned.
export function languageToSlug(language: string): string {
  return slugFor(language);
}

const SLUG_MAX = 80;

// A CJK character directly against Latin text or a digit. `transliteration`
// does not break there, so ESPN联合 became "espnlian-he" and 2026年 "2026nian".
const CJK_THEN_LATIN = /([\p{Script=Han}\p{Script=Hangul}])(?=[A-Za-z0-9])/gu;
const LATIN_THEN_CJK = /([A-Za-z0-9])(?=[\p{Script=Han}\p{Script=Hangul}])/gu;

/**
 * URL slug for a headline, in Latin script whatever the headline's language.
 * Cosmetic only: the article route resolves by id, so any slug still lands on
 * the right release.
 *
 * - Kana goes through Hepburn first (lib/romanize-kana) - transliteration's own
 *   kana output is not something a Japanese reader would recognise.
 * - Only a-z and 0-9 survive; dots and other punctuation become word breaks
 *   (U.S. Polo Assn. -> u-s-polo-assn).
 * - Long slugs are cut at the last word break before SLUG_MAX rather than
 *   mid-word, and never end on a hyphen.
 */
export function headlineToSlug(headline: string, id: number): string {
  const spaced = romanizeKana(headline)
    .replace(CJK_THEN_LATIN, '$1 ')
    .replace(LATIN_THEN_CJK, '$1 ');

  let slug = slugify(spaced, {
    lowercase: true,
    trim: true,
    allowedChars: 'a-zA-Z0-9',
  });

  if (slug.length > SLUG_MAX) {
    const cut = slug.lastIndexOf('-', SLUG_MAX);
    // A single word longer than half the budget is cut hard rather than dropped.
    slug = cut > SLUG_MAX / 2 ? slug.slice(0, cut) : slug.slice(0, SLUG_MAX);
  }
  slug = slug.replace(/^-+|-+$/g, '');

  return slug.length > 5 ? slug : `press-release-${id}`;
}

/** Canonical path of an article. Server-side only - see the note on transliteration above. */
export function articlePath(article: { id: number; headline: string; language?: string | null }): string {
  return `/article/${languageToSlug(article.language ?? 'english')}/${article.id}/${headlineToSlug(article.headline, article.id)}`;
}
