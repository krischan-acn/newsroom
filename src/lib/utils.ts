// /lib/utils.ts
export function decodeHtmlEntities(str: string): string {
  if (typeof window === 'undefined') {
    return str
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
  }
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

// lib/utils.ts — add to your existing file
const TIMEZONE_BY_LANGUAGE: Record<string, string> = {
  'Japanese': 'JST',
  'Korean': 'KST',
  'Simplified Chinese': 'CST',
  'Traditional Chinese': 'HKT/SGT',
  'English': 'HKT/SGT',
};

export function formatDateTime(raw: string, language?: string | null): string {
  const tz = TIMEZONE_BY_LANGUAGE[language ?? ''] ?? 'HKT/SGT';

  // ISO format: "2026-06-05T12:14:00"
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  if (iso) {
    const [, year, month, day, time] = iso;
    const monthShort = new Date(`${year}-${month}-${day}`).toLocaleString('en', { month: 'short' });
    return `${monthShort} ${Number(day)}, ${year} ${time} ${tz}`;
  }

  // Legacy format: "Thu, 05 Jun 2026 12:14"
  const legacy = raw.match(/\w+,\s+(\d+)\s+(\w+)\s+(\d{4})\s+(\d{2}:\d{2})/);
  if (legacy) {
    const [, day, month, year, time] = legacy;
    const monthShort = new Date(`${month} 1`).toLocaleString('en', { month: 'short' });
    return `${monthShort} ${day}, ${year} ${time} ${tz}`;
  }

  return raw;
}