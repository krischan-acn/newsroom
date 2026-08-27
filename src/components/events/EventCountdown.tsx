'use client';

// components/events/EventCountdown.tsx
//
// Live countdown to (or through) an event. Three states:
//   upcoming — counts down to the opening bell
//   live     — counts down to close, with a pulsing "happening now" marker
//   ended    — states how long ago it finished, and stops ticking
//
// Hydration: the event pages are statically generated, so "the server's clock"
// is really *build* time and can be months stale — it cannot be used to pick
// the state. The first paint therefore shows the date range with placeholder
// digits, and the real state arrives on mount.
//
// The one exception is `initialPhase === 'ended'`. Time only moves forward, so
// an event that had already finished at build time has finished for every
// visitor from now on; that state is safe to render straight away, which spares
// the archive pages a flash of countdown they will never need.

import { useEffect, useState } from 'react';
import { eventPhase, formatEventRange, type EventPhase } from './event-date';

interface Props {
  startDate: string;
  endDate: string;
  tzLabel: string;
  /** Phase as computed when the page was rendered. Only trusted when 'ended'. */
  initialPhase: EventPhase;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function breakDown(ms: number): Remaining {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

/** Coarse enough to read as prose after the fact: "3 months ago". */
function describeElapsed(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days >= 730) return `${Math.floor(days / 365)} years ago`;
  if (days >= 365) return 'a year ago';
  if (days >= 60) return `${Math.floor(days / 30)} months ago`;
  if (days >= 30) return 'a month ago';
  if (days >= 2) return `${days} days ago`;
  if (days === 1) return 'yesterday';
  return 'earlier today';
}

function Unit({ value, label, ready }: { value: number; label: string; ready: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-3xl leading-none tabular-nums text-black sm:text-4xl">
        {ready ? String(value).padStart(2, '0') : '––'}
      </span>
      <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
    </div>
  );
}

export function EventCountdown({ startDate, endDate, tzLabel, initialPhase }: Props) {
  // `null` until mount — see the hydration note above.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ready = now !== null;
  const phase: EventPhase = ready ? eventPhase(startDate, endDate, now) : initialPhase;

  if (phase === 'ended') {
    const elapsed = ready ? now - new Date(endDate).getTime() : 0;
    return (
      <div className="border border-gray-200 bg-gray-50 px-5 py-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          This event has finished
        </p>
        <p className="mt-2 text-lg text-gray-700">
          {ready ? `Closed ${describeElapsed(elapsed)}` : 'Closed'}
        </p>
        <p className="mt-3 text-xs text-gray-500">
          Press releases from the show remain below.
        </p>
      </div>
    );
  }

  const isLive = ready && phase === 'live';
  const target = isLive ? new Date(endDate).getTime() : new Date(startDate).getTime();
  const remaining = breakDown(ready ? target - now : 0);

  return (
    <div className="border border-gray-200 px-5 py-6">
      <div className="mb-5 flex items-center justify-center gap-2">
        {isLive && (
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2088c9] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2088c9]" />
          </span>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {/* Neutral until the visitor's clock is known, so the heading never
              has to claim "opens in" about a show already underway. */}
          {!ready
            ? formatEventRange(startDate, endDate)
            : isLive
              ? 'Happening now — closes in'
              : 'Opens in'}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Unit value={remaining.days} label="Days" ready={ready} />
        <Unit value={remaining.hours} label="Hours" ready={ready} />
        <Unit value={remaining.minutes} label="Mins" ready={ready} />
        <Unit value={remaining.seconds} label="Secs" ready={ready} />
      </div>

      <p className="mt-5 border-t border-gray-100 pt-4 text-center text-[11px] text-gray-400">
        {ready
          ? `Counting to the ${isLive ? 'close' : 'opening'} of the show, ${tzLabel}`
          : `All times ${tzLabel}`}
      </p>
    </div>
  );
}
