// services/reading-mode.ts

export type ReadingMode = 'chronological' | 'company' | 'sector';

// Stub — will be driven by user account preferences later
export function getReadingMode(): ReadingMode {
  return 'chronological';
}

export async function getNextArticleId(
  currentId: number,
  mode: ReadingMode,
  context?: { companyId?: number; sectorId?: number }
): Promise<number | null> {
  switch (mode) {
    case 'chronological':
      return getNextChronological(currentId);
    case 'company':
      // stub — will use context.companyId once accounts exist
      return getNextChronological(currentId);
    case 'sector':
      // stub — will use context.sectorId once accounts exist
      return getNextChronological(currentId);
  }
}

async function getNextChronological(currentId: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://development.acnnewswire.com/api/Articles?Page=1&Size=20`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const articles: { articleId: number }[] = await res.json();
    const idx = articles.findIndex(a => a.articleId === currentId);
    // articles are newest-first, so next chronologically = idx + 1
    return idx !== -1 && idx + 1 < articles.length ? articles[idx + 1].articleId : null;
  } catch {
    return null;
  }
}
