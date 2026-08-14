// components/ui/SocialLinks.tsx
//
// Social profile links for the company and article rails.
//
// The glyphs in assets/icons are flat #70737D artwork imported as image URLs —
// there is no SVGR transform in this project, so they cannot inherit
// currentColor. Hover is expressed with opacity instead of a colour change,
// which is why these read as muted until pointed at.
//
// Not every link we surface is a social platform: a company's blog/RSS feed and
// its Japanese-language site come through the same API field. Anything without
// a matching glyph falls back to its text label rather than a placeholder icon.

import Facebook from '@/assets/icons/facebook.svg';
import Instagram from '@/assets/icons/instagram.svg';
import Linkedin from '@/assets/icons/linkedin.svg';
import Pinterest from '@/assets/icons/pinterest.svg';
import Reddit from '@/assets/icons/reddit.svg';
import Telegram from '@/assets/icons/telegram.svg';
import Tumblr from '@/assets/icons/tumblr.svg';
import X from '@/assets/icons/x.svg';
import Youtube from '@/assets/icons/youtube.svg';
import { RAIL_LINK } from './Rail';

export interface SocialLink {
  label: string;
  url: string;
}

type IconSrc = { src: string } | string;

/** Keyed on the lowercased label used by the profile services. */
const ICONS: Record<string, IconSrc> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  pinterest: Pinterest,
  reddit: Reddit,
  telegram: Telegram,
  tumblr: Tumblr,
  x: X,
  twitter: X,
  youtube: Youtube,
};

function iconFor(label: string): string | null {
  const hit = ICONS[label.trim().toLowerCase()];
  if (!hit) return null;
  return typeof hit === 'string' ? hit : hit.src;
}

interface Props {
  links: SocialLink[];
  /** Show the platform name beside the glyph. */
  withLabels?: boolean;
  className?: string;
}

export function SocialLinks({ links, withLabels = false, className = '' }: Props) {
  if (links.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      {links.map(({ label, url }) => {
        const icon = iconFor(label);

        // No glyph for this destination — a text link is better than a
        // stand-in that says nothing about where it goes.
        if (!icon) {
          return (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs ${RAIL_LINK}`}
            >
              {label}
            </a>
          );
        }

        return (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={label}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 opacity-70 transition-opacity hover:opacity-100 hover:text-gray-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
            {withLabels && <span>{label}</span>}
          </a>
        );
      })}
    </div>
  );
}
