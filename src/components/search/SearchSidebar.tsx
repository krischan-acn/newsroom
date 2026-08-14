'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NestedCheckbox } from './NestedCheckbox';
import {
  INDUSTRY_HIERARCHY,
  REGION_HIERARCHY,
  getAllDescendantIds,
  findItemInHierarchy,
  getAncestorIds,
  getLeafIds,
} from '@/lib/filter-data';
import { LANGUAGES as LANGUAGE_REGISTRY } from '@/lib/languages';
import { LanguageTag } from '@/components/ui/LanguageTag';

// Derived from the language registry so the filter codes, the labels and the
// tags rendered on results can never drift apart.
const LANGUAGES = LANGUAGE_REGISTRY.map((l) => ({
  code: l.searchCode,
  label: l.label,
  id: l.id,
}));

interface SearchSidebarProps {
  activeSectors: string[];
  activeLanguages: string[];
  activeRegions: string[];
  currentQ: string;
  currentLimit: string;
}

export function SearchSidebar({
  activeSectors,
  activeLanguages,
  activeRegions,
  currentQ,
  currentLimit,
}: SearchSidebarProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const buildUrl = (sectors: string[], languages: string[], regions: string[]) => {
    const params = new URLSearchParams();
    if (currentQ) params.set('q', currentQ);
    sectors.forEach((s) => params.append('sec', s));
    languages.forEach((l) => params.append('lang', l));
    regions.forEach((r) => params.append('reg', r));
    if (currentLimit && currentLimit !== '20') params.set('limit', currentLimit);
    return `/search?${params.toString()}`;
  };

  // Sector toggle: parent IDs are never stored in the URL.
  // ON  + parent → expand to all leaf children (exact sector names for precise filtering).
  // ON  + leaf   → strip ancestors, add leaf.
  // OFF + parent → remove all leaf descendants.
  // OFF + leaf   → remove leaf; if an ancestor was in URL expand it minus this leaf.
  function applySectorToggle(current: string[], id: string, checked: boolean): string[] {
    const item = findItemInHierarchy(INDUSTRY_HIERARCHY, id);
    const descendantIds = item ? getAllDescendantIds(item) : [];
    const ancestorIds = getAncestorIds(id, INDUSTRY_HIERARCHY);
    const idsToAdd = item?.children?.length ? getLeafIds(item) : [id];

    let next = [...current];
    if (checked) {
      next = next.filter((v) => !descendantIds.includes(v) && !ancestorIds.includes(v));
      idsToAdd.forEach((leafId) => { if (!next.includes(leafId)) next.push(leafId); });
    } else {
      const idsToRemove = new Set([id, ...descendantIds]);
      next = next.filter((v) => !idsToRemove.has(v));
      // Expand any ancestor that was in the URL (legacy ?sec=Communications support)
      const closestFirst = [...ancestorIds].reverse();
      for (const ancestorId of closestFirst) {
        if (next.includes(ancestorId)) {
          const ancestorItem = findItemInHierarchy(INDUSTRY_HIERARCHY, ancestorId);
          if (ancestorItem) {
            next = next.filter((v) => v !== ancestorId);
            getLeafIds(ancestorItem).forEach((leafId) => {
              if (!idsToRemove.has(leafId) && !next.includes(leafId)) next.push(leafId);
            });
          }
          break;
        }
      }
    }
    return next;
  }

  // Region toggle: parent IDs ARE stored (compact representation: ?reg=Asia vs many countries).
  // ON  → strip ancestors and descendants, add item.
  // OFF → strip item and descendants; expand closest ancestor in URL minus this branch.
  function applyRegionToggle(current: string[], id: string, checked: boolean): string[] {
    const item = findItemInHierarchy(REGION_HIERARCHY, id);
    const descendantIds = item ? getAllDescendantIds(item) : [];
    const ancestorIds = getAncestorIds(id, REGION_HIERARCHY);

    let next = [...current];
    if (checked) {
      next = next.filter((v) => !descendantIds.includes(v) && !ancestorIds.includes(v));
      if (!next.includes(id)) next.push(id);
    } else {
      const idsToRemove = new Set([id, ...descendantIds]);
      next = next.filter((v) => !idsToRemove.has(v));
      const closestFirst = [...ancestorIds].reverse();
      for (const ancestorId of closestFirst) {
        if (next.includes(ancestorId)) {
          const ancestorItem = findItemInHierarchy(REGION_HIERARCHY, ancestorId);
          if (ancestorItem) {
            next = next.filter((v) => v !== ancestorId);
            getLeafIds(ancestorItem).forEach((leafId) => {
              if (!idsToRemove.has(leafId) && !next.includes(leafId)) next.push(leafId);
            });
          }
          break;
        }
      }
    }
    return next;
  }

  const handleSectorToggle = (id: string, checked: boolean) => {
    router.push(buildUrl(applySectorToggle(activeSectors, id, checked), activeLanguages, activeRegions));
  };

  const handleLanguageChange = (code: string, checked: boolean) => {
    const next = checked
      ? [...activeLanguages, code]
      : activeLanguages.filter((l) => l !== code);
    router.push(buildUrl(activeSectors, next, activeRegions));
  };

  const handleRegionToggle = (id: string, checked: boolean) => {
    router.push(buildUrl(activeSectors, activeLanguages, applyRegionToggle(activeRegions, id, checked)));
  };

  const filterContent = (
    <div className="space-y-6 mt-3">
      {/* Sectors */}
      <div>
        <h3 className="text-sm font-medium text-black">Sector / Industry</h3>
        <div className="mt-2 space-y-0.5">
          {INDUSTRY_HIERARCHY.map((item) => (
            <NestedCheckbox
              key={item.id}
              item={item}
              selectedIds={activeSectors}
              onToggle={handleSectorToggle}
              level={0}
            />
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <h3 className="text-sm font-medium text-black">Language</h3>
        <ul className="space-y-2.5 mt-2">
          {LANGUAGES.map(({ code, label, id }) => (
            <li key={code} className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer hover:text-gray-900 select-none">
                <input
                  type="checkbox"
                  checked={activeLanguages.includes(code)}
                  onChange={(e) => handleLanguageChange(code, e.target.checked)}
                  className="w-4 h-4 border-gray-300 accent-[#2088c9] cursor-pointer"
                />
                {label}
              </label>
              <LanguageTag value={id} />
            </li>
          ))}
        </ul>
      </div>

      {/* Region */}
      <div>
        <h3 className="text-sm font-medium text-black">Region</h3>
        <div className="mt-2 space-y-0.5">
          {REGION_HIERARCHY.map((item) => (
            <NestedCheckbox
              key={item.id}
              item={item}
              selectedIds={activeRegions}
              onToggle={handleRegionToggle}
              level={0}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: button + accordion, closed by default */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="button alt flex items-center justify-between w-full gap-2 text-sm"
          aria-expanded={mobileOpen}
          aria-controls="search-filter-mobile"
        >
          <span>Filter Results</span>
          <svg
            className={`w-4 h-4 transition-transform duration-150 ${mobileOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {mobileOpen && (
          <div
            id="search-filter-mobile"
            className="mt-2 p-4 border border-gray-200 rounded-md bg-white"
          >
            {filterContent}
          </div>
        )}
      </div>

      {/* Desktop: always visible */}
      <div className="hidden md:block">
        <h2 className="text-sm font-medium text-black">Filter Results</h2>
        {filterContent}
      </div>
    </>
  );
}
