// services/release-versions.ts
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │ STUB — awaiting backend support. Nothing here calls a real endpoint yet. │
// └──────────────────────────────────────────────────────────────────────────┘
//
// WHAT THIS IS FOR
// ACN publishes the same release in several languages. Today each translation
// is a separate article with its own id and no field tying it to its siblings:
//
//   108786  Jul 29 20:08  "ispace and Mitsubishi Heavy Industries Agree to…"   (English)
//   108773  Jul 29 14:30  "ispaceと三菱重工、H3ロケットによる新ランダー「ULTRA」…"  (Japanese)
//
// The sidebar wants to offer those to the reader the way Businesswire does, as
// a row of language pills. We cannot build that from the data we get now.
//
// WHY WE ARE NOT GUESSING
// The obvious heuristic — same company, same day, different language — is wrong
// on real records:
//
//   * MHIEC Nagasaki: English published Jun 30 22:04, Japanese Jun 29 11:30.
//     Different calendar days, so a same-day match misses the pair entirely.
//   * Articles 108499 and 108500 share an identical publish timestamp and the
//     same company, but are two unrelated releases. A same-day match would
//     link them and tell the reader one is a translation of the other.
//
// A wrong link here is worse than a missing block: the UI asserts "this is the
// same release in Japanese", and readers act on that.
//
// WHAT THE BACKEND NEEDS TO PROVIDE
// Any one of these unblocks the feature; the first is the cheapest:
//
//   1. A `releaseGroupId` (or `parentArticleId`) on the article record, shared
//      by every translation of one release. Then this module becomes a call to
//      /api/Articles?releaseGroupId={id} and the guesswork disappears.
//   2. A dedicated /api/Articles/{id}/versions endpoint returning the siblings
//      directly — the shape below is what the UI consumes.
//   3. Failing both, `language` on every article plus the group id above; the
//      language alone is not enough.
//
// Whichever lands, replace fetchReleaseVersions() and delete this comment. The
// component already renders the populated state — see ReleaseVersions in
// components/press-release/ArticleSidebar.tsx.

import { resolveLanguage } from '@/lib/languages';
import { headlineToSlug, languageToSlug } from './acn-adapter';

/** One language edition of a release. */
export interface ReleaseVersion {
  articleId: number;
  /** Any known spelling; resolved through lib/languages for display. */
  language: string;
  /** Display label, e.g. "Japanese". */
  label: string;
  /** Path to this edition, or null for the edition being viewed. */
  href: string | null;
  /** True for the article currently on screen. */
  isCurrent: boolean;
}

/** Article fields this module needs in order to describe a version. */
export interface ReleaseVersionSource {
  id: number;
  headline: string;
  language?: string | null;
}

function toVersion(article: ReleaseVersionSource, isCurrent: boolean): ReleaseVersion | null {
  const resolved = resolveLanguage(article.language);
  // Unknown language tags render verbatim elsewhere, but a pill with no label
  // is not worth showing — skip rather than print a blank chip.
  const label = resolved?.label ?? article.language;
  if (!label) return null;

  return {
    articleId: article.id,
    language: article.language ?? label,
    label,
    href: isCurrent
      ? null
      : `/article/${languageToSlug(article.language ?? 'english')}/${article.id}/${headlineToSlug(article.headline, article.id)}`,
    isCurrent,
  };
}

/**
 * The language editions of a release, current edition first.
 *
 * Currently returns only the article it was handed: with no grouping key in the
 * API there is no way to discover its siblings. Once the backend supplies one
 * (see the header comment), fetch them here and map each through toVersion() —
 * the return shape and the component consuming it do not need to change.
 */
export async function fetchReleaseVersions(
  article: ReleaseVersionSource,
): Promise<ReleaseVersion[]> {
  const current = toVersion(article, true);
  if (!current) return [];

  // TODO(backend: releaseGroupId) — replace with the sibling lookup:
  //   const siblings = await getJson(`${API_BASE}/api/Articles?releaseGroupId=${groupId}`);
  //   return [current, ...siblings.filter(s => s.id !== article.id).map(s => toVersion(s, false))]
  //     .filter(Boolean);
  return [current];
}

/**
 * True when the backend can actually group translations. Flips to a real check
 * once the grouping key exists; until then the sidebar uses it to decide
 * whether the block is showing a complete picture or just the current edition.
 */
export const RELEASE_VERSIONS_SUPPORTED = false;
