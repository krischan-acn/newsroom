# Change report — connecting press releases, events and companies to the live API

**Date:** 2026-09-08
**Scope:** `newsroom-main` (frontend) — portal.acnnewswire.com
**API host:** `https://development.acnnewswire.com`
**Status:** Complete, builds clean, verified against the live API from a cold cache. **Not yet deployed.**

---

## Summary

The task was to connect press releases, events and companies to the API. Re-probing the API
first changed the shape of that work substantially: **the backend fixed the `Sectors` FromSql
500 sometime between 2026-09-07 and 2026-09-08**, which was the blocker behind every article
404ing on the deployed portal.

That turned the job from "work around dead endpoints" into "cut over to the endpoints that now
work, and stop paying for the ones that don't".

Along the way three problems surfaced that were not part of the original ask but blocked it:
a pre-existing SSR crash that would have 500'd every article page the moment they stopped
404ing; an events response too large for Next's cache; and a truncated events fetch that was
hiding every upcoming event. All three are fixed and documented below.

> **Correction, same day.** An earlier pass of this document reported "10 events, all
> 2007–2009" and "`pageSize` is ignored". Both were wrong — they came from probing
> `/api/Events` with no parameters, which returns a default page of 10. `pageSize` *is*
> honoured and there are **839 events running to 2026-12-02**. The figures below are corrected,
> and the fetch was fixed as a result.

---

## API state, re-probed 2026-09-08

Verified with real ids taken from the working list endpoints (articles `106624`–`106708`,
companies `14`/`82`/`574`, events `17`–`23`/`163`/`177`/`178`).

| Endpoint | `PROJECT-CONTEXT.toon` said (09-07) | Actual (09-08) |
|---|---|---|
| `/api/Articles/press-release/{id}` | 500 — CRITICAL | **200 — fixed** |
| `/api/Articles/by-company/{id}` | 500 — CRITICAL | **200 — fixed**, paginates correctly |
| `/api/Events/{id}` | 500 | 500 — still broken |
| `/api/Articles/by-industry` | `200-EMPTY` | **200** — it 400s without the *required* `industry` param |
| legacy host (all paths) | 503 | 503 — still down |

### Three further findings that changed the plan

1. **`sectors` is now a real array**, not a JSON-encoded string — closes gap `ART-01`. No code
   change was needed: `parseSectors` at `src/services/acn-adapter.ts:23` already accepted both
   shapes.
2. **Events now carry `compId` and a populated `companies[]`** — but on only **121 of 839**
   events (14 %). Gap `EVT-03` recorded "no event-to-release relation of any kind"; that relation
   now exists via `/api/Events/company/{id}/year/{year}`, but the other 718 events still cannot
   resolve releases.
3. **`/api/Articles/search` has no keyword parameter.** It accepts only `ExchangeId`,
   `SectorName`, `CompanyName`, `TickerId`, `Country`, `Page`, `Size` — and returned `[]` for
   every one tried. It cannot back `/search`. This needs raising with the backend.

---

## Changes by area

### Press releases

Already connected; the detail endpoint simply started working again. One change made:

- The legacy enrichment call in `src/services/press-release.ts` now carries a **2 s
  `AbortSignal.timeout`**. Next does not cache failed responses, so a permanently-503 host was
  being re-attempted on *every* article render, with the primary response already in hand.

The legacy call was **kept, not removed** — unlike the company feed. It is the only source of
`language`, and without it every article canonicalises to `/article/english/…` regardless of the
language it is actually written in.

### Companies

`src/services/company-articles.ts` was rewritten to read `/api/Articles/by-company/{id}` **only**.

Previously the dead legacy `GetNewsByCompanyId` was *primary* with the new API as fallback — and
both were failing, so the company archive had no working source at all. The legacy path,
including `legacyDateToIso`, `mapLegacyArticle` and the `LegacyCompanyNews` type, was deleted
rather than left as a fallback that can only fail.

Verified on the live endpoint: `pageNumber`/`pageSize` paginate correctly (pages 1/2/3 and
`pageSize=100`), and the rows carry `sectors`, `bodyHtml` and `images` that the legacy feed never
returned. A page past the last answers `404`, which is treated as "no rows" rather than an error.

### Events

The largest piece. Event detail pages were previously **100 % mock** and every numeric id 404'd.

`src/services/events.ts` gained:

