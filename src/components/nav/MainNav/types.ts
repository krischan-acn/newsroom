// components/nav/MainNav/types.ts
export interface MainNavProps {
  logo?: {
    src: string
    alt: string
    href?: string
  }
  navItems?: Array<{
    label: string      // Translation key
    href: string
    isButton?: boolean // For Login/Register styling
    variant?: 'outline' | 'solid'
  }>
  className?: string
}

export interface MegaMenuItem {
  label: string
  href: string
  hasDropdown?: boolean
  megaMenuContent?: string
}

export interface MegaMenuNavProps {
  items?: MegaMenuItem[]
}

// Either in types.ts or at top of MegaMenuNav.tsx
export const DEFAULT_MEGA_MENU_ITEMS: MegaMenuItem[] = [
  { label: 'Company', href: '#', hasDropdown: true, megaMenuContent: 'company' },
  { label: 'Region', href: '#', hasDropdown: true, megaMenuContent: 'region' },
  { label: 'Country', href: '#', hasDropdown: true, megaMenuContent: 'country' },
  { label: 'Exchange', href: '#' },
  { label: 'Stock Codes', href: '#' },
  { label: 'Sector', href: '#', hasDropdown: true, megaMenuContent: 'sector' },
  { label: 'Industry', href: '#', hasDropdown: true, megaMenuContent: 'industry' },
  { label: 'Language', href: '#', hasDropdown: true, megaMenuContent: 'language' },
  { label: 'Events', href: '/events' },
]