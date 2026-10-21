// app/article/[...segments]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PressRelease, InfiniteArticleFeed } from '@/components/features/article';
import { fetchPressRelease, PressReleaseNotFoundError } from '@/services/press-release';
import { fetchCompanyArticles } from '@/services/company-articles';
import { fetchReleaseVersions } from '@/services/release-versions';
import { headlineToSlug, languageToSlug } from '@/services/acn-adapter';
import { generateArticleMetadata, SITE_URL, SITE_NAME } from '@/lib/metadata';

type Props = {
  params: Promise<{ segments: string[] }>
}

// An empty list prerenders nothing at build time but opts the route into ISR:
// each article is rendered on its first visit, then served from cache and
// revalidated in the background (the fetches carry revalidate: 3600). Without
// this export the route was fully dynamic - every view, including the bare
// /article/<id> -> canonical redirect, re-rendered on the server and re-called
// the API, sent as Cache-Control: private, no-store, so no CDN could hold it.
export function generateStaticParams() {
  return [];
}

function extractId(segments: string[]): string | null {
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];
  if (segments.length === 2) {
    return !isNaN(Number(segments[0])) ? segments[0] : segments[1];
  }
  return segments[1]; // [lang, id, slug...]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments } = await params;
  const id = extractId(segments);
  const numericId = Number(id);
  if (!id || isNaN(numericId)) return {};

  try {
    const article = await fetchPressRelease(numericId);
    return generateArticleMetadata(article);
  } catch {
    return {};
  }
}

export default async function ArticlePage({ params }: Props) {
  const { segments } = await params;
  const numericId = Number(extractId(segments));
  if (isNaN(numericId)) notFound();

  try {
    const data = await fetchPressRelease(numericId);
    const correctSlug = headlineToSlug(data.headline, numericId);
    const correctLang = languageToSlug(data.language ?? 'english');

    // No redirect to the canonical path. Every home and list link is the bare
    // /article/<id>, and on a cached (ISR) route a redirect() cannot send a 307 -
    // it bakes a 200 with a 1-second <meta refresh> into the page instead. The
    // article renders at whatever URL it was asked for; generateArticleMetadata
    // points search engines at the canonical one, and InfiniteArticleFeed
    // rewrites the address bar to it.

    // Fetch related articles once the release is known — compId only comes from data
    const [relatedArticles, versions] = await Promise.all([
      fetchCompanyArticles(data.companies?.[0]?.comp_ID),
      fetchReleaseVersions({ id: data.id, headline: data.headline, language: data.language }),
    ]);

    const canonical = `${SITE_URL}/article/${correctLang}/${data.id}/${correctSlug}`;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: data.headline,
      description: (data.bodyText ?? '').slice(0, 200) || data.headline,
      datePublished: data.dateTime,
      author: [{ '@type': 'Organization', name: data.source }],
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.svg` },
      },
      image: data.photo?.[0] ?? `${SITE_URL}/api/og/article/${data.id}`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <main>
          <div id="article-first-wrapper">
            <PressRelease
              data={data}
              relatedArticles={relatedArticles}
              versions={versions}
            />
          </div>
          <InfiniteArticleFeed
            firstId={data.id}
            firstArticle={{ id: data.id, lang: correctLang, slug: correctSlug }}
          />
        </main>
      </>
    );
  } catch (e) {
    // Only a real 404 becomes notFound(). This page is cached now, so turning a
    // timeout or a 5xx into a 404 would pin the article as missing for the whole
    // revalidate window. Rethrowing leaves the last good copy in place instead.
    if (e instanceof PressReleaseNotFoundError) notFound();
    throw e;
  }
}
