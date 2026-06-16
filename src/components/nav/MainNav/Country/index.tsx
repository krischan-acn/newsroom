'use client'

import Link from 'next/link'
import { REGIONS } from '@/lib/regions'

interface CountryMenuProps {
  onClose?: () => void
}

export default function CountryMenu({ onClose }: CountryMenuProps) {
  return (
    <div className="grid grid-cols-6 gap-6">
      {REGIONS.map((region) => (
        <div key={region.continent} className="dropdown-menu-section">
          <div className="flex flex-col">
            <p className="dropdown-link label mb-3">
              {region.continent}
            </p>

            {region.subRegions.map((subRegion) => (
              <div key={subRegion.name} className="mb-4">
                <p className="dropdown-link mb-3 uppercase text-xs! opacity-30 font-semibold pointer-events-none">
                  {subRegion.name}
                </p>
                <div className="space-y-3">
                  {subRegion.countries.map((country) => (
                    <Link
                      key={country}
                      href={`/search?country=${encodeURIComponent(country)}`}
                      className="block dropdown-link"
                      onClick={onClose}
                    >
                      {country}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
