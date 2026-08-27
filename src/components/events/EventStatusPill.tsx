'use client';

// components/events/EventStatusPill.tsx
//
// The compact form of the countdown, for listing rows: "Opens in 6 days",
// "Happening now", "Ended". Client-side for the same reason as
// EventCountdown — the day count depends on the visitor's clock, and the
// listing is cached, so a server-rendered figure would go stale.

import { useEffect, useState } from 'react';
import { eventPhase } from './event-date';

interface Props {
  startDate: string;
  endDate: string;
}

function untilLabel(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `Opens in ${days} day${days === 1 ? '' : 's'}`;

  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `Opens in ${hours} hour${hours === 1 ? '' : 's'}`;

  const minutes = Math.max(1, Math.floor(ms / 60_000));
  return `Opens in ${minutes} min`;
}

export function EventStatusPill({ startDate, endDate }: Props) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    // A minute is plenty here; the seconds live on the event page itself.
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reserve the line's height before mount so the row does not jump.
  if (now === null) {
    return <span className="inline-block h-[18px] w-24" aria-hidden="true" />;
  }

  const phase = eventPhase(startDate, endDate, now);

  if (phase === 'ended') {
    return (
      <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Ended
      </span>
    );
  }

  if (phase === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-[#2088c9]/30 bg-[#2088c9]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1a6d9f]">
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2088c9] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2088c9]" />
        </span>
        Happening now
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
      {untilLabel(new Date(startDate).getTime() - now)}
    </span>
  );
}
