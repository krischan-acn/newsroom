// services/events.ts
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sanitizeText, sanitizeHeadline } from '@/lib/sanitize';
import { apiInit } from '@/lib/api-timeout';

const NEW_API_BASE = 'https://development.acnnewswire.com';
const EVENT_IMAGE_BASE = 'https://www.acnnewswire.com/eventimages/';

const REVALIDATE = 3600;

export interface EventCompany {
  id: number;
  name: string;
  logo: string | null;
  url: string | null;
}

export interface Event {
  id: number;
  startDate: string;
  endDate: string;
  description: string;
  location: string;
  url: string;
  pressReleaseUrl: string | null;
  photo: string | null;
  /** Organiser company. The key that relates an event to its releases. */
  compId: number | null;
  companies: EventCompany[];
}

/** A release filed against an event, from /api/Events/company/{id}/year/{y}. */
export interface EventRelease {
  id: number;
  headline: string;
  summary: string | null;
  dateTime: string;
  companyId: number | null;
}

interface AcnEventCompany {
  companyID: number;
  companyName: string | null;
  logoFileName: string | null;
  topLogoFileName: string | null;
  companyURL: string | null;
}

interface AcnEvent {
  id: number;
  startDate: string;
  endDate: string;
  description: string;
  location: string;
  url: string;
  inUrl: string;
  eventImage: string;
  lid: string;
  publish: string;
  compId: number | null;
  companies: AcnEventCompany[] | null;
}

interface AcnEventRelease {
  articleId: number;
  headline: string;
  summary: string | null;
  systemDate: string;
  companyId: number | null;
}

const LOGO_BASE = 'https://www.acnnewswire.com/images/company/';

