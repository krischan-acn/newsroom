// components/events/EventListCard.tsx
//
// Listing row for an event that has a page on this site. The live /events rows
// link straight out to the organiser's website because that is all the API
// gives us; these link inward, so the row advertises what is behind it — a
// countdown, the venue, and the release count.

import Link from 'next/link';
import type { MockEvent } from '@/data/mock-events';
import { formatEventRange } from './event-date';
import { EventStatusPill } from './EventStatusPill';

export function EventListCard({ event }: { event: MockEvent }) {
  return (
    <Link href={`/events/${event.slug}`} className="group flex items-stretch py-4">
      {/* Stands in for the photo the live rows carry. The gradient is the
          event's own, so a row and its page read as the same thing. */}
      <div
        className={`flex w-40 shrink-0 flex-col justify-end bg-gradient-to-br p-3 ${event.heroGradient}`}
        aria-hidden="true"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
          {event.city}
        </span>
        <span className="mt-0.5 text-sm leading-tight text-white">
          {event.startDate.slice(0, 4)}
        </span>
      </div>

      <div className="mx-1 w-px shrink-0 self-stretch bg-gray-200" />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4">
        <h3 className="text-md leading-snug text-gray-900 transition-colors group-hover:text-[#2088c9]">
          {event.name}
        </h3>
        <p className="line-clamp-1 text-xs text-gray-500">{event.subtitle}</p>
        <p className="text-xs text-gray-400">
          {formatEventRange(event.startDate, event.endDate)} · {event.venue}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <EventStatusPill startDate={event.startDate} endDate={event.endDate} />
          <span className="text-xs text-gray-400">
            {event.pressReleases.length} press release
            {event.pressReleases.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col justify-center pl-4 sm:flex">
        <span className="whitespace-nowrap rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 group-hover:bg-gray-50">
          View event
        </span>
      </div>
    </Link>
  );
}
