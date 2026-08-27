import { SECTORS } from './sectors';
import { buildRegionHierarchy } from './countries';
import { sectorLabel as sectorDisplayName } from './taxonomy';

export interface NestedItem {
  id: string;
  name: string;
  children?: NestedItem[];
}

// Sector labels now come from lib/taxonomy.ts (imported above as
// sectorDisplayName). This file used to keep its own copy of the map, one of
// three in the codebase. That copy keyed the crypto sector as 'CryptoCurrency'
// (capital C) where lib/sectors.ts has 'Cryptocurrency', so the entry matched
// nothing — harmless here, but the same typo in services/search.ts made
// ?sec=Cryptocurrency return zero results.

// Build 2-level hierarchy from sectors master list
// Parent ID = display name (matches URL ?sec= values from nav links)
// Child ID  = sector_name (matches internal API sector names)
function buildIndustryHierarchy(): NestedItem[] {
  const order: string[] = [];
  const childrenByType: Record<string, NestedItem[]> = {};

  for (const s of SECTORS) {
    if (!childrenByType[s.sector_type]) {
      childrenByType[s.sector_type] = [];
      order.push(s.sector_type);
    }
    childrenByType[s.sector_type].push({ id: s.sector_name, name: s.sector_name });
  }

  return order.map((type) => ({
    id: sectorDisplayName(type),
    name: sectorDisplayName(type),
    children: childrenByType[type],
  }));
}

export const INDUSTRY_HIERARCHY: NestedItem[] = buildIndustryHierarchy();

// Region hierarchy — derived from countries.ts (continent → sub-region → country)
export const REGION_HIERARCHY: NestedItem[] = buildRegionHierarchy();

// Collect only leaf (no-children) IDs under an item (or the item itself if it's a leaf)
export function getLeafIds(item: NestedItem): string[] {
  if (!item.children?.length) return [item.id];
  return item.children.flatMap(getLeafIds);
}

// Collect all descendant IDs (all levels) for a given item
export function getAllDescendantIds(item: NestedItem): string[] {
  if (!item.children) return [];
  const ids: string[] = [];
  for (const child of item.children) {
    ids.push(child.id);
    ids.push(...getAllDescendantIds(child));
  }
  return ids;
}

// Find an item anywhere in the hierarchy by ID
export function findItemInHierarchy(
  hierarchy: NestedItem[],
  id: string,
): NestedItem | null {
  for (const item of hierarchy) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemInHierarchy(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Return the IDs of every ancestor of targetId (empty array if not found or top-level)
export function getAncestorIds(targetId: string, hierarchy: NestedItem[]): string[] {
  function search(nodes: NestedItem[], path: string[]): string[] | null {
    for (const node of nodes) {
      if (node.id === targetId) return path;
      if (node.children) {
        const result = search(node.children, [...path, node.id]);
        if (result !== null) return result;
      }
    }
    return null;
  }
  return search(hierarchy, []) ?? [];
}

// Map every node in REGION_HIERARCHY to its leaf country IDs
// Used by search.ts to expand continent/sub-region filters to matchable country names
export const REGION_LEAF_COUNTRIES: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  function traverse(item: NestedItem) {
    map[item.id] = getLeafIds(item);
    item.children?.forEach(traverse);
  }
  REGION_HIERARCHY.forEach(traverse);
  return map;
})();