| Export | Purpose |
|---|---|
| `fetchEvent(id)` | A single event. Reads the **list** endpoint and filters, because `/api/Events/{id}` still 500s. The list returns the same per-event object, so nothing is lost. |
| `fetchEventReleases(compId, year)` | The releases filed against an event, via `/api/Events/company/{id}/year/{year}`. |
| `eventYear(event)` | The year an event's releases are filed under. |
| `EVENT_TZ_LABEL` | Display label for the stamped offset. |

The `Event` type gained `compId` and a deduped `companies[]`.

**Curated mock pages are untouched.** `src/app/events/[eventId]/page.tsx` now resolves in two
steps: a slug in `src/data/mock-events.ts` renders the existing curated page byte-for-byte
unchanged; anything else is looked up against the live API and rendered by the new
`src/app/events/[eventId]/LiveEvent.tsx`. Only ids the API does not know 404 now. A slug can
never collide with a numeric id, so the ordering is safe.

`LiveEvent.tsx` uses `PressReleaseItem` rather than `EventReleaseItem` — those ids are real, so
the rows link, which is exactly what `EventReleaseItem`'s own comment says to do once the feed
is real.

The API carries roughly a third of what a curated page renders (no subtitle, venue, city,
organiser blurb, admission, opening hours, about-copy or stats). Rather than invent them, every
card is built on the `ui/Rail.tsx` primitives and self-omits when its value is missing, per the
existing `self_omitting_cards` convention. The page is thinner than a curated one, but nothing
on it is fabricated.

`src/app/events/page.tsx` listing rows now link **internally** to `/events/<id>`. Previously they
could only link out to the organiser's site, because `pressReleaseUrl` was pinned to `null`.

#### Date handling

The events endpoint returns date-only midnights with **no offset** (gap `EVT-02`). Left as-is,
`components/events/event-date.ts` would read them with the UTC getters after JS parsed them as
*local* time, landing a day early for any visitor east of Greenwich. `toEventIso()` stamps
`+08:00` — matching the convention `mock-events.ts` already uses — and pushes the end date to the
close of its day so an event on its final day still reads as running. This is a display-honesty
patch over missing data, flagged in-code as such; drop it if the backend ever returns real times.

---

## Two incidental fixes

### 1. Every article page would have 500'd — pre-existing, newly reachable

Once articles stopped 404ing, they hit:

```
TypeError: DOMpurify.sanitize is not a function
```

`src/components/press-release/Body.tsx` is marked `'use client'`, but **that marks where
hydration begins — it does not keep a component off the server.** React still renders it during
SSR, where plain `dompurify` has no DOM. This bug predates this work (`Body.tsx` was last touched
in `d64d677`); it was simply unreachable while the API was 500ing.

Restoring `isomorphic-dompurify` was not an option — `src/lib/sanitize.ts:2` records that
DOMPurify/jsdom cannot run in the serverless bundle, which is why it was removed in the first
place.

The fix implements the split that `sanitize.ts`'s own header already describes but never applied
to the body:

1. `sanitizeArticleHtml()` — a new **DOM-free regex pass** — runs during SSR, so the markup in
   the SSR/RSC payload is filtered and crawlers see the article text rather than an empty div.
2. **DOMPurify re-sanitises in the browser** after mount, and remains the authoritative pass.

Both read one shared allowlist (`ARTICLE_ALLOWED_TAGS` / `ARTICLE_ALLOWED_ATTR`) so they cannot
drift apart. The DOMPurify upgrade happens in an effect rather than inline, so the first client
render is byte-identical to the server's — the two sanitisers do not agree character for
character, and swapping the markup mid-hydration would be a hydration mismatch. This is the same
null-until-mount shape the event components already use.

**The server pass is explicitly not the last line of defence.** A regex pass cannot match a real
HTML parser on adversarial input, so it is deliberately conservative: anything it cannot parse
confidently is dropped. It is defence in depth in front of DOMPurify, not a replacement for it.

### 2. `/api/Events` pages, and the full sweep is silently uncacheable

Two separate problems here, and the first one I initially got wrong.

**`pageSize` is honoured, and the default is only 10.** An unpaged call returns 10 arbitrary
rows. There are **839 events (816 published), spanning 2007-11-18 to 2026-12-02** — and the API
does not order by date, so the pre-existing `pageSize=100` was returning mostly 2007–2015 shows
and **hiding all 8 genuinely upcoming events**. `fetchEvents` now pages through in full
(`pageSize=500`, stopping on a short page).

