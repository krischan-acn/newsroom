// press-release/Hero.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { LanguageTag } from '@/components/ui/LanguageTag';

interface HeroProps {
  logo?: string | null;
  companyName: string;
  headline: string;
  subHeadline?: string | null;
  sectors?: string[];
  source?: string;
  dateTime?: string | null;
  language?: string | null;
  className?: string;
}

function LogoMark({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="h-10 md:h-12 flex items-center text-sm font-semibold text-gray-700">
        {alt}
      </div>
    );
  }

  return (
    <div className="relative h-10 md:h-12 w-40 md:w-48">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain object-left"
        onError={() => setError(true)}
        sizes="(max-width: 768px) 160px, 192px"
      />
    </div>
  );
}

export function Hero({
  logo,
  companyName,
  headline,
  subHeadline,
  sectors,
  source,
  dateTime,
  language,
  className = '',
}: HeroProps) {
  const tagParts: string[] = [];
  if (sectors && sectors.length) {
    tagParts.push(...sectors);
  }
  if (source) {
    tagParts.push(`Source: ${source}`);
  }
  if (dateTime) {
    const formatted = new Date(dateTime).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    tagParts.push(formatted);
  }

  return (
    <header className={`mb-8 ${className}`}>
      <h1 className="mb-8 text-3xl md:text-4xl lg:text-5xl text-gray-900 leading-tight">
        {headline}
      </h1>

      {subHeadline && (
        <p className="mt-4 mb-8 text-lg md:text-xl text-gray-400 leading-relaxed">
          {subHeadline}
        </p>
      )}

      {(tagParts.length > 0 || language) && (
        <div className="mt-6 flex flex-wrap items-center gap-y-2 text-xs md:text-sm uppercase text-gray-400">
          {tagParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-2 text-gray-400">•</span>}
              <span className={part.startsWith('Source:') ? '' : 'font-semibold text-gray-500'}>
                {part}
              </span>
            </span>
          ))}
          {language && (
            <>
              {tagParts.length > 0 && <span className="mx-2 text-gray-400">•</span>}
              <LanguageTag value={language} />
            </>
          )}
        </div>
      )}

      <hr className="mt-6 border-gray-200" />
    </header>
  );
}
