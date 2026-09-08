// app/events/[eventId]/LiveEvent.tsx
//
// The API-backed event detail page.
//
// This renders alongside — not instead of — the curated pages in
// src/data/mock-events.ts. page.tsx resolves a mock slug first and only falls
// through to here for the numeric ids the live /events listing links to, so the
// four hand-written showcase events keep their full-fat design while every
// other event on the newswire now has a real page instead of a 404.
//
// The API carries roughly a third of what the curated pages render: it has
// dates, description, location, url, image and the organiser company, but no
// subtitle, venue, city, organiser blurb, admission, opening hours, about-copy
// or attendance stats. Rather than invent them, every card here is built on the
// Rail primitives and self-omits when its value is missing (see the
// self_omitting_cards convention), so this page is thinner than a curated one
// but nothing on it is fabricated.

import Link from 'next/link';
import {
  type Event,
  type EventRelease,
  EVENT_TZ_LABEL,
} from '@/services/events';
import type { CompanyArticle } from '@/services/company-articles';
import { EventCountdown } from '@/components/events/EventCountdown';
import { PressReleaseItem } from '@/components/press-release/PressReleaseItem';
import {
  eventDayCount,
  eventPhase,
  formatEventRange,
} from '@/components/events/event-date';
import { RailRow, RailSection, RAIL_WIDTH } from '@/components/ui/Rail';
import { SITE_URL } from '@/lib/metadata';

/** Neutral stand-in for the per-event gradient the curated pages carry. */
const HERO_GRADIENT = 'from-slate-800 to-slate-600';

function toCompanyArticle(release: EventRelease): CompanyArticle {
  return {
    id: release.id,
    headline: release.headline,
    dateTime: release.dateTime,
    thumbImage: null,
    description: release.summary,
  };
}

function Hero({ event }: { event: Event }) {
  const days = eventDayCount(event.startDate, event.endDate);

  return (
    <div className={`bg-gradient-to-br ${HERO_GRADIENT}`}>
      <div className="container mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-white/70">
          <Link href="/events" className="hover:text-white hover:underline">
            Events
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white/90">{event.description}</span>
        </nav>

        <h1 className="max-w-3xl text-3xl leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          {event.description}
        </h1>

        <dl className="mt-8 flex flex-col gap-x-10 gap-y-4 text-sm text-white/90 sm:flex-row sm:flex-wrap">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Dates
            </dt>
            <dd className="mt-1">{formatEventRange(event.startDate, event.endDate)}</dd>
          </div>
          {event.location && (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Location
              </dt>
              <dd className="mt-1">{event.location}</dd>
            </div>
          )}
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Duration
            </dt>
            <dd className="mt-1">
              {days} {days === 1 ? 'day' : 'days'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function LiveEventPage({
  event,
  releases,
}: {
  event: Event;
  releases: EventRelease[];
}) {
  const phase = eventPhase(event.startDate, event.endDate, Date.now());
  const organiser = event.companies[0] ?? null;

  // Newest first, matching the curated pages.
  const sorted = [...releases].sort((a, b) => b.dateTime.localeCompare(a.dateTime));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: `${SITE_URL}/events/${event.id}`,
    // The API gives one free-text location string with no structured parts, so
    // this is a bare Place name rather than an invented PostalAddress.
    ...(event.location
      ? { location: { '@type': 'Place', name: event.location } }
      : {}),
    ...(organiser
      ? {
          organizer: {
            '@type': 'Organization',
            name: organiser.name,
            ...(organiser.url ? { url: organiser.url } : {}),
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Hero event={event} />

      <div className="container mx-auto min-h-125 max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex flex-col-reverse gap-8 lg:flex-row lg:items-start lg:gap-12">
          {/* Main column */}
          <div className="min-w-0 flex-1">
            {event.photo && (
              <div className="mb-8 overflow-hidden border border-gray-200">
                {/* Raw img, not next/image: the eventimages host is not in
                    next.config.ts remotePatterns, so next/image would reject
                    it. Matches how /events already lists these. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.photo}
                  alt={event.description}
                  loading="lazy"
                  className="w-full object-cover"
                />
              </div>
            )}

            <section className="mb-10">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-semibold text-black">Press Releases</h2>
                <p className="text-xs text-gray-400">
                  {sorted.length} {sorted.length === 1 ? 'release' : 'releases'} from this
                  event
                </p>
              </div>

              {sorted.length === 0 ? (
                <p className="py-8 text-gray-500">
                  No press releases linked to this event yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-200 border-t border-gray-200">
                  {sorted.map((release) => (
                    <PressReleaseItem
                      key={release.id}
                      article={toCompanyArticle(release)}
                      companyName={organiser?.name ?? ''}
                      logoSrc={organiser?.logo ?? null}
                      hideLogo
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className={RAIL_WIDTH}>
            <div className="mb-6">
              <EventCountdown
                startDate={event.startDate}
                endDate={event.endDate}
                tzLabel={EVENT_TZ_LABEL}
                initialPhase={phase}
              />
            </div>

            <RailSection boxed title="Event Details">
              <dl>
                <RailRow
                  divided
                  label="Dates"
                  value={formatEventRange(event.startDate, event.endDate)}
                />
                <RailRow divided block label="Location" value={event.location} />
                <RailRow divided label="Organiser" value={organiser?.name ?? ''} />
              </dl>

              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button alt mt-4 block text-center"
                >
                  Visit event website
                </a>
              )}
            </RailSection>

            {/* No opening hours, admission or venue card: gap EVT-02 — the API
                has no time, price or venue field to fill them from. */}

            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
              {phase === 'ended'
                ? 'Archived event page. Details reflect the show as it ran.'
                : 'Event details are drawn from the ACN Newswire events feed.'}
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