**The full sweep is ~2.65 MB**, because the API repeats an event's organiser once per release it
has — one event ships the same company **167 times**. That exceeds Next's 2 MB data-cache
ceiling:

```
Failed to set Next.js data cache for .../api/Events?pageNumber=1&pageSize=100,
items over 2MB can not be cached (2407971 bytes)
```

So `next: { revalidate: 3600 }` at the call site was doing **nothing**, and every event page
render would re-download the lot. (`pageSize` is ignored by the API, so it cannot be trimmed
server-side.)

Fixed by caching the **mapped** result instead of the raw response: `mapEvent` dedupes those
repeats, taking 816 events from ~2.65 MB down to **~233 KB**. `unstable_cache` persists it across
requests; React `cache()` collapses the several calls a single render makes (page +
`generateMetadata` + `fetchEvent`) into one.

Rendering all 816 rows then produced a **2.4 MB HTML page**, so `/events` now shows every
upcoming event plus the 60 most recent past ones, with a count of the remainder — 240 KB. That
cap is a single constant (`PAST_LIMIT`) if you want the whole archive browsable instead.

This is the **one deliberate exception** to the repo's `caching_at_call_site` convention, and the
reason is documented in-file.

---

## Live console errors, fixed 2026-09-09

Reported from portal.acnnewswire.com. Probing the live site while triaging them turned up
something more important than the errors themselves.

**Every article on live returns HTTP 500, not 404.** `/article/106708`, `106707`, `106701` and
`106624` all 500. That is the signature of the `DOMPurify.sanitize is not a function` SSR crash
documented above — which means **the backend `Sectors` fix has already reached production**, the
articles now get past the API call, and the only thing still breaking them is the sanitiser bug.
That fix is in this branch and undeployed. Deploying is what turns live articles back on.

The console errors themselves were **not API errors** — none of them touch
`development.acnnewswire.com`. Every ACN API call in this app is server-side, so API failures
surface in Netlify function logs, never in a browser console.

| Console error | Cause | Fix |
|---|---|---|
| `/api/ab/me → 401` ×1 per page | Our own route. `AbOverlay` is mounted in `layout.tsx` and probes session on every page load; anonymous was expressed as 401 | Returns `200 { session: null }`. Body unchanged; the only caller already read ok and non-ok identically |
| `/about`, `/contact`, `/login`, `/register` → 404 ×4 per page | `MainNav` linked to four routes that do not exist. `<Link>` prefetch 404'd them on load, and clicking any one landed on the 404 page | All four removed from the nav — see below |
| `[Intervention] Images loaded lazily` | Browser notice about `<img loading="lazy">`, not an error | None needed |

The nav links were **dead in both directions** — a real bug, not just console noise. They were
first repointed at the main site, then **removed outright**, which is where they stand:

| Label | Outcome |
|---|---|
| About | Removed — the portal has no About page yet |
| Contact | Removed — same |
| Login | Removed — **there is no public login on this site** |
| Register | Removed — no registration flow exists anywhere on acnnewswire.com |

`Login` is the one worth spelling out. The only sign-in on this site is the employee A/B panel,
and that is **deliberately hidden**: the design session recorded it as "no. hidden.", reachable
by F2 or the unlabelled dot in `TopNav` (`AbHiddenTrigger`). A Login button in the header would
advertise a tool meant to be invisible to the public, and pointing it at the main site's client
area would send employees somewhere unrelated. Neither is right, so there is no Login link.

`MainNav` now renders no action links at all. The two render sites are marked
`intentionally empty` with a note pointing back at the explanation, and the `usePathname` import
and the dead `pathname === item.href` active check went with them.

---

## 404 audit, 2026-09-09

Requirement: no 404s on deploy. Rather than reason about it, every internal link the built site
emits was crawled and checked. That surfaced two sources, one of them serious.

### Every search result was a 404

`/search` is served entirely from `src/data/prefetched-articles.json`. That snapshot held 292
articles with ids **107000–107303**, captured from the legacy API in June. The current API serves
**100269–106708**. The two ranges do not overlap at all — **not one search result resolved.**

Rebuilt with the new `scripts/prefetch-articles.mjs`. Two endpoints are needed because neither
is complete: `/api/Articles` has `language` but no sectors or images, `/api/Articles/by-industry`
has `sectorName` and images but no language.

