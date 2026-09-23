// services/events.ts
import { cache } from 'react';
import { sanitizeText, sanitizeHeadline } from '@/lib/sanitize';
import { apiInit } from '@/lib/api-timeout';

const NEW_API_BASE = 'https://development.acnnewswire.com';

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

/**
 * The organiser as /full returns it: already deduped, already absolute.
 *
 * Note the casing. Every other endpoint spells this `companyID` with a capital
 * D and ships a bare filename in `logoFileName`; /full spells it `id` and
 * returns `logo` and `url` as absolute URLs. Do not reuse the AcnEventCompany
 * shape from the older endpoints here.
 */
interface AcnEventOrganiser {
  id: number;
  name: string | null;
  logo: string | null;
  url: string | null;
}

/**
 * A row from /api/Events/full.
 *
 * This is the shape contracts/event.after.json asked the API team for, and it
 * is what they shipped: `name` instead of `description`, real +08:00 offsets,
 * `endDate` at 23:59:59, absolute `url` and `photo`, a boolean `isPublished`,
 * and `organiserId`/`organisers[]` in place of `compId`/`companies[]`. The
 * `lid`, `inUrl` and `pressReleaseUrl` fields are gone — none carried
 * information.
 */
interface AcnEventFull {
  id: number;
  name: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  url: string | null;
  photo: string | null;
  isPublished: boolean;
  organiserId: number | null;
  organisers: AcnEventOrganiser[] | null;
}

interface AcnEventRelease {
  articleId: number;
  headline: string;
  summary: string | null;
  systemDate: string;
  companyId: number | null;
}

/**
 * The wire now stamps its own offset, so this is a guard rather than a patch.
 *
 * /api/Events/full returns "2009-07-16T00:00:00+08:00" — a real offset, and an
 * `endDate` already pushed to 23:59:59. Both of those used to be invented here
 * because the old endpoint sent offsetless midnights that a browser would read
 * in the VISITOR's zone, landing an event a day early west of the wire.
 *
 * The stamping is kept only for a value that arrives without an offset, which
 * /full is not expected to produce. It is cheap, and it means a backend
 * regression degrades to the old display-patch behaviour instead of to the
 * off-by-one-day bug.
 */
const EVENT_TZ_OFFSET = '+08:00';
export const EVENT_TZ_LABEL = 'SGT';

function toEventIso(raw: string, endOfDay = false): string {
  if (!raw) return '';
  // Already carries an offset (or a Z) - trust it. This is now the normal path.
  if (/([+-]\d{2}:\d{2}|Z)$/.test(raw)) return raw;
  const day = raw.slice(0, 10);
  return `${day}T${endOfDay ? '23:59:59' : '00:00:00'}${EVENT_TZ_OFFSET}`;
}

/**
 * Wire row → app model.
 *
 * The app-facing `Event` interface is deliberately unchanged by the migration:
 * `name` maps back onto `description` and `organiserId`/`organisers` back onto
 * `compId`/`companies`, so no component, route or mock had to move. Renaming
 * the app model to match the wire is a separate, larger change that has to land
 * in this repo and acn-admin together — see contracts/event.after.json.
 *
 * Everything this function used to repair is now done upstream: no scheme to
 * prefix onto `url`, no host to prefix onto the image, and no organiser
 * dedupe — /full sends each organiser once, where the old endpoint repeated it
 * once per release the organiser had (167 copies on the worst event).
 */
function mapEvent(e: AcnEventFull): Event {
  const companies: EventCompany[] = [];
  for (const raw of e.organisers ?? []) {
    if (!raw) continue;
    const name = sanitizeText(raw.name);
    if (name) companies.push({ id: raw.id, name, logo: raw.logo, url: raw.url });
  }

  return {
    id: e.id,
    startDate: toEventIso(e.startDate),
    endDate: toEventIso(e.endDate, true),
    description: sanitizeText(e.name),
    location: sanitizeText(e.location),
    url: e.url ?? '',
    pressReleaseUrl: null,
    photo: e.photo ?? null,
    compId: e.organiserId ?? null,
    companies,
  };
}

