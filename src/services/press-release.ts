// services/press-release.ts
import type { PressReleaseData } from '@/components/press-release/types';
import type { NewApiPressRelease, LegacyApiArticle } from './acn-api.types';
import { adaptNewApiPressRelease } from './acn-adapter';

const API_BASE = 'https://development.acnnewswire.com';

// The current API's press-release endpoint omits language, location, views,
// supplier and the origin URL — all of which the legacy endpoint still returns.
// We read both and merge rather than switch: the new API has the better body,
// images, summary and (since 2026-09-08) a proper sectors array, but only the
// legacy record knows the language, and without it every article canonicalises
// to /article/english/… regardless of what it is written in.
//
// Drop this second call once those fields land on /api/Articles/press-release.
const LEGACY_API_BASE = 'https://www.acnnewswire.com/acnnewswireapi';

// This host has been 503 since 2026-08-27. Next does not cache a failed
// response, so without a bound every article render re-attempts a dead host and
// waits on it — the primary call is already done by then. Enrichment is
// optional by definition, so it gets a short leash rather than the page's time.
const LEGACY_TIMEOUT_MS = 2000;

async function fetchLegacyArticle(id: number): Promise<LegacyApiArticle | null> {
  try {
    const res = await fetch(`${LEGACY_API_BASE}/api/v1/News/GetArticleById/${id}`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(LEGACY_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as LegacyApiArticle;
  } catch {
    // Enrichment only — including on timeout, the page still renders in full
    // from the primary response.
    return null;
  }
}

export async function fetchPressRelease(id: number): Promise<PressReleaseData> {
  const [res, legacy] = await Promise.all([
    fetch(`${API_BASE}/api/Articles/press-release/${id}`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
    }),
    fetchLegacyArticle(id),
  ]);

  if (!res.ok) {
    throw new Error(`API error ${res.status} for press release ${id}`);
  }

  const raw: NewApiPressRelease = await res.json();
  return adaptNewApiPressRelease(raw, legacy);
}