Two traps worth recording, both of which silently produced wrong output on first run:

- **`?industry=` takes a sector *type*** (`Technology`, `Business`, `Financial`, …), not one of
  the 76 `sector_name` industries. Passing an industry name returns `[]` with a 200, so the first
  run tagged only 296 of 6000 articles and looked fine.
- **The corpus is 20 000+ articles**, not the 4 000 an early paged count suggested. This file is
  imported into the server bundle, so it is capped at the **5 000 most recent** (2.93 MB).

Known gaps in the rebuilt index, none of which cause a 404:

| Field | State |
|---|---|
| `location` | Empty — legacy-only field. **The region facet in the search sidebar matches nothing.** |
| `sectors` | ~32% coverage |
| images | ~4% coverage |
| `language` | ~99.8% coverage |

### `/companies` redirected into a 404

`next.config.ts` sent `/companies` → `/company`, and no `/company` index page has ever existed.
`/companies/:id` → `/company/:id` is the real rename and was always fine. Both bare paths now
redirect to the homepage until a company directory exists.

### Result

| Sweep | URLs | Non-200 |
|---|---|---|
| Link crawl from 16 seed pages | 281 | **0** |
| Deep sample — 200 articles, 120 companies, 150 events, search pagination and facets, `/news` and `/company` paging | 490 | **0** |

### Not a 404, but broken

`src/app/page.tsx` hardcodes five featured article ids: `85791`, `107246`, `107300`, `107292`,
`107230`. **Only `85791` still exists** — the other four are from the same dead id range as the
old search snapshot. Each fetch is wrapped in `.catch(() => null)`, so they fail silently and the
featured block renders with no side articles rather than erroring.

Left alone deliberately: that file carries uncommitted work that predates this. Worth replacing
the four dead ids, or driving the block off the latest articles instead of hardcoding.

---

## Files changed

### Modified

| File | Change |
|---|---|
| `src/services/company-articles.ts` | Rewritten — new API only, legacy path deleted |
| `src/services/events.ts` | `fetchEvent`, `fetchEventReleases`, `eventYear`, tz normalisation, mapped-result caching |
| `src/services/press-release.ts` | 2 s timeout on the legacy enrichment call |
| `src/lib/sanitize.ts` | Added `sanitizeArticleHtml` + the shared article allowlist |
| `src/components/press-release/Body.tsx` | Two-pass sanitising; fixes the SSR 500 |
| `src/app/events/[eventId]/page.tsx` | Two-step resolve: curated slug, then live API |
| `src/app/events/page.tsx` | Listing rows link internally to `/events/<id>`; past events capped at `PAST_LIMIT` (60) |
| `src/app/api/ab/me/route.ts` | Anonymous returns 200, not 401 |
| `src/components/nav/MainNav/index.tsx` | All four dead nav links removed (About, Contact, Login, Register) |
| `next.config.ts` | `/companies` and `/company` redirect to `/` instead of 308ing into a 404 |
| `src/data/prefetched-articles.json` | Rebuilt from the live API — 292 dead ids replaced with 5 000 real ones |
| `PROJECT-CONTEXT.toon` | `api_health`, `blockers`, `current_steps`, `services`, `routes`, `security`, gaps annotations |

### Added

| File | Purpose |
|---|---|
| `src/app/events/[eventId]/LiveEvent.tsx` | The API-backed event detail page |
| `docs/api-integration-2026-09-08.md` | This document |
| `scripts/prefetch-articles.mjs` | Rebuilds the /search snapshot from the new API; supersedes the legacy-only `prefetch-articles.js` |
| `scripts/probe-events-schema.mjs` | Re-exports the events schema surface |
| `docs/events-schema.json` | JSON Schema for the events page data contract |

### Deliberately not touched

`src/app/page.tsx`, `src/config/categories.ts` and `src/services/news-list.ts` carry
**pre-existing uncommitted changes that predate this work.** They were not modified here, but
they will appear in `git status` and in any diff of the working tree.

`src/data/mock-events.ts` and the four curated event pages are unchanged by design — they are
shown to a client and remain the design reference.

`docs/api-schemas/_gaps.csv` is unchanged. Three of its rows (`ART-01`, `ART-07`, `EVT-03`) are
now fixed on the live API; they are annotated in `PROJECT-CONTEXT.toon` but the CSV itself still
reflects its 2026-08-27 capture, and a `stale_warning` was added saying so rather than
hand-editing a captured artefact.

