// components/press-release/InfiniteArticleFeed.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { PressRelease } from './PressRelease';
import { getNextArticleId, getReadingMode } from '@/services/reading-mode';
import { headlineToSlug, languageToSlug } from '@/services/acn-adapter';
import type { PressReleaseData } from './types';
import type { CompanyArticle } from '@/services/company-articles';

interface LoadedArticle {
  data: PressReleaseData;
  relatedArticles: CompanyArticle[];
  urlPath: string;
}

interface FirstArticle {
  id: number;
  lang: string;
  slug: string;
}

interface Props {
  firstId: number;
  firstArticle: FirstArticle;
}

export function InfiniteArticleFeed({ firstId, firstArticle }: Props) {
  const [articles, setArticles] = useState<LoadedArticle[]>([]);
  const [lastId, setLastId] = useState(firstId);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const articleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const loadingRef = useRef(false);
  const loadedIds = useRef(new Set<number>([firstId]));

  // Sentinel observer — triggers loading the next article
  useEffect(() => {
    if (exhausted) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);

        const mode = getReadingMode();
        const nextId = await getNextArticleId(lastId, mode);

        if (!nextId || loadedIds.current.has(nextId)) {
          setExhausted(true);
          loadingRef.current = false;
          setLoading(false);
          return;
        }

        const dataRes = await fetch(`/api/press-release/${nextId}`);
        if (!dataRes.ok) {
          setExhausted(true);
          loadingRef.current = false;
          setLoading(false);
          return;
        }

        const data: PressReleaseData = await dataRes.json();

        const compId = data.companies?.[0]?.comp_ID ?? '';
        const relatedRes = await fetch(`/api/company-articles/${compId}`);
        const relatedArticles: CompanyArticle[] = relatedRes.ok
          ? await relatedRes.json()
          : [];

        const slug = headlineToSlug(data.headline, data.id);
        const lang = languageToSlug(data.language ?? 'english');
        const urlPath = `/article/${lang}/${data.id}/${slug}`;

        loadedIds.current.add(nextId);
        setArticles(prev => [...prev, { data, relatedArticles, urlPath }]);
        setLastId(nextId);
        window.history.replaceState(null, '', urlPath);

        loadingRef.current = false;
        setLoading(false);
      },
      { rootMargin: '400px' }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [lastId, exhausted]);

  // Viewport observer — keeps URL in sync while scrolling in either direction.
  // Uses a single shared observer with threshold:0 + rootMargin so the trigger
  // zone is the top half of the viewport. threshold:0.3 fails for tall articles
  // because 30% of a 3000px element never fits in the viewport.
  useEffect(() => {
    const urlMap = new Map<Element, string>();
    const intersecting = new Set<Element>();

    const updateUrl = () => {
      if (intersecting.size === 0) return;
      let topmost: Element | null = null;
      let bestScore = Infinity;
      for (const el of intersecting) {
        const top = el.getBoundingClientRect().top;
        // Prefer elements whose top is just below viewport top; fall back to
        // least-negative top (article partially scrolled above) if nothing positive.
        const score = top >= 0 ? top : top + 1e9;
        if (score < bestScore) { bestScore = score; topmost = el; }
      }
      if (topmost) window.history.replaceState(null, '', urlMap.get(topmost)!);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) intersecting.add(entry.target);
        else intersecting.delete(entry.target);
      });
      updateUrl();
    }, { threshold: 0, rootMargin: '0px 0px -50% 0px' });

    const firstEl = document.getElementById('article-first-wrapper');
    if (firstEl) {
      urlMap.set(firstEl, `/article/${firstArticle.lang}/${firstArticle.id}/${firstArticle.slug}`);
      observer.observe(firstEl);
    }

    articles.forEach(({ urlPath }, index) => {
      const el = articleRefs.current[index];
      if (el) { urlMap.set(el, urlPath); observer.observe(el); }
    });

    return () => observer.disconnect();
  }, [articles, firstArticle]);

  return (
    <>
      {articles.map(({ data, relatedArticles }, index) => (
        <div
          key={data.id}
          className="mt-12 pt-12"
          ref={el => { articleRefs.current[index] = el; }}
        >
          <PressRelease data={data} relatedArticles={relatedArticles} />
        </div>
      ))}

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="text-center py-8 text-sm text-gray-400">
          Loading next article...
        </div>
      )}

      {exhausted && (
        <div className="text-center py-8 text-sm text-gray-400">
          You've reached the end.
        </div>
      )}
    </>
  );
}
