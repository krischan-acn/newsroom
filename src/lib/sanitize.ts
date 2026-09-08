// lib/sanitize.ts
// NOTE: DOMPurify/jsdom cannot run in the serverless bundle (ESM conflict), so
// everything here is regex-only and needs no DOM.
//
// DOMPurify still does the authoritative pass on the article body, but only in
// the browser. Marking Body.tsx 'use client' does NOT keep it off the server —
// a client component is still server-rendered on first paint, and calling
// DOMPurify.sanitize there threw "sanitize is not a function" and 500'd every
// article page. sanitizeArticleHtml below is the server half of that split.

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

// ---------------------------------------------------------------------------
// Article body HTML
// ---------------------------------------------------------------------------

/**
 * The one allowlist for article body HTML. Body.tsx hands these to DOMPurify in
 * the browser and sanitizeArticleHtml applies them on the server, so the two
 * passes cannot drift apart.
 */
export const ARTICLE_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'div', 'span',
  'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
] as const;

export const ARTICLE_ALLOWED_ATTR = [
  'src', 'alt', 'class', 'href', 'target', 'rel',
  'width', 'height', 'align', 'border', 'cellpadding', 'cellspacing',
] as const;

const ALLOWED_TAG_SET: ReadonlySet<string> = new Set(ARTICLE_ALLOWED_TAGS);
const ALLOWED_ATTR_SET: ReadonlySet<string> = new Set(ARTICLE_ALLOWED_ATTR);

/** Elements whose *content* is unsafe, so the content is dropped with the tag. */
const VOIDED_ELEMENTS = 'script|style|noscript|template|iframe|object|embed|svg|math';
const VOIDED_WITH_CONTENT = new RegExp(
  `<(${VOIDED_ELEMENTS})\\b[\\s\\S]*?<\\/\\1\\s*>`,
  'gi',
);
/** The same elements left unclosed — drop the tag so nothing dangles. */
const VOIDED_BARE = new RegExp(`<\\/?(?:${VOIDED_ELEMENTS})\\b[^>]*>`, 'gi');

const TAG = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+))/g;

/**
 * javascript:, vbscript: and non-image data: URLs, however they are spelled.
 * Entities are decoded and whitespace/control characters removed first, so the
 * classic tab- and entity-obfuscated forms collapse to the same string.
 */
function isUnsafeUrl(value: string): boolean {
  const flat = decodeHtmlEntities(value)
    .replace(/[\s\u0000-\u001f]/g, '')
    .toLowerCase();
  if (/^(?:javascript|vbscript|file):/.test(flat)) return true;
  if (flat.startsWith('data:') && !flat.startsWith('data:image/')) return true;
  return false;
}

/**
 * Server-side article body sanitiser: allowlisted tags and attributes only, no
 * DOM required.
 *
 * This is the SSR half of a two-pass split, not the last line of defence —
 * DOMPurify re-sanitises the same markup in the browser as soon as Body.tsx
 * hydrates. A regex pass cannot match a real HTML parser on adversarial input,
 * so it is deliberately conservative: anything it is unsure of is dropped.
 */
export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html) return '';

  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(VOIDED_WITH_CONTENT, '')
    .replace(VOIDED_BARE, '');

  return stripped.replace(
    TAG,
    (_match, closing: string | undefined, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      // Unknown tag: drop the tag, keep whatever text it wrapped.
      if (!ALLOWED_TAG_SET.has(name)) return '';
      if (closing) return `</${name}>`;

      const kept: string[] = [];
      for (const attr of rawAttrs.matchAll(ATTR)) {
        const attrName = attr[1].toLowerCase();
        const value = attr[2] ?? attr[3] ?? attr[4] ?? '';

        // on* handlers are never allowed, allowlist or not.
        if (attrName.startsWith('on')) continue;
        if (!ALLOWED_ATTR_SET.has(attrName)) continue;
        if ((attrName === 'href' || attrName === 'src') && isUnsafeUrl(value)) continue;

        kept.push(`${attrName}="${value.replace(/"/g, '&quot;')}"`);
      }

      return kept.length > 0 ? `<${name} ${kept.join(' ')}>` : `<${name}>`;
    },
  );
}
