// services/press-release.ts
import type { PressReleaseData } from '@/components/press-release/types';
import type { NewApiPressRelease, LegacyApiArticle } from './acn-api.types';
import { adaptNewApiPressRelease } from './acn-adapter';

const API_BASE = 'https://development.acnnewswire.com';

// The current API's press-release endpoint omits language, location, views,
// supplier, the origin URL, the full sector list and the company's social
// profiles — all of which the legacy endpoint still returns. We read both and
// merge rather than switch: the new API has the better body, images and
// summary, and is where this is heading. Drop this second call once the fields
// above land on /api/Articles/press-release.
const LEGACY_API_BASE = 'https://www.acnnewswire.com/acnnewswireapi';

async function fetchLegacyArticle(id: number): Promise<LegacyApiArticle | null> {
  try {
    const res = await fetch(`${LEGACY_API_BASE}/api/v1/News/GetArticleById/${id}`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as LegacyApiArticle;
  } catch {
    // Enrichment only — the page still renders from the primary response.
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
