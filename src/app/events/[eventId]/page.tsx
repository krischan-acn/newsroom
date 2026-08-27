// app/events/[eventId]/page.tsx
//
// Event detail page. Served entirely from src/data/mock-events.ts — this route
// is a design preview and makes no API call. Slugs that are not in that file
// (including the numeric ids the live /events listing uses) fall through to
// notFound(), so nothing here can shadow a real event.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMockEvent, MOCK_EVENTS, type MockEvent } from '@/data/mock-events';
import { EventCountdown } from '@/components/events/EventCountdown';
import { EventReleaseItem } from '@/components/events/EventReleaseItem';
import {
  eventDayCount,
  eventPhase,
  formatEventMoment,
  formatEventRange,
} from '@/components/events/event-date';
import { deriveEventIndustries, trimIndustries } from '@/components/events/event-industries';
import { RailRow, RailSection, RAIL_WIDTH } from '@/components/ui/Rail';
import { SITE_URL } from '@/lib/metadata';

type Props = {
  params: Promise<{ eventId: string }>;
};

export function generateStaticParams() {
  return MOCK_EVENTS.map((event) => ({ eventId: event.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = getMockEvent(eventId);
  if (!event) return { title: 'Event not found | ACN Newswire' };

  const dates = formatEventRange(event.startDate, event.endDate);
  const description = `${event.subtitle}. ${dates}, ${event.venue}, ${event.city}. ${event.pressReleases.length} press releases from the show.`;

  return {
    title: `${event.name} | ACN Newswire`,
    description,
    openGraph: {
      title: event.name,
      description,
      url: `${SITE_URL}/events/${event.slug}`,
      type: 'website',
    },
  };
}

function Hero({ event }: { event: MockEvent }) {
  return (
    <div className={`bg-gradient-to-br ${event.heroGradient}`}>
      <div className="container mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-white/70">
          <Link href="/events" className="hover:text-white hover:underline">
            Events
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white/90">{event.name}</span>
        </nav>

        {/* No tagline eyebrow here: an organiser's campaign slogan changes every
            edition, is not in the events API, and would be one more field for
            whoever maintains this data to chase. */}
        <h1 className="max-w-3xl text-3xl leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          {event.name}
        </h1>

        <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
          {event.subtitle}
        </p>

        <dl className="mt-8 flex flex-col gap-x-10 gap-y-4 text-sm text-white/90 sm:flex-row sm:flex-wrap">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Dates
            </dt>
            <dd className="mt-1">{formatEventRange(event.startDate, event.endDate)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Venue
            </dt>
            <dd className="mt-1">{event.venue}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Duration
            </dt>
            <dd className="mt-1">{eventDayCount(event.startDate, event.endDate)} days</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function StatBand({ event }: { event: MockEvent }) {
  if (event.stats.length === 0) return null;

  return (
    <div className="border-y border-gray-200 bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 lg:px-8">
        <dl className="grid grid-cols-2 divide-gray-200 sm:grid-cols-4 sm:divide-x">
          {event.stats.map((stat) => (
            <div key={stat.label} className="px-2 py-6 text-center sm:px-4">
              <dd className="text-2xl tracking-tight text-black sm:text-3xl">{stat.value}</dd>
              <dt className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default async function EventPage({ params }: Props) {
  const { eventId } = await params;
  const event = getMockEvent(eventId);
  if (!event) notFound();

  const phase = eventPhase(event.startDate, event.endDate, Date.now());

  // Newest first — for a live show the latest release off the floor is the one
  // worth reading, and for an archive the closing report leads.
  const releases = [...event.pressReleases].sort((a, b) =>
    b.dateTime.localeCompare(a.dateTime),
  );

  const industryGroups = deriveEventIndustries(event.pressReleases);
  const industries = trimIndustries(industryGroups);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.about[0],
    startDate: event.startDate,
    endDate: event.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: `${SITE_URL}/events/${event.slug}`,
    location: {
      '@type': 'Place',
      name: event.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.city,
        addressCountry: event.country,
      },
    },
    organizer: { '@type': 'Organization', name: event.organiser, url: event.website },
    // Every industry tag, not the trimmed set the block displays — the visual
    // cut is about screen space, and there is no reason to hide tags from a
    // crawler. Still one derived list, so it cannot drift from the page.
    keywords: industryGroups.flatMap((g) => g.industries.map((i) => i.name)).join(', '),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Hero event={event} />
      <StatBand event={event} />

      <div className="container mx-auto min-h-125 max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex flex-col-reverse gap-8 lg:flex-row lg:items-start lg:gap-12">
          {/* Main column */}
          <div className="min-w-0 flex-1">
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-semibold text-black">About the Event</h2>
              <div className="space-y-4">
                {event.about.map((paragraph, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Replaces the hand-written Programme Themes block: the same
                industry tags the rest of the site filters on, counted across
                this event's releases and ordered by weight.

                Laid out as one column per sector so the whole block costs three
                rows of height regardless of how many tags the releases carry. */}
            {industries.groups.length > 0 && (
              <section className="mb-10">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 className="text-2xl font-semibold text-black">Industries Covered</h2>
                  <p className="text-xs text-gray-400">
                    From this event&rsquo;s press release tags
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-x-8 border-y border-gray-200 py-3 sm:grid-cols-2 lg:grid-cols-3 lg:divide-x lg:divide-gray-200">
                  {industries.groups.map((group) => (
                    <div key={group.category} className="min-w-0 lg:px-4 lg:first:pl-0 lg:last:pr-0">
                      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        {group.category}
                      </h3>
                      <ul className="mt-1">
                        {group.industries.map((industry) => (
                          <li key={industry.name}>
                            <Link
                              href={industry.href}
                              className="flex items-baseline justify-between gap-2 py-0.5 text-xs text-gray-700 transition-colors hover:text-[#2088c9]"
                            >
                              <span className="truncate">{industry.name}</span>
                              <span className="shrink-0 tabular-nums text-[10px] text-gray-400">
                                {industry.count}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {industries.hiddenCount > 0 && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    +{industries.hiddenCount} more{' '}
                    {industries.hiddenCount === 1 ? 'industry' : 'industries'}
                    {industries.hiddenCategories.length > 0 &&
                      `, including ${industries.hiddenCategories.join(' and ')}`}
                  </p>
                )}
              </section>
            )}

            <section className="mb-10">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-semibold text-black">Press Releases</h2>
                <p className="text-xs text-gray-400">
                  {releases.length} release{releases.length === 1 ? '' : 's'} from this event
                </p>
              </div>

              {releases.length === 0 ? (
                <p className="py-8 text-gray-500">
                  No press releases linked to this event yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-200 border-t border-gray-200">
                  {releases.map((release) => (
                    <EventReleaseItem key={release.id} release={release} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Rail: the countdown first, because on an upcoming event it is the
              thing a visitor came for. */}
          <aside className={RAIL_WIDTH}>
            <div className="mb-6">
              <EventCountdown
                startDate={event.startDate}
                endDate={event.endDate}
                tzLabel={event.timezoneLabel}
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
                <RailRow
                  divided
                  label="Opens"
                  value={formatEventMoment(event.startDate, event.timezoneLabel)}
                />
                <RailRow
                  divided
                  label="Closes"
                  value={formatEventMoment(event.endDate, event.timezoneLabel)}
                />
                <RailRow divided block label="Venue" value={event.venue} />
                <RailRow divided label="City" value={event.city} />
                <RailRow divided label="Organiser" value={event.organiser} />
                {event.strategicPartner && (
                  <RailRow
                    divided
                    block
                    label="Strategic partner"
                    value={event.strategicPartner}
                  />
                )}
                <RailRow divided label="Admission" value={event.admission} />
                <RailRow
                  divided
                  block
                  label="Opening hours"
                  value={event.openingHours.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                />
              </dl>

              <a
                href={event.website}
                target="_blank"
                rel="noopener noreferrer"
                className="button alt mt-4 block text-center"
              >
                Visit event website
              </a>
            </RailSection>

            {/* No "On the Floor" or "Co-located Events" cards: pavilions,
                networking and what else runs at the venue are the organiser's
                to keep current, and the event website is one click away in the
                card above. This page aggregates the coverage instead. */}

            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
              {phase === 'ended'
                ? 'Archived event page. Details reflect the show as it ran.'
                : 'Sample event page. Details are illustrative and not drawn from the newswire API.'}
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
