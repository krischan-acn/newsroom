// lib/sanitize.ts
// NOTE: DOMPurify/jsdom cannot run in the Vercel serverless bundle (ESM conflict).
// Server-side: we only need entity decoding + tag stripping, no DOM required.
// DOMPurify is used ONLY in Body.tsx (client component, runs in the browser).

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&bull;/g, '•')
    .replace(/&middot;/g, '·')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
}

// Strip all HTML tags (no DOM needed — just regex, safe for plain text fields)
function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

// Strip all tags except safe inline formatting
function stripUnsafeTags(text: string): string {
  return text.replace(/<(?!\/?(?:em|strong|b|i)\b)[^>]*>/gi, '');
}

export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return stripTags(decodeHtmlEntities(text)).trim();
}

export function sanitizeHeadline(text: string | null | undefined): string {
  if (!text) return '';
  return stripUnsafeTags(decodeHtmlEntities(text)).trim();
}