// app/article/[...segments]/page.tsx
import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { PressRelease, InfiniteArticleFeed } from '@/components/press-release';
import { fetchPressRelease } from '@/services/press-release';
import { fetchCompanyArticles } from '@/services/company-articles';
import { fetchReleaseVersions } from '@/services/release-versions';
import { headlineToSlug, languageToSlug } from '@/services/acn-adapter';
import { generateArticleMetadata, SITE_URL, SITE_NAME } from '@/lib/metadata';

type Props = {
  params: Promise<{ segments: string[] }>
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

  let id: string;
  let lang: string | undefined;
  let slug: string | undefined;

  if (segments.length === 1) {
    [id] = segments;
  } else if (segments.length === 2) {
    // could be [id, slug] or [lang, id]
    if (!isNaN(Number(segments[0]))) {
      [id, slug] = segments;   // numeric first = id/slug
    } else {
      [lang, id] = segments;   // non-numeric first = lang/id
    }
  } else {
    [lang, id, slug] = segments;
  }

  const numericId = Number(id);
  if (isNaN(numericId)) notFound();

  try {
    const data = await fetchPressRelease(numericId);
    const correctSlug = headlineToSlug(data.headline, numericId);
    const correctLang = languageToSlug(data.language ?? 'english');

    if (slug !== correctSlug || lang !== correctLang) {
      redirect(`/article/${correctLang}/${id}/${correctSlug}`);
    }

    // Fetch related articles after the redirect check — compId is only known from data
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
    if (isRedirectError(e)) throw e; // ← let Next.js handle its own redirect
    notFound();
  }
}
