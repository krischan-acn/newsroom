// services/press-release.ts
import type { PressReleaseData } from '@/components/press-release/types';
import type { NewApiPressRelease } from './acn-api.types';
import { adaptNewApiPressRelease } from './acn-adapter';

const API_BASE = 'https://development.acnnewswire.com';

export async function fetchPressRelease(id: number): Promise<PressReleaseData> {
  const res = await fetch(
    `${API_BASE}/api/Articles/press-release/${id}`,
    {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
    },
  );

  if (!res.ok) {
    throw new Error(`API error ${res.status} for press release ${id}`);
  }

  const raw: NewApiPressRelease = await res.json();
  return adaptNewApiPressRelease(raw);
}
