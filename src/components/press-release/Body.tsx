// press-release/Body.tsx
'use client';

import { useEffect, useState } from 'react';
import DOMpurify from 'dompurify';
import {
  ARTICLE_ALLOWED_ATTR,
  ARTICLE_ALLOWED_TAGS,
  sanitizeArticleHtml,
} from '@/lib/sanitize';

interface BodyProps {
  content: string;
  className?: string;
}

/**
 * 'use client' marks where hydration begins — it does not keep this component
 * off the server. React still renders it during SSR, and DOMPurify has no DOM
 * there: calling it server-side threw "sanitize is not a function" and 500'd
 * every article page.
 *
 * So the body is sanitised twice against one shared allowlist in lib/sanitize:
 *
 *   1. a regex pass (sanitizeArticleHtml, no DOM) renders on the server, so the
 *      markup in the SSR payload is already filtered and crawlers see the
 *      article text rather than an empty div;
 *   2. DOMPurify's real parser re-sanitises it in the browser after mount, and
 *      is the authoritative pass.
 *
 * The upgrade happens in an effect rather than inline so the first client
 * render is byte-identical to the server's — the two sanitisers do not agree
 * character for character, and swapping the markup mid-hydration would be a
 * mismatch. Same null-until-mount shape the event components use.
 */
export function Body({ content, className = '' }: BodyProps) {
  const [purified, setPurified] = useState<string | null>(null);

  useEffect(() => {
    if (!content) return;
    setPurified(
      DOMpurify.sanitize(content, {
        ALLOWED_TAGS: [...ARTICLE_ALLOWED_TAGS],
        ALLOWED_ATTR: [...ARTICLE_ALLOWED_ATTR],
      }),
    );
  }, [content]);

  if (!content) return null;

  const sanitizedContent = purified ?? sanitizeArticleHtml(content);

  return (
    <div
      className={`article-body prose prose-lg max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
