// src/lib/sector-mapper.ts
import { SECTORS, SECTOR_TYPES } from './sectors';

// Map API sector name → user-facing category (sector_type).
// 1. Exact match on sector_name  e.g. "BioTech" → "Medicine"
// 2. Direct match on sector_type e.g. "Technology" → "Technology"
// 3. Partial match: sector_name starts with the API value e.g. "Automation" → "Automation [IoT]" → "Technology"
// 4. No match → '' (caller filters out empty strings, so the article appears in no row)
export function getSectorCategory(apiSectorName: string): string {
  if (!apiSectorName) return '';
  const exact = SECTORS.find(s => s.sector_name === apiSectorName);
  if (exact) return exact.sector_type;
  const byType = SECTORS.find(s => s.sector_type === apiSectorName);
  if (byType) return byType.sector_type;
  const partial = SECTORS.find(s => s.sector_name.startsWith(apiSectorName) || apiSectorName.startsWith(s.sector_name));
  return partial?.sector_type ?? '';
}

// For an article with multiple API sectors, get unique categories
export function getArticleCategories(apiSectors: string | string[]): string[] {
  if (!apiSectors || (Array.isArray(apiSectors) && apiSectors.length === 0)) return [];
  const categories = new Set<string>();
  (Array.isArray(apiSectors) ? apiSectors : [apiSectors]).forEach(sector => {
    const mapped = getSectorCategory(sector);
    if (mapped) categories.add(mapped);
  });
  return Array.from(categories);
}

// Get all unique sector types for sidebar display
export const DISPLAY_SECTORS = SECTOR_TYPES; // ['Technology', 'Communications', ...]

// For debugging: see what API sector maps to what category
export function getSectorMappingTable(): Map<string, string> {
  const map = new Map<string, string>();
  SECTORS.forEach(s => {
    map.set(s.sector_name, s.sector_type);
  });
  return map;
}