/**
 * The whole published archive, in one request.
 *
 * /api/Events/full replaced a sequential sweep of up to 20 pages against
 * /api/Events. It also removed the reason that sweep could not be cached the
 * way the rest of this service layer is: the old response was ~2.65MB because
 * of the repeated-organiser bug, over Next's 2MB cache ceiling, so `next:
 * { revalidate }` there would silently do nothing and the mapped result had to
 * be wrapped in unstable_cache instead. /full returns the same 816 events in
 * 286KB, which fits, so this is back on the fetch-site caching convention the
 * BIBLE specifies and unstable_cache is gone.
 *
 * `PageSize` is not capped on this route (unlike `Size` on /api/Companies,
 * which 400s over 100), and 2000 comfortably clears the 816 rows on the wire.
 *
 * /full is published-only — the 23 events the wire marks unpublished are not in
 * it, and 404 on the detail route. That is exactly what this site wants, and it
 * is why the admin panel keeps the legacy sweep alongside this call.
 */
const PAGE_SIZE = 2000;

/**
 * React cache() collapses the several calls a single render can make (page +
 * generateMetadata + fetchEvent) into one; the fetch cache holds it across
 * requests for REVALIDATE seconds.
 */
const loadEvents = cache(async (): Promise<Event[]> => {
  try {
    const res = await fetch(
      `${NEW_API_BASE}/api/Events/full?PageNumber=1&PageSize=${PAGE_SIZE}`,
      apiInit({ next: { revalidate: REVALIDATE }, headers: { Accept: 'application/json' } }),
    );
    if (!res.ok) return [];
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];
    // isPublished is filtered upstream; re-checked so a change of heart on the
    // wire cannot put an unpublished event on the public site.
    return (raw as AcnEventFull[]).filter((e) => e.isPublished !== false).map(mapEvent);
  } catch {
    return [];
  }
});

export async function fetchEvents(): Promise<Event[]> {
  return loadEvents();
}

/**
 * A single event by numeric id.
 *
 * This now goes straight at /api/Events/{id}/full. The old /api/Events/{id}
 * answered 500 for every id ("The required column 'Companies' was not present
 * in the results of a 'FromSql' operation") from at least 2026-09-07 until the
 * /full routes shipped, and it STILL does — the fix landed on /full, not on the
 * original route. So this reads the /full detail and falls back to the cached
 * list, which costs nothing when the list is already warm and keeps the page
 * working if the detail route regresses.
 *
 * An unpublished or unknown id is a 404 here, which correctly becomes null.
 */
export async function fetchEvent(id: string | number): Promise<Event | null> {
  const numeric = Number(id);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  try {
    const res = await fetch(
      `${NEW_API_BASE}/api/Events/${numeric}/full`,
      apiInit({ next: { revalidate: REVALIDATE }, headers: { Accept: 'application/json' } }),
    );
    if (res.ok) {
      const raw = (await res.json()) as AcnEventFull | null;
      if (raw && typeof raw.id === 'number' && raw.isPublished !== false) return mapEvent(raw);
    }
    // 404 is a real answer - the event does not exist, or is unpublished.
    if (res.status === 404) return null;
  } catch {
    // fall through to the list
  }

  const events = await loadEvents();
  return events.find((e) => e.id === numeric) ?? null;
}

/**
 * The releases filed against an event.
 *
 * Unchanged by the migration, and still the only event→release relation on the
 * wire: the organiser company plus the year the event ran, which is what
 * /api/Events/company/{companyId}/year/{year} keys on. It was already healthy;
 * what changed is that `organiserId` now arrives populated, so the 108 events
 * that have an organiser can actually resolve a feed. Events with no organiser,
 * or whose organiser filed nothing that year, correctly return [].
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
