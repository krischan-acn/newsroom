// components/events/EventReleaseItem.tsx
//
// A press release row for the event page. Dimensionally the same as
// PressReleaseItem so the two feeds read as one product, but deliberately not a
// link: these releases are sample data with invented ids, and /article/900101
// would 404. Swap this for PressReleaseItem the moment the feed comes from the
// API and the ids are real.

import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';
import { LanguageTag } from '@/components/ui/LanguageTag';
import type { MockEventRelease } from '@/data/mock-events';
import { industryHref } from './event-industries';

export function EventReleaseItem({ release }: { release: MockEventRelease }) {
  return (
    <article className="flex items-stretch py-3">
      {/* Where PressReleaseItem carries a company logo. Sample releases have no
          logo to show, so the column holds the publication date instead of
          leaving a ragged gap down the left edge. */}
      <div className="hidden w-28 shrink-0 flex-col items-center justify-center px-3 sm:flex">
        <span className="font-mono text-lg leading-none tabular-nums text-gray-700">
          {release.dateTime.slice(8, 10)}
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {new Date(`${release.dateTime.slice(0, 10)}T00:00:00`).toLocaleString('en', {
            month: 'short',
          })}
        </span>
      </div>

      <div className="mx-1 hidden w-px shrink-0 self-stretch bg-gray-200 sm:block" />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-2">
        <h3 className="text-md font-medium leading-snug text-gray-800">
          {release.headline}
        </h3>

        <div className="mt-0.5 flex flex-row flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-gray-600">{release.company}</p>
          <span className="text-xs text-gray-400">•</span>
          <p className="text-xs text-gray-400">
            {formatDateTime(release.dateTime, release.language)}
          </p>
          <span className="text-xs text-gray-400">•</span>
          <LanguageTag value={release.language} />
        </div>

        {/* Industry tags, not free text — the same values the nav and search
            sidebar use, so each one is a filtered feed. */}
        <div className="-mt-[8px] mb-0.5 flex flex-wrap gap-1.5">
          {release.sectors.map((sector) => (
            <Link
              key={sector}
              href={industryHref(sector)}
              className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
            >
              {sector}
            </Link>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-gray-500">{release.description}</p>
      </div>
    </article>
  );
}
