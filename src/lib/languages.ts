// lib/languages.ts
// Single source of truth for every language identifier the platform uses.
//
// The same five languages were previously spelled four different ways depending
// on which part of the stack you were in:
//
//   raw API value   "Traditional Chinese"  (sometimes "zh-Hant")
//   search code     "zh-Hant"
//   subdomain       "zh-CHT"               (not a valid BCP-47 tag)
//   article URL     "traditional-chinese"
//
// Every one of those now resolves through resolveLanguage(), so a tag means the
// same thing regardless of which spelling arrives. Unknown values are never
// guessed at — they come back null and get rendered verbatim, which keeps bad
// upstream data visible instead of silently mislabelled.

export type LanguageId = 'en' | 'ja' | 'ko' | 'zh-Hant' | 'zh-Hans';

export interface LanguageInfo {
  id: LanguageId;
  /** Short tag rendered inside the UI badge. */
  badge: string;
  /** English name, e.g. "Traditional Chinese". */
  label: string;
  /** Native name, e.g. "繁體中文". */
  endonym: string;
  /** Valid BCP-47 tag — safe for `lang` / `hreflang` attributes. */
  bcp47: string;
  /** Canonical URL segment used by /article/<slug>/<id>/<headline>. */
  slug: string;
  /** Value accepted by /search?lang=. */
  searchCode: string;
  /** Regional edition that serves this language, if any. */
  subdomain: string | null;
  /** Timezone label appended to publication datestamps. */
  timezone: string;
  /** Writing system, shown in the details menu. */
  script: string;
  /** Plain-language explanation shown in the tooltip. */
  description: string;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  {
    id: 'en',
    badge: 'EN',
    label: 'English',
    endonym: 'English',
    bcp47: 'en',
    slug: 'english',
    searchCode: 'en',
    subdomain: 'www.acnnewswire.com',
    timezone: 'HKT/SGT',
    script: 'Latin',
    description:
      'English-language release. Publication times are shown in Hong Kong / Singapore time.',
  },
  {
    id: 'zh-Hant',
    badge: '繁中',
    label: 'Traditional Chinese',
    endonym: '繁體中文',
    bcp47: 'zh-Hant',
    slug: 'traditional-chinese',
    searchCode: 'zh-Hant',
    subdomain: 'ct.acnnewswire.com',
    timezone: 'HKT/SGT',
    script: 'Traditional Han',
    description:
      'Traditional Chinese release, as read in Hong Kong, Taiwan and Macau. Publication times are shown in Hong Kong / Singapore time.',
  },
  {
    id: 'zh-Hans',
    badge: '简中',
    label: 'Simplified Chinese',
    endonym: '简体中文',
    bcp47: 'zh-Hans',
    slug: 'simplified-chinese',
    searchCode: 'zh-Hans',
    subdomain: 'ch.acnnewswire.com',
    timezone: 'CST',
    script: 'Simplified Han',
    description:
      'Simplified Chinese release, as read in mainland China and Singapore. Publication times are shown in China Standard Time.',
  },
  {
    id: 'ja',
    badge: 'JA',
    label: 'Japanese',
    endonym: '日本語',
    bcp47: 'ja',
    slug: 'japanese',
    searchCode: 'ja',
    subdomain: 'jcnnewswire.com',
    timezone: 'JST',
    script: 'Japanese',
    description:
      'Japanese-language release, distributed through JCN Newswire. Publication times are shown in Japan Standard Time.',
  },
  {
    id: 'ko',
    badge: 'KO',
    label: 'Korean',
    endonym: '한국어',
    bcp47: 'ko',
    slug: 'korean',
    searchCode: 'ko',
    subdomain: 'kr.acnnewswire.com',
    timezone: 'KST',
    script: 'Hangul',
    description:
      'Korean-language release. Publication times are shown in Korea Standard Time.',
  },
];

