import type { NewsListItem } from '@/services/news-list';
import { getArticleCategories } from '@/lib/sector-mapper';

export interface CategoryConfig {
  slug: string;
  title: string;
  exploreLabel: string;
  matches: (item: NewsListItem) => boolean;
}

const bySectorType = (sectorType: string) =>
  (item: NewsListItem) =>
    getArticleCategories(item.sector).includes(sectorType);

export const CATEGORIES: readonly CategoryConfig[] = [
  {
    slug: 'business',
    title: 'Business',
exploreLabel: 'Explore Business',
    matches: bySectorType('Business'),
  },
  {
    slug: 'communications',
    title: 'Communications',
exploreLabel: 'Explore Communications',
    matches: bySectorType('Communications'),
  },
  {
    slug: 'cryptocurrency',
    title: 'Cryptocurrency',
    exploreLabel: 'Explore Cryptocurrency',
    matches: bySectorType('Cryptocurrency'),
  },
  {
    slug: 'finance',
    title: 'Finance',
    exploreLabel: 'Explore Finance',
    matches: bySectorType('Financial'),
  },
  {
    slug: 'industrial',
    title: 'Industrial',
    exploreLabel: 'Explore Industrial',
    matches: bySectorType('Industrial'),
  },
  {
    slug: 'healthcare',
    title: 'Healthcare',
exploreLabel: 'Explore Healthcare',
    matches: bySectorType('Medicine'),
  },
  {
    slug: 'lifestyle',
    title: 'Lifestyle',
exploreLabel: 'Explore Lifestyle',
    matches: bySectorType('Lifestyle'),
  },
  {
    slug: 'sustainability',
    title: 'Sustainability',
exploreLabel: 'Explore Sustainability',
    matches: bySectorType('Sustainability'),
  },
  {
    slug: 'technology',
    title: 'Technology',
exploreLabel: 'Explore Technology',
    matches: bySectorType('Technology'),
  },
] as const;
