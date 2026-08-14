// Regression check for the language registry.
//
// The alias table is the thing most likely to drift as the backend adds or
// renames language values, so every spelling that appears anywhere in the
// codebase or the live feed is pinned here.
//
// No test runner is wired up in this repo yet. Run it directly with:
//   npx tsx src/lib/__tests__/languages.test.ts

import { resolveLanguage, timezoneFor, slugFor, LANGUAGES } from '../languages';

const CASES: Array<[string, string | null]> = [
  // Raw API values present in the live feed today
  ['English', 'en'],
  ['Japanese', 'ja'],
  ['Traditional Chinese', 'zh-Hant'],
  ['Simplified Chinese', 'zh-Hans'],

  // Search codes (?lang=, SearchSidebar, Language mega menu)
  ['en', 'en'],
  ['ja', 'ja'],
  ['ko', 'ko'],
  ['zh-Hant', 'zh-Hant'],
  ['zh-Hans', 'zh-Hans'],

  // Subdomain locale codes (TopNav/types.ts, next.config rewrites)
  ['zh-CN', 'zh-Hans'],
  ['zh-CHT', 'zh-Hant'],
  ['ko-KR', 'ko'],
  ['ja-JP', 'ja'],

  // Article URL slugs
  ['english', 'en'],
  ['traditional-chinese', 'zh-Hant'],
  ['simplified-chinese', 'zh-Hans'],

  // Separator, case and whitespace variants
  ['zh_Hant', 'zh-Hant'],
  ['ZH-HANT', 'zh-Hant'],
  ['  Japanese  ', 'ja'],
  ['zh.hans', 'zh-Hans'],
  ['EN_US', 'en'],

  // Endonyms
  ['日本語', 'ja'],
  ['한국어', 'ko'],
  ['繁體中文', 'zh-Hant'],
  ['简体中文', 'zh-Hans'],

  // Regional and legacy encodings
  ['zh-TW', 'zh-Hant'],
  ['zh-HK', 'zh-Hant'],
  ['big5', 'zh-Hant'],
  ['zh', 'zh-Hans'],

  // Deliberately unresolved — "Chinese" alone is ambiguous, and guessing would
  // put a wrong tag on a real article.
  ['Chinese', null],
  ['Klingon', null],
  ['', null],
];

let failed = 0;

for (const [input, expected] of CASES) {
  const actual = resolveLanguage(input)?.id ?? null;
  if (actual !== expected) {
    failed++;
    console.error(`FAIL  resolveLanguage(${JSON.stringify(input)}) → ${actual}, expected ${expected}`);
  }
}

// Timezones must resolve from codes as well as display names. The previous
// exact-match table silently fell back to HKT/SGT for every code form.
const TIMEZONES: Array<[string, string]> = [
  ['Simplified Chinese', 'CST'],
  ['zh-Hans', 'CST'],
  ['zh-CN', 'CST'],
  ['Japanese', 'JST'],
  ['ja-JP', 'JST'],
  ['Korean', 'KST'],
  ['English', 'HKT/SGT'],
];

for (const [input, expected] of TIMEZONES) {
  const actual = timezoneFor(input);
  if (actual !== expected) {
    failed++;
    console.error(`FAIL  timezoneFor(${JSON.stringify(input)}) → ${actual}, expected ${expected}`);
  }
}

// Every spelling of one language must produce a single canonical article URL,
// otherwise /article/[...segments] redirects between two addresses for the
// same release.
for (const group of [
  ['Traditional Chinese', 'zh-Hant', 'zh-CHT', 'zh-TW'],
  ['Simplified Chinese', 'zh-Hans', 'zh-CN'],
  ['Japanese', 'ja', 'ja-JP', '日本語'],
]) {
  const slugs = new Set(group.map(slugFor));
  if (slugs.size !== 1) {
    failed++;
    console.error(`FAIL  ${group.join(', ')} produced ${slugs.size} slugs: ${[...slugs].join(', ')}`);
  }
}

if (failed === 0) {
  console.log(`languages: all ${CASES.length + TIMEZONES.length + 3} checks passed across ${LANGUAGES.length} languages.`);
} else {
  console.error(`languages: ${failed} check(s) failed.`);
  process.exitCode = 1;
}
