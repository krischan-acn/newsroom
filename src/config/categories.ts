export interface CategoryConfig {
  /** URL slug and React key. */
  slug: string;
  title: string;
  exploreLabel: string;
  /**
   * The value sent to /api/Articles/by-industry. This is the sector *type*, not
   * the slug: the endpoint matches on the taxonomy name, so passing `finance`
   * returned nothing while `Financial` returns a full page. Matching is
   * case-insensitive.
   */
  apiIndustry: string;
}

/**
 * Verified against the live endpoint on 2026-09-07: business, industrial,
 * lifestyle, technology, Financial and Medicine each return a full page;
 * communications returns a single article; Cryptocurrency and Sustainability
 * return nothing because the dataset holds no articles for them yet, so those
 * two rows render empty until the backend has that content.
 */
const CATEGORY_DEFS: readonly { slug: string; title: string; sectorType: string }[] = [
  { slug: 'business', title: 'Business', sectorType: 'Business' },
  { slug: 'communications', title: 'Communications', sectorType: 'Communications' },
  { slug: 'cryptocurrency', title: 'Cryptocurrency', sectorType: 'Cryptocurrency' },
  { slug: 'finance', title: 'Finance', sectorType: 'Financial' },
  { slug: 'industrial', title: 'Industrial', sectorType: 'Industrial' },
  { slug: 'healthcare', title: 'Healthcare', sectorType: 'Medicine' },
  { slug: 'lifestyle', title: 'Lifestyle', sectorType: 'Lifestyle' },
  { slug: 'sustainability', title: 'Sustainability', sectorType: 'Sustainability' },
  { slug: 'technology', title: 'Technology', sectorType: 'Technology' },
];

export const CATEGORIES: readonly CategoryConfig[] = CATEGORY_DEFS.map(def => ({
  slug: def.slug,
  title: def.title,
  exploreLabel: `Explore ${def.title}`,
  apiIndustry: def.sectorType,
}));
