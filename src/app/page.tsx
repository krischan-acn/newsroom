import { HomeHero } from '@/components/home/HomeHero';
import { CategoryRow } from '@/components/home/CategoryRow';
import { EventsRow } from '@/components/home/EventsRow';
import { FeaturedReleases, type FeaturedItem } from '@/components/home/FeaturedReleases';
import { CATEGORIES } from '@/config/categories';
import { fetchArticlesByIndustry, fetchHeroSlides, type NewsListItem } from '@/services/news-list';
import { fetchEvents, type Event } from '@/services/events';
import { fetchPressRelease } from '@/services/press-release';
import type { PressReleaseData } from '@/components/press-release/types';

export default async function Home() {
  const [
    [heroSlides, events, featured, article107246, article107300, article107292, article107230],
    categoryItems,
  ] = await Promise.all([
    Promise.all([
      fetchHeroSlides(5).catch((): NewsListItem[] => []),
      fetchEvents().catch((): Event[] => []),
      fetchPressRelease(85791).catch((): PressReleaseData | null => null),
      fetchPressRelease(107246).catch((): PressReleaseData | null => null),
      fetchPressRelease(107300).catch((): PressReleaseData | null => null),
      fetchPressRelease(107292).catch((): PressReleaseData | null => null),
      fetchPressRelease(107230).catch((): PressReleaseData | null => null),
    ]),
    Promise.all(
      CATEGORIES.map(cat => fetchArticlesByIndustry(cat.slug).catch((): NewsListItem[] => [])),
    ),
  ]);

  const featuredImageUrl = '/images/sector/environment/1.avif';

  const cn = (pr: PressReleaseData) => pr.companies?.[0]?.company_Name;

  const featuredArticles: FeaturedItem[] = [
    ...(article107246 ? [{ ...article107246, companyName: cn(article107246) }] : []),
    ...(article107300 ? [{ ...article107300, photo: ['/images/city/tokyo.avif'], companyName: cn(article107300) }] : []),
    ...(article107292 ? [{ ...article107292, photo: ['/images/city/hong-kong.avif'], companyName: cn(article107292) }] : []),
    ...(article107230 ? [{ ...article107230, companyName: cn(article107230) }] : []),
  ];

  return (
    <main>
      <h1 className="sr-only">ACN Newswire Newsroom</h1>
      <HomeHero slides={heroSlides} />
      <EventsRow events={events} />
      {featured && (
        <FeaturedReleases
          featuredArticle={{ ...featured, companyName: cn(featured) }}
          featuredImageUrl={featuredImageUrl}
          articles={featuredArticles}
        />
      )}
      {CATEGORIES.map((category, i) => (
        <CategoryRow
          key={category.slug}
          title={category.title}
          exploreLabel={category.exploreLabel}
          items={categoryItems[i] ?? []}
        />
      ))}
    </main>
  );
}
