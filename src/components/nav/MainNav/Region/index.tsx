'use client'

import Link from 'next/link'
import { REGIONS } from '@/lib/regions'

interface RegionMenuProps {
  onClose?: () => void
}

export default function RegionMenu({ onClose }: RegionMenuProps) {
  return (
    <div className="grid grid-cols-6 gap-6">
      {REGIONS.map((region) => (
        <div key={region.continent} className="dropdown-menu-section">
          <div className="flex flex-col">
            <p className="dropdown-link label mb-3">
              {region.continent}
            </p>

            <div className="space-y-3">
              {region.subRegions.map((subRegion) => (
                <Link
                  key={subRegion.name}
                  href={`/search?reg=${encodeURIComponent(subRegion.name)}`}
                  className="block dropdown-link"
                  onClick={onClose}
                >
                  {subRegion.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
