'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { Event } from '@/services/events';
import { ShelfScrollBar } from './ShelfScrollBar';

function formatEventDate(startDate: string, endDate: string): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sm = MONTHS[start.getUTCMonth()];
  const sd = start.getUTCDate();
  const em = MONTHS[end.getUTCMonth()];
  const ed = end.getUTCDate();
  if (sm === em && sd === ed) return `${sm} ${sd}`;
  if (sm === em) return `${sm} ${sd}–${ed}`;
  return `${sm} ${sd} – ${em} ${ed}`;
}

function EventCard({ event }: { event: Event }) {
  return (
    <article className="flex flex-col  w-[clamp(18rem,calc(25vw-2rem),28rem)]">
      <div className="mb-4 aspect-16/7 overflow-hidden">
        <img
          src={event.photo!}
          alt={event.description}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="overflow-hidden" style={{ height: '120px' }}>
        <h3 className="mb-2 text-base leading-snug text-black">{event.description}</h3>
        {event.location && (
          <p className="mb-1 text-sm font-semibold text-gray-500">{event.location}</p>
        )}
        <p className="text-[10px] text-gray-400">{formatEventDate(event.startDate, event.endDate)}</p>
      </div>
    </article>
  );
}

export function EventsRow({ events }: { events: Event[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter((e) => e.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (upcoming.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1920px] px-12 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl tracking-tight text-black">Events</h2>
        <a href="/events" className="button alt inline-flex items-center px-6 py-2.5">
          Explore Events
        </a>
      </div>

      <div key={pathname}>
        <div
          ref={scrollRef}
          role="region"
          aria-label="Events"
          tabIndex={0}
          className="scrollbar-hide -mx-6 flex items-center gap-6 overflow-x-auto px-6 pb-2"
        >
          {upcoming.map((event) => (
            <a
              key={event.id}
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 self-start"
            >
              <EventCard event={event} />
            </a>
          ))}
        </div>

        <ShelfScrollBar scrollRef={scrollRef} />
      </div>
    </section>
  );
}
