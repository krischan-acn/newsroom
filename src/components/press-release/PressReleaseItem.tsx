'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/utils';
import { LanguageTag } from '@/components/ui/LanguageTag';

import type { CompanyArticle } from '@/services/company-articles';

interface Props {
  article: CompanyArticle;
  companyName: string;
  logoSrc: string | null;
  sectors?: string[] | null;
  showMeta?: boolean;
  hideLogo?: boolean;
}

export function PressReleaseItem({ article, companyName, logoSrc: initialLogoSrc, sectors, showMeta, hideLogo }: Props) {
  const [logoSrc, setLogoSrc] = useState<string | null>(initialLogoSrc);

  useEffect(() => {
    if (hideLogo || initialLogoSrc || article.thumbImage) return;
    let mounted = true;
    fetch(`/api/press-release/${article.id}`)
      .then(r => r.json())
      .then(data => {
        if (mounted && data?.companies?.[0]?.logofilename) {
          setLogoSrc(data.companies[0].logofilename);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [article.id, article.thumbImage, initialLogoSrc]);

  return (
    <Link
      href={`/article/${article.id}`}
      className="flex items-stretch gap-0 py-3 group"
    >
      {/* Logo column */}
      {!hideLogo && logoSrc && (
        <div className="w-28 shrink-0 flex items-center justify-center p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={companyName}
            loading="lazy"
            className="max-w-full max-h-16 w-auto h-auto object-contain"
          />
        </div>
      )}

      {/* Divider */}
      <div className="w-px bg-gray-200 shrink-0 self-stretch mx-1" />

      {/* Content */}
      <div className="flex-1 min-w-0 px-4 py-2 flex flex-col justify-center gap-2">
        <h3 className="text-md text-gray-800 font-medium leading-snug line-clamp-1 group-hover:text-[#2088c9] transition-colors">
          {article.headline}
        </h3>
        <div className="flex flex-row flex-wrap items-center gap-2 mt-0.5">
          {showMeta && companyName && (
            <>
              <p className="text-xs font-medium text-gray-600">
                {companyName}
              </p>
              <p className="text-xs text-gray-400">•</p>
            </>
          )}
          <p className="text-xs text-gray-400">
            {formatDateTime(article.dateTime, article.language)}
          </p>
          {article.language && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <LanguageTag value={article.language} />
            </>
          )}
        </div>

        {showMeta && sectors && sectors.length > 0 && (
          <span className="text-xs font-medium text-gray-600 -mt-[8px] mb-0.5">
            {sectors[0]}
          </span>
        )}

        {article.description && (
          <p className="text-xs text-gray-500 line-clamp-2">
            {article.description}
          </p>
        )}
      </div>

      {/* Press photo */}
      {article.thumbImage && (
        <div className="shrink-0 ml-4 self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.thumbImage}
            alt={article.headline}
            loading="lazy"
            className="w-20 h-20 object-cover"
          />
        </div>
      )}
    </Link>
  );
}
