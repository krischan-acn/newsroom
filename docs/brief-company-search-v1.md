# Brief — Company index + company search (v1)

**Written:** 2026-09-09
**For:** the next working session
**Prereq:** read `PROJECT-CONTEXT.toon` first, then `docs/api-integration-2026-09-08.md` for what
changed on 2026-09-08/09. Do not re-derive the API state — it is recorded below and was verified
on 2026-09-09.

---

## The ask

Replace the site-wide keyword search with a **company search**, and make company pages actually
usable. The goal is the flow:

> search a company → company page → that company's press releases

Every part of that flow is live API data today except the company lookup itself, which needs a
small static index because the API has no company-name search.

**v1 is sector filtering only.** Region/country filtering is explicitly dropped.

---

## Why this shape

Article data changes daily; company data barely changes. A static snapshot is a bad fit for the
first and a fine fit for the second — and once a visitor is on a company page, the release feed
is live, so staleness stops at the front door.

It also avoids `/api/Articles/search`, which is dead (see below) and is not expected back soon.

---

## Verified API facts (2026-09-09)

Host is hardcoded as `https://development.acnnewswire.com` in `src/services/*.ts`. There is no
env switch — `NEXT_PUBLIC_API_BASE_URL` is read by no code.

| Endpoint | State |
|---|---|
| `GET /api/Companies?Page&Size` | **9 439 companies**, 95 pages of 100. Rows use **`companyNameEN`** |
| `GET /api/Companies/{id}` | Rich. Uses **`companyName`** (NOT `companyNameEN`) and also returns `sectors[]`, `tickers[]`, `contacts[]`, `bloomberg[]`, and socials |
| `GET /api/Companies/{id}/details` | Effectively empty — established/listed/employees/address/phone/email are blank on 10/10 sampled. **Expected: the client does not supply this data.** Do not chase it |
| `GET /api/Articles/by-company/{id}?pageNumber&pageSize` | Works, paginates correctly |
| `GET /api/Articles/by-industry?industry=<sector_type>` | Works, paginates. Takes a **sector type**, not one of the 76 industry names |
| `GET /api/Articles/press-release/{id}` | Works. `sectors` is a real array. **No `language` field** |
| `GET /api/Articles/search` | **Returns 0 rows for every input, including unfiltered. Do not use it for anything.** |
| `GET /api/Events/{id}` | 500 — worked around in `services/events.ts` |
| legacy host `www.acnnewswire.com/acnnewswireapi` | 503 since 2026-08-27 |

Corpus: 20 000+ articles, ids 100269–106708.

Sector types (the `?industry=` vocabulary, from the `sector_type` column of `src/lib/sectors.ts`):
`Business`, `Communications`, `Cryptocurrency`, `Financial`, `Industrial`, `Lifestyle`,
`Medicine`, `Sustainability`, `Technology` — **7 of the 9 return data**; Cryptocurrency and
Sustainability return none.

### Security — read this before writing any index

`/api/Companies` returns **`username` and `password` in plaintext on every row**, list endpoint
included (gap `SEC-01`). Any generated index must strip them explicitly. It is very easy to leak
these by dumping the response to a file.

---

## Scope

### 1. Company index

A generated static index of the 9 439 companies, for the search bar to match against.

- New script, modelled on `scripts/prefetch-articles.mjs` (same paging and file-writing shape)
- Fields: `companyId`, the name variants (`companyNameEN` / CH / CT / JP / KO), `logoFilename`, `url`
- **Exclude** `username`, `password`, `boilerPlate`, `extBoilerPlate`, `report*` — credentials and bulk
- Expect roughly 0.6–1.9 MB depending on how many name variants are kept. Check the size and
  trim if it gets large; English-only would be ~570 KB
- Multilingual names matter on a multilingual newswire — prefer keeping them unless size forces
  a decision

### 2. Company search

- Search bar in `MainNav` searches companies, not articles
- Match across all name variants
- Results link to `/company/{id}`

### 3. Company page fixes

These are pure frontend bugs — the data is already in the API, we read the wrong place:

| Fix | Detail |
|---|---|
| **Company name** | `src/services/company-profile.ts:239` reads `company.companyNameEN`, but `/api/Companies/{id}` returns `companyName`. Result: **every company page renders `Company 82` as its h1**. Verified on ids 82, 311, 9453, 2198. Highest-impact one-liner on the site |
| Tickers | Currently fetched from the dead `/api/Articles/search`. Use `tickers[]` on `/api/Companies/{id}` — carries `exchangeId`, `exchangeName`, `tickerId`, `isin` |
| Contacts | Currently read from the empty `/details`. Use `contacts[]` — carries `contactName`, `contactPhone`, `contactEmail` |
| Industries | Not read at all. `sectors[]` carries full names |

### 4. Sector browse (live)

Point `/search?sec=<sector_type>` at a live `by-industry` call instead of the static snapshot.

Note the granularity limit: the Industry mega-menu links per-industry (76 values), but the
endpoint only accepts the 9 sector types. Either resolve an industry to its parent sector via
`lib/taxonomy.ts`, or narrow the menu for v1.

---

## Out of scope for v1

- **Region / country filtering.** No endpoint exposes a country per article any more; it was
  legacy-only. Agreed as dropped
- **Events.** Deprioritised. Current state works — live detail pages plus the four curated mock
  pages, which stay untouched
- `/api/Companies/{id}/details` fields — the client does not supply that data
- `views`, `supplier`, `location` on articles — legacy-only, host down
- Keyword article search. `src/data/prefetched-articles.json` (5 000 real articles) can stay as a
  secondary path; do not delete it without a decision

---

## Constraints

- **Do not touch `src/data/mock-events.ts` or the four curated event pages.** They are shown to a
  client and are the design reference
- `src/app/page.tsx`, `src/config/categories.ts` and `src/services/news-list.ts` carry
  pre-existing uncommitted work from before 2026-09-08 — leave them unless the task requires it
- Pages and route handlers fetch; components take props. `revalidate` at the fetch call site
- New sidebar cards use `src/components/ui/Rail.tsx` primitives (they self-omit when empty)
- Sector logic goes through `src/lib/taxonomy.ts`, language strings through `src/lib/languages.ts`
- `npm run lint` **cannot run** — the `overrides.ajv ^8.18.0` pin in `package.json` breaks ESLint
  (`Cannot find module 'ajv/lib/refs/json-schema-draft-04.json'`). There is no test runner either

---

## Acceptance criteria

1. Company pages render real names, not `Company {id}`
2. Ticker and contact cards populate where the API has data, and self-omit where it does not
3. Searching a company name reaches its page, and that page lists its press releases
4. `/search?sec=<type>` returns live results
5. **No 404s.** Crawl the built site and check every internal link — that is how the 292 dead
   article ids were caught. `next build` clean, `tsc --noEmit` clean
6. No credentials in any generated file — grep the output for `password` before committing

---

## Known-good starting point

As of 2026-09-09 the working tree has: articles rendering again (the DOMPurify SSR fix), search
returning 5 000 resolving articles, company feeds on `by-company`, live event detail pages, and
zero 404s across 771 crawled URLs.

**Check whether this was committed and deployed before starting** — at the time of writing it was
uncommitted, and production was still serving 500s on every article.
