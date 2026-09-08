import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchEvents, type Event } from '@/services/events';
import { generateListingMetadata } from '@/lib/metadata';
import { listMockEvents, type MockEvent } from '@/data/mock-events';
import { EventListCard } from '@/components/events/EventListCard';

export const metadata: Metadata = generateListingMetadata('events');

/** How many past events the listing renders. See the note in EventsPage. */
const PAST_LIMIT = 60;


function EventSection({
  title,
  events,
  hiddenCount = 0,
}: {
  title: string;
  events: Event[];
  hiddenCount?: number;
}) {
  if (events.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">{title}</h2>
      <div className="divide-y divide-gray-100">
        {events.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <p className="mt-4 text-xs text-gray-400">
          Showing the {events.length} most recent of {events.length + hiddenCount} past events.
        </p>
      )}
    </section>
  );
}

function formatEventDateRange(start: string, end: string): string {
  const parse = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const s = parse(start);
  const e = parse(end);
  if (start.slice(0, 10) === end.slice(0, 10)) {
    return s.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} - ${e.getDate()} ${s.toLocaleDateString('en-GB', { month: 'long' })} ${s.getFullYear()}`;
  }
  return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function EventItem({ event }: { event: Event }) {
  // Points at this site's own event page rather than the organiser's site.
  // Until the live detail route existed these rows could only link outward;
  // /events/<id> now renders the show's releases from the API.
  return (
    <div className="flex items-stretch gap-0 py-4">
      <Link
        href={`/events/${event.id}`}
        className="flex items-stretch flex-1 min-w-0 group"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.photo!}
          alt={event.description}
          loading="lazy"
          className="w-40 shrink-0 object-cover"
        />

        {/* Divider */}
        <div className="w-px bg-gray-200 shrink-0 self-stretch mx-1" />

        {/* Content */}
        <div className="flex-1 min-w-0 px-4 flex flex-col justify-center gap-1">
          <h3 className="text-md text-gray-900 leading-snug line-clamp-1 group-hover:text-[#2088c9] transition-colors">
            {event.description}
          </h3>
          <div className="flex flex-row gap-2 mt-0.5">
            <p className="text-xs text-gray-400">
              {formatEventDateRange(event.startDate, event.endDate)}
            </p>
          </div>
          {event.location && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {event.location}
            </p>
          )}
        </div>
      </Link>

      {/* Action buttons */}
      <div className="shrink-0 flex flex-col justify-center gap-2 pl-4">
        <Link
          href={`/events/${event.id}`}
          className="px-3 py-1.5 text-xs rounded border text-gray-700 border-gray-300 hover:bg-gray-50 whitespace-nowrap"
        >
          Event Press Releases
        </Link>
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs rounded border text-gray-700 border-gray-300 hover:bg-gray-50 whitespace-nowrap"
        >
          Event Website
        </a>
      </div>
    </div>
  );
}

/**
 * Events that have a full page on this site — countdown, details and the
 * releases filed against them. Sample data for now; see data/mock-events.ts.
 */
function FeaturedEventSection({
  title,
  note,
  events,
}: {
  title: string;
  note?: string;
  events: MockEvent[];
}) {
  if (events.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
      <div className="divide-y divide-gray-100 border-y border-gray-100">
        {events.map((event) => (
          <EventListCard key={event.slug} event={event} />
        ))}
      </div>
    </section>
  );
}

export default async function EventsPage() {
  const events = await fetchEvents();
  const featured = listMockEvents(Date.now());

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = events
    .filter((e) => e.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // The archive runs to 800+ shows. Rendering every one produced a 2.4MB page,
  // so the past list is capped while upcoming is always shown in full - that is
  // the half a visitor came for. Raise PAST_LIMIT or add a pager if the whole
  // archive needs to be browsable.
  const allPast = events
    .filter((e) => e.startDate < today)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const past = allPast.slice(0, PAST_LIMIT);
  const pastHidden = allPast.length - past.length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl tracking-tight text-black mb-8">Events</h1>

      <FeaturedEventSection
        title="Featured Events"
        note="Full event pages with live countdown and linked press releases"
        events={featured.upcoming}
      />

      {events.length === 0 ? (
        featured.upcoming.length === 0 && featured.past.length === 0 && (
          <p className="text-gray-500 py-8">No events scheduled.</p>
        )
      ) : (
        <>
          <EventSection title="Upcoming Events" events={upcoming} />
          <EventSection title="Past Events" events={past} hiddenCount={pastHidden} />
        </>
      )}

      <FeaturedEventSection title="Featured Archive" events={featured.past} />
    </div>
  );
}