function mapCompany(c: AcnEventCompany): EventCompany {
  return {
    id: c.companyID,
    name: sanitizeText(c.companyName),
    logo: c.logoFileName ? `${LOGO_BASE}${c.logoFileName}` : null,
    url: c.companyURL
      ? (/^https?:\/\//i.test(c.companyURL) ? c.companyURL : `https://${c.companyURL}`)
      : null,
  };
}

/**
 * The events endpoint returns date-only midnights with no offset
 * ("2009-07-16T00:00:00" — gap EVT-02: there is no opening time or timezone on
 * any event record). Left as-is, components/events/event-date.ts would read
 * them with the UTC getters after JS had parsed them as *local* time, landing a
 * day early for any visitor east of Greenwich.
 *
 * So an explicit offset is stamped on here. +08:00 matches the convention
 * src/data/mock-events.ts already uses and the region ACN's shows run in. The
 * end date is pushed to the close of its day so an event on its final day still
 * reads as running rather than ended.
 *
 * This is a display-honesty patch over missing data, not a fact from the API —
 * drop it if the backend ever returns real times with offsets.
 */
const EVENT_TZ_OFFSET = '+08:00';
export const EVENT_TZ_LABEL = 'SGT';

function toEventIso(raw: string, endOfDay = false): string {
  if (!raw) return '';
  // Already carries an offset (or a Z) - trust it.
  if (/([+-]\d{2}:\d{2}|Z)$/.test(raw)) return raw;
  const day = raw.slice(0, 10);
  return `${day}T${endOfDay ? '23:59:59' : '00:00:00'}${EVENT_TZ_OFFSET}`;
}

function mapEvent(e: AcnEvent): Event {
  // The API repeats the same company once per release it has, so dedupe by id.
  const seen = new Set<number>();
  const companies: EventCompany[] = [];
  for (const raw of e.companies ?? []) {
    if (!raw || seen.has(raw.companyID)) continue;
    seen.add(raw.companyID);
    const company = mapCompany(raw);
    if (company.name) companies.push(company);
  }

  return {
    id: e.id,
    startDate: toEventIso(e.startDate),
    endDate: toEventIso(e.endDate, true),
    description: sanitizeText(e.description),
    location: sanitizeText(e.location),
    url: e.url ? (e.url.startsWith('http') ? e.url : `https://${e.url}`) : '',
    pressReleaseUrl: null,
    photo: e.eventImage ? `${EVENT_IMAGE_BASE}${e.eventImage}` : null,
    compId: e.compId ?? null,
    companies,
  };
}

/**
 * The list endpoint is the only working way to read events, so both fetchEvents
 * and fetchEvent go through this one call and share its cache entry.
 *
 * It PAGES. pageSize is honoured and the default is only 10, so a single
 * unpaged call silently returns a tiny arbitrary slice. The API also does not
 * order by date - page 1 is mostly 2007-2015 shows - so truncating the fetch
 * drops the upcoming events entirely, which is the half anyone visiting /events
 * actually wants. There were 839 events (816 published) at the last count.
 *
 * Deliberately NOT cached at the fetch() call site, which is the convention
 * everywhere else in this service layer: the full sweep is ~2.6MB because the
 * API repeats an event's organiser once per release it has (one event ships the
 * same company 167 times), and Next refuses to cache an entry over 2MB - so
 * `next: { revalidate }` here would silently do nothing.
 *
 * Caching the *mapped* result instead sidesteps that: mapEvent dedupes those
 * repeats, taking 816 events down to ~233KB. Hence unstable_cache below.
 */
const PAGE_SIZE = 500;
/** Safety stop, so a misbehaving endpoint cannot spin this forever. */
const MAX_PAGES = 20;

async function fetchRawEventPage(page: number): Promise<AcnEvent[]> {
  try {
    const res = await fetch(
      `${NEW_API_BASE}/api/Events?pageNumber=${page}&pageSize=${PAGE_SIZE}`,
      // Timed out like the rest: this sweep is sequential over up to MAX_PAGES,
      // so an unreachable host would otherwise stall for 20s per page before
      // the loop gave up.
      apiInit({ cache: 'no-store', headers: { Accept: 'application/json' } }),
    );
    if (!res.ok) return [];
    const raw = await res.json();
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function fetchRawEvents(): Promise<AcnEvent[]> {
  const all: AcnEvent[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const rows = await fetchRawEventPage(page);
    all.push(...rows);
    // A short page is the last page - the endpoint returns no total count.
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

/**
 * unstable_cache persists the small mapped array across requests; React cache()
 * collapses the several calls a single render can make (page + generateMetadata
 * + fetchEvent) into one.
 */
const loadEvents = cache(
  unstable_cache(
    async (): Promise<Event[]> => {
      const raw = await fetchRawEvents();
      return raw.filter((e) => e.publish === 'y').map(mapEvent);
    },
    ['acn-events-list'],
    { revalidate: REVALIDATE, tags: ['events'] },
  ),
);

export async function fetchEvents(): Promise<Event[]> {
  return loadEvents();
}

/**
 * A single event by numeric id.
 *
 * Deliberately reads the list endpoint and filters, rather than calling
 * /api/Events/{id}: that route has returned HTTP 500 since at least 2026-09-07
 * ("The required column 'Companies' was not present in the results of a
 * 'FromSql' operation") and still did when re-probed on 2026-09-08. The list
 * endpoint returns the *same* per-event object, companies included, so nothing
 * is lost by reading it here — and both calls share one cache entry.
 *
 * Switch to /api/Events/{id} once the backend fixes that column.
 */
export async function fetchEvent(id: string | number): Promise<Event | null> {
  const numeric = Number(id);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const events = await loadEvents();
  return events.find((e) => e.id === numeric) ?? null;
}

/**
 * The releases filed against an event.
 *
 * There is still no direct event→release endpoint. The relation available today
 * is the organiser company plus the year the event ran, which is what
 * /api/Events/company/{companyId}/year/{year} keys on. Events whose compId is
 * null, or whose organiser filed nothing that year, correctly return [].
 */
export async function fetchEventReleases(
  compId: number | null | undefined,
  year: number | string,
): Promise<EventRelease[]> {
  const id = Number(compId);
  const y = Number(year);
  if (!Number.isFinite(id) || id <= 0) return [];
  if (!Number.isFinite(y) || y < 1990) return [];

  try {
    const res = await fetch(
      `${NEW_API_BASE}/api/Events/company/${id}/year/${y}`,
      apiInit({ next: { revalidate: REVALIDATE }, headers: { Accept: 'application/json' } }),
    );
    if (!res.ok) return [];
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];

    return (raw as AcnEventRelease[]).map((r) => ({
      id: r.articleId,
      headline: sanitizeHeadline(r.headline),
      summary: sanitizeText(r.summary) || null,
      dateTime: r.systemDate,
      companyId: r.companyId ?? null,
    }));
  } catch {
    return [];
  }
}

/** The year an event's releases are filed under. */
export function eventYear(event: Pick<Event, 'startDate'>): number {
  return Number(event.startDate.slice(0, 4));
}
