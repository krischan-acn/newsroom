import type { Metadata } from 'next';
import type { PressReleaseData } from '@/components/press-release/types';
import type { CompanyProfile } from '@/services/company-profile';
import { headlineToSlug, languageToSlug } from '@/services/acn-adapter';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.acnnewswire.com';
export const SITE_NAME = 'ACN Newswire';
const SITE_DESCRIPTION = 'The top Asian News Network for 20 years and counting.';

export function generateBaseMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    icons: {
      icon: [
        { url: '/icons/favicon.svg', type: 'image/svg+xml' },
        { url: '/icons/16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/icons/32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/icons/512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      other: [
        { rel: 'mask-icon', url: '/icons/favicon.svg' },
      ],
    },
    manifest: '/site.webmanifest',
    openGraph: {
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
    },
    robots: { index: true, follow: true },
  };
}

export function generateArticleMetadata(article: PressReleaseData): Metadata {
  const lang = languageToSlug(article.language ?? 'english');
  const slug = headlineToSlug(article.headline, article.id);
  const canonical = `${SITE_URL}/article/${lang}/${article.id}/${slug}`;
  const ogImage = `${SITE_URL}/api/og/article/${article.id}`;
  const description = (article.bodyText ?? '').slice(0, 160) || article.headline;

  return {
    title: article.headline,
    description,
    openGraph: {
      title: article.headline,
      description,
      type: 'article',
      publishedTime: article.dateTime,
      authors: [article.source],
      tags: article.sector,
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.headline }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.headline,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical,
    },
  };
}

export function generateListingMetadata(
  type: 'search' | 'events' | 'news',
  query?: string,
): Metadata {
  const configs = {
    search: {
      title: query ? `Search: "${query}"` : 'Search',
      description: query
        ? `Find press releases about "${query}" on ACN Newswire.`
        : 'Search ACN Newswire for press releases, company news, and events across Asia.',
      canonical: `${SITE_URL}/search`,
      index: false,
    },
    events: {
      title: 'Events',
      description: 'Browse upcoming and past events featured on ACN Newswire.',
      canonical: `${SITE_URL}/events`,
      index: true,
    },
    news: {
      title: 'All Press Releases',
      description:
        'The latest press releases and news from companies across Asia on ACN Newswire.',
      canonical: `${SITE_URL}/news`,
      index: true,
    },
  };

  const { title, description, canonical, index } = configs[type];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: { canonical },
    robots: { index, follow: true },
  };
}

export function generateCompanyMetadata(
  profile: CompanyProfile | null,
  id: string,
): Metadata {
  const name = profile?.name ?? `Company ${id}`;
  const title = `${name} Press Releases`;
  const description =
    profile?.description[0]?.slice(0, 160) ||
    `Browse the latest press releases from ${name} on ACN Newswire.`;
  const canonical = `${SITE_URL}/company/${id}`;
  // logoSrc is already an absolute URL on CompanyProfile.
  const logoUrl = profile?.logoSrc ?? null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(logoUrl && { images: [{ url: logoUrl, alt: `${name} logo` }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(logoUrl && { images: [logoUrl] }),
    },
    alternates: { canonical },
  };
}
