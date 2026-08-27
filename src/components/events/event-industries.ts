// components/events/event-industries.ts
//
// Derives an event's industry tags from the sectors on its press releases,
// using the site's own taxonomy in lib/sectors.ts rather than a hand-written
// theme list. Two things fall out of that for free: the tags are the same
// vocabulary the nav and search sidebar use, so they link straight into a
// filtered feed; and they need no maintenance — tag the releases and the event
// describes itself.

import { SECTORS } from '@/lib/sectors';
import { INDUSTRY_HIERARCHY } from '@/lib/filter-data';
import { MOCK_EVENTS, type MockEventRelease } from '@/data/mock-events';

export interface EventIndustry {
  /** Canonical sector_name from lib/sectors.ts. */
  name: string;
  /** Sidebar display name for the parent category, e.g. "Industry". */
  category: string;
  /** Releases at this event carrying the tag. */
  count: number;
  href: string;
}

export interface EventIndustryGroup {
  category: string;
  industries: EventIndustry[];
  count: number;
}

/** sector_name → the sidebar's display name for its category. */
const CATEGORY_BY_SECTOR: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const parent of INDUSTRY_HIERARCHY) {
    for (const child of parent.children ?? []) {
      map.set(child.id, parent.name);
    }
  }
  return map;
})();

const KNOWN_SECTOR_NAMES = new Set(SECTORS.map((s) => s.sector_name));

export function isKnownIndustry(name: string): boolean {
  return KNOWN_SECTOR_NAMES.has(name);
}

/**
 * The search page resolves a ?sec= value to either a sector or a single
 * industry, and industries are compared punctuation-insensitively, so these tags
 * match the article data whichever spelling it uses. Same target as both nav
 * menus. See docs/taxonomy-migration.md.
 */
export function industryHref(name: string): string {
  return `/search?sec=${encodeURIComponent(name)}`;
}

/**
 * Unique industries across the event's releases, grouped by category. Ordered
 * by weight — the industries the show is actually about lead.
 */
export function deriveEventIndustries(releases: MockEventRelease[]): EventIndustryGroup[] {
  const counts = new Map<string, number>();

  for (const release of releases) {
    // A release may carry the same tag once only; guard anyway so a duplicate
    // in the data cannot inflate the weighting.
    for (const name of new Set(release.sectors)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const groups = new Map<string, EventIndustry[]>();

  for (const [name, count] of counts) {
    // An unrecognised tag is a data error, not something to render as though it
    // were part of the taxonomy. Surfaced by the check in mock-events.ts.
    const category = CATEGORY_BY_SECTOR.get(name);
    if (!category) continue;

    const industry: EventIndustry = { name, category, count, href: industryHref(name) };
    const existing = groups.get(category);
    if (existing) existing.push(industry);
    else groups.set(category, [industry]);
  }

  return Array.from(groups, ([category, industries]) => ({
    category,
    industries: industries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    count: industries.reduce((sum, i) => sum + i.count, 0),
  })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

/** Flat, weight-ordered list — for the rail and any compact summary. */
export function flattenIndustries(groups: EventIndustryGroup[]): EventIndustry[] {
  return groups
    .flatMap((g) => g.industries)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export interface TrimmedIndustries {
  /** At most `maxCategories` groups, each cut to `maxPerCategory` industries. */
  groups: EventIndustryGroup[];
  /** Industry tags left out, across both kinds of trim. */
  hiddenCount: number;
  /** Categories dropped whole, in weight order. */
  hiddenCategories: string[];
}

/**
 * Both lists are weight-ordered, so trimming keeps the industries the event is
 * most about. The remainder is counted rather than dropped silently — a block
 * that shows three of nine tags should say so.
 */
export function trimIndustries(
  groups: EventIndustryGroup[],
  maxCategories = 3,
  maxPerCategory = 3,
): TrimmedIndustries {
  const kept = groups.slice(0, maxCategories);
  const total = groups.reduce((sum, g) => sum + g.industries.length, 0);

  const trimmed = kept.map((group) => {
    const industries = group.industries.slice(0, maxPerCategory);
    return {
      ...group,
      industries,
      count: industries.reduce((sum, i) => sum + i.count, 0),
    };
  });

  const shown = trimmed.reduce((sum, g) => sum + g.industries.length, 0);

  return {
    groups: trimmed,
    hiddenCount: total - shown,
    hiddenCategories: groups.slice(maxCategories).map((g) => g.category),
  };
}

// A tag that is not in the taxonomy is dropped silently above, which would make
// a typo look like a release simply had fewer tags. Say so at dev-server start
// instead of letting it disappear.
if (process.env.NODE_ENV !== 'production') {
  const unknown = new Set<string>();
  for (const event of MOCK_EVENTS) {
    for (const release of event.pressReleases) {
      for (const name of release.sectors) {
        if (!isKnownIndustry(name)) unknown.add(`${name} (release ${release.id})`);
      }
    }
  }
  if (unknown.size > 0) {
    console.warn(
      `[events] Industry tags not present in lib/sectors.ts and dropped: ${[...unknown].join(', ')}`,
    );
  }
}
