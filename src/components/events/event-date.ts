// components/events/event-date.ts
//
// Date formatting for the event pages. Kept separate from lib/utils because
// these all read an offset-bearing ISO string ("2026-09-02T10:00:00+08:00") and
// render it in the *event's* timezone, not the visitor's — a show that opens at
// 10:00 in Singapore should not read "02:00" to someone in London.

/** Offset in minutes parsed out of the ISO string itself. */
function offsetMinutes(iso: string): number {
  const match = iso.match(/([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const [, sign, hours, mins] = match;
  const total = Number(hours) * 60 + Number(mins);
  return sign === '-' ? -total : total;
}

/**
 * Shifts an instant so that reading it with the UTC getters yields the wall
 * clock at the event's own offset. Only ever used for display.
 */
function atEventOffset(iso: string): Date {
  const instant = new Date(iso);
  return new Date(instant.getTime() + offsetMinutes(iso) * 60_000);
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "2 – 4 September 2026", collapsing shared month and year. */
export function formatEventRange(startIso: string, endIso: string): string {
  const start = atEventOffset(startIso);
  const end = atEventOffset(endIso);

  const sameDay =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCDate() === end.getUTCDate();

  if (sameDay) {
    return `${start.getUTCDate()} ${MONTHS_LONG[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }

  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    return `${start.getUTCDate()} – ${end.getUTCDate()} ${MONTHS_LONG[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }

  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${start.getUTCDate()} ${MONTHS_LONG[start.getUTCMonth()]} – ${end.getUTCDate()} ${MONTHS_LONG[end.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }

  return `${start.getUTCDate()} ${MONTHS_LONG[start.getUTCMonth()]} ${start.getUTCFullYear()} – ${end.getUTCDate()} ${MONTHS_LONG[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}

/** "Wednesday, 2 September 2026, 10:00 SGT" — used on the key-facts rail. */
export function formatEventMoment(iso: string, tzLabel: string): string {
  const d = atEventOffset(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} ${tzLabel}`;
}

/** Whole days the show runs for, inclusive of first and last day. */
export function eventDayCount(startIso: string, endIso: string): number {
  const start = atEventOffset(startIso);
  const end = atEventOffset(endIso);
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.round((endDay - startDay) / 86_400_000) + 1;
}

export type EventPhase = 'upcoming' | 'live' | 'ended';

export function eventPhase(startIso: string, endIso: string, nowMs: number): EventPhase {
  if (nowMs < new Date(startIso).getTime()) return 'upcoming';
  if (nowMs <= new Date(endIso).getTime()) return 'live';
  return 'ended';
}
