import { Suspense } from 'react';
import { HomeHero } from '@/components/features/home/HomeHero';
import { CategoryRow } from '@/components/features/home/CategoryRow';
import { EventsRow } from '@/components/features/home/EventsRow';
import { FeaturedReleases, type FeaturedItem } from '@/components/features/home/FeaturedReleases';
import {
  HomeCardRowSkeleton,
  HomeFeaturedSkeleton,
  HomeHeroSkeleton,
} from '@/components/features/home/HomeSkeletons';
import { CATEGORIES, type CategoryConfig } from '@/config/categories';
import { fetchArticlesByIndustry, fetchHeroSlides, type NewsListItem } from '@/services/news-list';
import { fetchEvents, type Event } from '@/services/events';
import { fetchPressRelease } from '@/services/press-release';
import type { PressReleaseData } from '@/types/press-release';

// This page used to be one `await Promise.all([...])` over fourteen calls: the
// hero pool, the FULL events sweep, five individual press releases and nine
// category rows. Parallel, but still a single gate - nothing reached the
// browser until the slowest of the fourteen came back, and the slowest was
// fetchEvents(), which swept the events endpoint SEQUENTIALLY page by page.
// One cold cache entry there held the entire home page blank. (That sweep is
// gone as of the /api/Events/full migration - it is one request now - but the
// per-band Suspense split below is what keeps any ONE slow call from holding
// the page, so it stands on its own.)
//
// Now each band is its own async server component behind its own Suspense
// boundary. React still starts all of their fetches concurrently - siblings
// render in parallel - but each band paints the moment ITS data lands instead
// of waiting on its neighbours. The hero, which is the fastest and the only
// thing above the fold, is typically on screen while the rows are still in
// flight.
//
// Note the default export is no longer async: the shell, the nav and every
// fallback now flush immediately.
//
// These band components are page body, not reusable components - they stay in
// this file for the same reason app/events/[eventId]/LiveEvent.tsx stays beside
// its route (BIBLE section 2). Nothing else may import them.

async function HeroBand() {
  const slides = await fetchHeroSlides(5).catch((): NewsListItem[] => []);
  return <HomeHero slides={slides} />;
}

async function EventsBand() {
  const events = await fetchEvents().catch((): Event[] => []);
  return <EventsRow events={events} />;
}

/** The ids the featured band is curated from. Hand-picked, in display order. */
const FEATURED_LEAD_ID = 85791;
const FEATURED_IDS = [107246, 107300, 107292, 107230] as const;

/** Per-article art direction for the curated band, keyed by id. */
const FEATURED_PHOTO_OVERRIDES: Record<number, string[]> = {
  107300: ['/images/city/tokyo.avif'],
  107292: ['/images/city/hong-kong.avif'],
};

async function FeaturedBand() {
  const [lead, ...rest] = await Promise.all([
    fetchPressRelease(FEATURED_LEAD_ID).catch((): PressReleaseData | null => null),
    ...FEATURED_IDS.map((id) =>
      fetchPressRelease(id).catch((): PressReleaseData | null => null),
    ),
  ]);

  if (!lead) return null;

  const companyName = (pr: PressReleaseData) => pr.companies?.[0]?.company_Name;

  const articles: FeaturedItem[] = rest
    .filter((pr): pr is PressReleaseData => pr !== null)
    .map((pr) => ({
      ...pr,
      companyName: companyName(pr),
      ...(FEATURED_PHOTO_OVERRIDES[pr.id] ? { photo: FEATURED_PHOTO_OVERRIDES[pr.id] } : {}),
    }));

  return (
    <FeaturedReleases
      featuredArticle={{ ...lead, companyName: companyName(lead) }}
      featuredImageUrl="/images/sector/environment/1.avif"
      articles={articles}
    />
  );
}

async function CategoryBand({ category }: { category: CategoryConfig }) {
  const items = await fetchArticlesByIndustry(category.apiIndustry).catch(
    (): NewsListItem[] => [],
  );
  return (
    <CategoryRow
      title={category.title}
      exploreLabel={category.exploreLabel}
      items={items}
    />
  );
}

export default function Home() {
  return (
    <main>
      <h1 className="sr-only">ACN Newswire Newsroom</h1>

      <Suspense fallback={<HomeHeroSkeleton />}>
        <HeroBand />
      </Suspense>

      <Suspense fallback={<HomeCardRowSkeleton title="Events" />}>
        <EventsBand />
      </Suspense>

      <Suspense fallback={<HomeFeaturedSkeleton />}>
        <FeaturedBand />
      </Suspense>

      {/* Each category row streams independently, and its heading is real text
          in the fallback - the title is known from config, so there is no
          reason to make the reader wait to learn which row is loading. */}
      {CATEGORIES.map((category) => (
        <Suspense key={category.slug} fallback={<HomeCardRowSkeleton title={category.title} />}>
          <CategoryBand category={category} />
        </Suspense>
      ))}
    </main>
  );
}
