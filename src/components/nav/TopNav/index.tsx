// components/nav/TopNav/index.tsx
import './TopNav.css';

import type { TopNavProps } from './types';
import { DEFAULT_LANGUAGES, DEFAULT_CLIENT_LINKS } from './types';
import LanguageSelector from './LanguageSelector';
import DateTimeDisplay from './DateTimeDisplay';
import ClientLinks from './ClientLinks';
import DateDisplay from './DateDisplay';
import AbHiddenTrigger from '@/components/ab/AbHiddenTrigger';

export default function TopNav({
  activeLocale = 'en',
  languages = DEFAULT_LANGUAGES,
  clientLinks = DEFAULT_CLIENT_LINKS,
}: TopNavProps) {
  
  return (
    <section className="top-nav relative z-888">
      <div className="flex flex-row justify-between items-center min-h-7 pt-0.5">
        {/* Left: Language selector */}
        <div className="nav-left flex">
          <LanguageSelector 
            activeLocale={activeLocale}
            languages={languages}
          />
        </div>

        {/* Center: DateTime - hidden below 768px, absolutely centered when visible */}
        <div className="
          hidden 
          md:block 
          absolute 
          left-1/2 
          -translate-x-1/2
          whitespace-nowrap
        ">
          <DateTimeDisplay />
        </div>

        {/* Right: Client links -- temporarily removed */}
        <div className="nav-right ml-auto flex items-center">
          { /* <ClientLinks links={clientLinks} /> -- temporarily removed */ }
          <DateDisplay />
          {/* Employee A/B overlay trigger (also opens with F2). Intentionally unlabeled. */}
          <AbHiddenTrigger />
        </div>
      </div>
    </section>
  );
}