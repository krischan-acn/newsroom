'use client';

import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import type { NewsListItem } from '@/services/news-list';

const INTERVAL_MS = 8000;
const SLIDE_DURATION_MS = 700;

export function HomeHero({ slides }: { slides: NewsListItem[] }) {
  const [active, setActive] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const activeRef = useRef(0);
  const isPausedRef = useRef(false);

  const count = slides.length;
  const displayActive = count > 0 ? active % count : 0;

  const setActiveSync = (val: number | ((i: number) => number)) => {
    setActive((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      activeRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    if (count <= 1) return;

    const advance = () => {
      if (isPausedRef.current) return;
      setEnableTransition(true);
      setActiveSync ((i) => i + 1);
    };

    let id = setInterval(advance, INTERVAL_MS);

    const handleVisibility = () => {
      clearInterval(id);
      if (!document.hidden) {
        id = setInterval(advance, INTERVAL_MS);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [count]);

  const handleTransitionEnd = () => {
    if (activeRef.current === count) {
      setEnableTransition(false);
      setActive(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnableTransition(true));
      });
    }
  };

  const jumpTo = (i: number) => {
    setEnableTransition(true);
    setActiveSync(i);
  };

  if (count === 0) return null;

  const trackSlides = [...slides, slides[0]];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured news"
      className="relative overflow-hidden"
    >
      <style>{`
        @keyframes heroFillBar {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      <div
        className="flex"
        style={{
          transform: `translateX(-${active * 100}%)`,
          transition: enableTransition
            ? `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
            : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {trackSlides.map((slide, i) => (
          <Slide key={i} data={slide} hidden={i !== active} />
        ))}
      </div>

      <div className="flex items-center gap-8 px-16 py-8">
        {/* progress bars — flex-1 so they share remaining space equally */}
        {slides.map((_, i) => {
          const isPast = i < displayActive;
          const isCurrent = i === displayActive;
          return (
            <button
              key={i}
              type="button"
              onClick={() => jumpTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={isCurrent ? 'true' : undefined}
              className="relative flex-1 cursor-pointer overflow-visible bg-transparent transition-opacity hover:opacity-50"
              style={{ padding: '20px 0', margin: '-20px 0' }}
            >
              <span className="relative block h-0.5 w-full overflow-hidden bg-neutral-200">
                {isPast && <span className="absolute inset-0 bg-black" />}
                {isCurrent && (
                  <span
                    key={displayActive}
                    className="absolute inset-0 origin-left bg-black"
                    style={{
                      animation: `heroFillBar ${INTERVAL_MS}ms linear forwards`,
                      animationPlayState: isPaused ? 'paused' : 'running',
                    }}
                  />
                )}
              </span>
            </button>
          );
        })}

        {/* play/pause button — 24px icon in a circle, sits as natural 4th column */}
        <button
          type="button"
          onClick={() => setIsPaused((p) => { isPausedRef.current = !p; return !p; })}
          aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-black transition-all hover:border-neutral-500 hover:bg-neutral-100 active:border-black focus-visible:outline focus-visible:outline-black"
        >
          {isPaused ? (
            // Play triangle
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <polygon points="2,1 9,5 2,9" />
            </svg>
          ) : (
            // Pause bars
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="2" y="1" width="2.5" height="8" />
              <rect x="5.5" y="1" width="2.5" height="8" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}

function Slide({ data, hidden }: { data: NewsListItem; hidden: boolean }) {
  const image = data.thumbImage ?? null;
  const description = data.description || '';
  // data.subHeadline ?? data.bodyText ?? 

  return (
    <div
      aria-hidden={hidden}
      className="grid min-w-full grid-cols-1 md:grid-cols-[1fr_1fr]"
    >
      <div className="relative aspect-[16/10] md:aspect-auto md:h-[560px] bg-neutral-200">
        {image && (
          <Image
            src={image}
            alt={data.headline}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        )}
      </div>
      <div className="flex flex-col justify-center bg-[#fafafa] px-8 py-12 md:px-16">
        <div className="text-2xl font-normal leading-[1.2] tracking-tight text-black lg:text-4xl">
          {data.headline}
        </div>
        {description && (
          <p className="mt-6 mb-10 text-base text-gray-500 md:text-lg line-clamp-3">
            {description}
          </p>
        )}
        <a
          href={`/article/${data.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="button alt inline-flex w-fit items-center px-3"
          tabIndex={hidden ? -1 : 0}
        >
          Read more
        </a>
      </div>
    </div>
  );
}