---

## Verification

All of the following were run against the **live API with the stale `fetch-cache` cleared** —
`.next/cache/fetch-cache` had been serving pre-outage responses, which is the documented reason
articles rendered locally while 404ing in production. Testing without clearing it would have
proved nothing.

- `npx tsc --noEmit` — clean
- `npx next build` — compiles, 19/19 static pages, no cache warnings
- Route sweep, all `200` unless noted, **zero server errors**:
  `/`, `/news`, `/events`, `/events/163`, `/events/23`, `/events/177`,
  `/events/bex-asia-2026`, `/events/mce-asia-2026`, `/events/99999` (`404`, correct),
  `/article/106708`, `/company/82`, `/company/82?page=3`, `/company/14`, `/search?q=asia`,
  `/api/press-release/106708`, `/api/company-articles/82`
- Article body confirmed present in the **server-rendered** HTML (1 641 visible characters), not
  injected only after hydration
- Sanitiser, against compiled output: **18 attack vectors neutralised** (script/style with
  content, `on*` handlers incl. unquoted and mixed-case, `javascript:`/`vbscript:` incl. tab- and
  entity-obfuscated, non-image `data:`, `iframe`, `object`, `svg`-wrapped script, comment-hidden
  script, disallowed `id`/`style`), **6 legitimate markup cases byte-identical**
- Sanitiser against **5 real API article bodies** — only allowlisted tags survive, content intact

**`npm run lint` could not be run** — the installed ESLint is broken independently of these
changes:

```
Error: Cannot find module 'ajv/lib/refs/json-schema-draft-04.json'
Require stack: node_modules/eslint/lib/shared/ajv.js
```

The `"overrides": { "ajv": "^8.18.0" }` in `package.json` is the cause: ajv v8 removed
`lib/refs/json-schema-draft-04.json`, which `eslint/lib/shared/ajv.js` still requires. Pre-existing
and unrelated to this work, but worth fixing separately — **lint currently cannot run at all on
this repo**, which is not recorded anywhere else.

---

## Outstanding

### Ours

1. **Redeploy.** Production is still serving the pre-fix build. Verify an article URL on
   `portal.acnnewswire.com` afterwards, not just locally.
2. The **articles** side of the dev DB is a stale partial snapshot — newest `publishDate` is
   2026-04-28, so article feeds look sparse. Events are *not* sparse: 839 of them, running to
   2026-12-02. This is data, not code.
3. `/search` is still served entirely from the frozen `src/data/prefetched-articles.json`
   snapshot, and **cannot** be moved to a live query today — see the missing keyword parameter
   above.
4. A company directory is now *possible* (`GET /api/Companies` takes `Page`/`Size`), which
   `not_built_at_all.company_directory` and gap `CO-04` both said was impossible. Note `SEC-01`
   before wiring it.

### Backend

1. **`/api/Events/{id}` returns 500** — `The required column 'Companies' was not present in the
   results of a 'FromSql' operation`. This is the *same bug class* just fixed on the Articles
   endpoints, so the fix should point at the same place. Worked around on the frontend, but that
   workaround pulls 2.4 MB to read one event.
2. **`/api/Articles/search` has no keyword parameter.** Blocks any live search.
3. **`/api/Events` duplicates each organiser once per release**, inflating a full sweep to
   ~2.65 MB. Deduping server-side would remove the need for the caching workaround.
4. **Only 121 of 839 events carry a `compId`** (gap `EVT-03`). Until the rest do, most event
   pages can never show their releases.
5. **`SEC-01` is unchanged** — `/api/Companies` still returns plaintext `username` and `password`
   on an unauthenticated endpoint.
6. Legacy host still 503. Now enrichment-only, so **downgraded from CRITICAL to MEDIUM** — its
   one visible cost is that articles canonicalise to `/article/english/` regardless of language.

---

## Note on `docs/api-defect-report-2026-09-07.md`

That report is **partly obsolete as of 2026-09-08**. Two of its three reported 500s — the
`Sectors` failures on `press-release/{id}` and `by-company/{id}` — are fixed. Only the `Companies`
failure on `/api/Events/{id}` remains open. The report was left in place as a record of what was
raised; this document supersedes its status.
