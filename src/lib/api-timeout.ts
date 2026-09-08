// lib/api-timeout.ts
//
// A request deadline for the primary API.
//
// Without one, a fetch to an unreachable host sits until the OS gives up on the
// socket — measured at ~20s per call against development.acnnewswire.com while
// the VMs were down. Pages degrade correctly when a fetch fails (every caller
// treats !res.ok and a throw as "no rows"), but they degrade *slowly*, and a
// page that renders its empty state after 20s reads as broken rather than empty.
//
// 6s is chosen to sit above the slowest healthy response observed (the events
// list, ~2.5s for 839 rows) with headroom, and well under the point where a
// visitor assumes the page is hung.
//
// Note this is a per-attempt deadline, not a retry budget. Next does not cache
// failed responses, so a request that times out is re-attempted on the next
// render rather than being remembered as empty.
export const API_TIMEOUT_MS = 6000;

/**
 * Adds the deadline to a fetch init, preserving whatever else is on it.
 *
 *   fetch(url, apiInit({ next: { revalidate: 3600 } }))
 */
export function apiInit(init: RequestInit = {}): RequestInit {
  return { ...init, signal: AbortSignal.timeout(API_TIMEOUT_MS) };
}
