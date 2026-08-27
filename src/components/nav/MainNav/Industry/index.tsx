'use client'

import Link from 'next/link'
import { SECTORS } from '@/lib/sectors'

interface IndustryMenuProps {
  onClose?: () => void
}

const INDUSTRY_SECTIONS = Object.entries(
  SECTORS.reduce<Record<string, string[]>>((acc, sector) => {
    if (!acc[sector.sector_type]) acc[sector.sector_type] = []
    acc[sector.sector_type].push(sector.sector_name)
    return acc
  }, {})
).map(([category, items]) => ({ category, items }))

function toSectionParam(item: string): string {
  return item
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D')
    .replace(/&/g, '%26')
    .replace(/ /g, '+')
}

export default function IndustryMenu({ onClose }: IndustryMenuProps) {
  return (
    <div className="grid grid-cols-9 gap-6">
      {INDUSTRY_SECTIONS.map((section) => (
        <div key={section.category} className="dropdown-menu-section">
          <div className="flex flex-col">
            <p className="dropdown-link label mb-3">
              {section.category}
            </p>
            <div className="space-y-3">
              {section.items.map((item) => (
                <Link
                  key={item}
                  // /industry does not exist as a route — this used to 404 on
                  // every industry. /search?sec= is the one that resolves, and
                  // it is already where the sibling Sector menu points.
                  href={`/search?sec=${toSectionParam(item)}`}
                  className="block dropdown-link"
                  onClick={onClose}
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
