'use client'

import Link from 'next/link'
import { LANGUAGES, searchHrefFor } from '@/lib/languages'
import { LanguageTag } from '@/components/ui/LanguageTag'

interface LanguageMenuProps {
  onClose?: () => void
}

export default function LanguageMenu({ onClose }: LanguageMenuProps) {
  return (
    <div className="flex flex-wrap justify-between gap-x-8 gap-y-4">
      {LANGUAGES.map((language) => (
        <div key={language.id} className="dropdown-menu-section">
          <p className="megamenu-title flex items-center gap-2">
            <Link
              href={searchHrefFor(language)}
              className="dropdown-link"
              onClick={onClose}
              hrefLang={language.bcp47}
            >
              {language.label}
              <span className="mx-1 text-gray-400">•</span>
              <span lang={language.bcp47}>{language.endonym}</span>
            </Link>
            <LanguageTag value={language.id} />
          </p>
        </div>
      ))}
    </div>
  )
}