// Every spelling seen in the API, the filter UI, the subdomain locales and the
// article URLs, plus the obvious near-misses. Written in normalised form: all
// lowercase, and `-` `_` `.` `/` collapsed to single spaces by normaliseKey().
//
// Deliberately absent: bare "chinese". It is genuinely ambiguous between
// Traditional and Simplified, and guessing would put a wrong flag on a real
// article. It resolves to null and renders verbatim instead.
const ALIASES: Record<LanguageId, readonly string[]> = {
  en: ['en', 'eng', 'english', 'en us', 'en gb', 'en au', 'en hk', 'en sg'],
  ja: ['ja', 'jp', 'jpn', 'japanese', 'ja jp', 'jp jp', '日本語'],
  ko: ['ko', 'kr', 'kor', 'korean', 'ko kr', 'kr kr', '한국어'],
  'zh-Hant': [
    'zh hant',
    'zh cht',
    'cht',
    'zh tw',
    'zh hk',
    'zh mo',
    'traditional chinese',
    'chinese traditional',
    'trad chinese',
    'traditional',
    'big5',
    '繁體中文',
    '正體中文',
    '繁體',
  ],
  'zh-Hans': [
    'zh hans',
    'zh cn',
    'zh chs',
    'chs',
    // Bare "zh" and "中文" follow the legacy ch.acnnewswire.com convention,
    // where the unqualified Chinese edition is Simplified.
    'zh',
    'zh sg',
    'simplified chinese',
    'chinese simplified',
    'simp chinese',
    'simplified',
    'gb2312',
    '简体中文',
    '简体',
    '中文',
  ],
};

const BY_ID = new Map<LanguageId, LanguageInfo>(LANGUAGES.map((l) => [l.id, l]));

const BY_ALIAS: Map<string, LanguageInfo> = (() => {
  const index = new Map<string, LanguageInfo>();
  for (const language of LANGUAGES) {
    // The canonical fields are always resolvable, alias list or not.
    const canonical = [
      language.id,
      language.badge,
      language.label,
      language.endonym,
      language.bcp47,
      language.slug,
      language.searchCode,
    ];
    for (const key of canonical) {
      index.set(normaliseKey(key), language);
    }
    for (const alias of ALIASES[language.id]) {
      index.set(alias, language);
    }
  }
  return index;
})();

/**
 * Case-, separator- and width-insensitive key for alias lookup.
 * "zh_Hant" / "ZH-HANT" / "zh hant" all collapse to "zh hant".
 */
function normaliseKey(raw: string): string {
  return raw
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[._\-/\\]+/g, ' ')
    .replace(/\s+/g, ' ');
}

const warned = new Set<string>();

/**
 * Resolve any known spelling of a language to its canonical record.
 * Returns null for unrecognised input rather than guessing.
 */
export function resolveLanguage(
  value: string | null | undefined,
): LanguageInfo | null {
  if (!value) return null;
  const hit = BY_ALIAS.get(normaliseKey(value)) ?? null;

  if (!hit && process.env.NODE_ENV !== 'production' && !warned.has(value)) {
    warned.add(value);
    console.warn(
      `[languages] Unrecognised language tag ${JSON.stringify(value)}. ` +
        `Add it to ALIASES in lib/languages.ts if it is legitimate.`,
    );
  }

  return hit;
}

export function getLanguage(id: LanguageId): LanguageInfo {
  const language = BY_ID.get(id);
  if (!language) throw new Error(`Unknown language id: ${id}`);
  return language;
}

/** Timezone label for a datestamp. Falls back to the English edition's zone. */
export function timezoneFor(value: string | null | undefined): string {
  return resolveLanguage(value)?.timezone ?? 'HKT/SGT';
}

/** Canonical article-URL segment. Falls back to English. */
export function slugFor(value: string | null | undefined): string {
  return resolveLanguage(value)?.slug ?? 'english';
}

/** Href to the filtered search listing for a language. */
export function searchHrefFor(language: LanguageInfo): string {
  return `/search?lang=${encodeURIComponent(language.searchCode)}`;
}
