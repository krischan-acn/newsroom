'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react' // Add useLayoutEffect
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MegaMenuItem } from './types'
import { DEFAULT_MEGA_MENU_ITEMS } from './types'

import Company from './Company'
import Region from './Region'
import Country from './Country'
import Sector from './Sector'
import Industry from './Industry'
import Language from './Language'

interface MegaMenuNavProps {
  items?: MegaMenuItem[]
  activeMenu?: string | null
  onMenuHover?: (menu: string | null) => void
  isContainerClosing?: boolean
  isSwitching?: boolean
  isScrolled?: boolean
}


export default function MegaMenuNav({
  items = DEFAULT_MEGA_MENU_ITEMS,
  activeMenu,
  onMenuHover,
  isContainerClosing,
  isSwitching,
  isScrolled
}: MegaMenuNavProps) {
  const pathname = usePathname()
  const [menuHeight, setMenuHeight] = useState(0)
  const [shouldRender, setShouldRender] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const prevActiveMenuRef = useRef<string | null>(null)

  // Handle menu opening
  useEffect(() => {
    if (activeMenu && !isContainerClosing) {
      setShouldRender(true)
      prevActiveMenuRef.current = activeMenu
    }
  }, [activeMenu, isContainerClosing])

  // Measure height synchronously after render but before paint,
  // and re-measure whenever the content reflows (e.g. browser zoom, window resize).
  useLayoutEffect(() => {
    if (!shouldRender || !contentRef.current || isContainerClosing) return

    const node = contentRef.current
    setMenuHeight(node.scrollHeight)

    const observer = new ResizeObserver(() => {
      setMenuHeight(node.scrollHeight)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [activeMenu, shouldRender, isContainerClosing])

  // Handle closing animation
  useEffect(() => {
    if (isContainerClosing) {
      setMenuHeight(0)
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 75)
      return () => clearTimeout(timer)
    }
  }, [isContainerClosing])
  
  return (
    <>
      {/* Mega menu bar */}
      <div className="hidden lg:block border-t border-gray-200">
        <div>
          <div className="flex items-center gap-1">
            {items.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                onMouseEnter={() => onMenuHover?.(item.megaMenuContent || null)}
                className={`nav-link mega ${
                  index === 0 ? 'pl-0!' : ''
                } ${pathname === item.href ? '' : ''}`}
              > 
                {item.label}
                {item.hasDropdown && (
                  <span className="ml-1 inline-block"> </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Dropdown menu */}
      {shouldRender && (
        <div 
          className="absolute left-0 right-0 top-full bg-white border-t border-gray-200 shadow-lg z-40 overflow-hidden"
          style={{
            height: isContainerClosing ? 0 : menuHeight,
            transition: 'height 75ms ease-in-out'
          }}
        >
          <div ref={contentRef}>
            <div
              className={`mx-auto min-h-[300px] py-6 relative w-full transition-[max-width] duration-200 ${
                isScrolled ? 'max-w-[1920px] px-[60px]' : 'max-w-[1920px] px-[60px]'
              }`}
            >
              <div 
                key={activeMenu}
                className="transition-opacity duration-75"
                style={{ opacity: isContainerClosing ? 0 : (isSwitching ? 0 : 1) }}
              >
                {activeMenu === 'company' && <Company onClose={() => onMenuHover?.(null)} />}
                {activeMenu === 'region' && <Region onClose={() => onMenuHover?.(null)} />}
                {activeMenu === 'country' && <Country onClose={() => onMenuHover?.(null)} />}
                {activeMenu === 'sector' && <Sector onClose={() => onMenuHover?.(null)} />}
                {activeMenu === 'industry' && <Industry onClose={() => onMenuHover?.(null)} />}
                {activeMenu === 'language' && <Language onClose={() => onMenuHover?.(null)} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}