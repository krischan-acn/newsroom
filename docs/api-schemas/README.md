# API schema export

Captured **2026-08-27** against the two live APIs this frontend consumes.

> **The Event surface was re-exported on 2026-09-08** and is the only part of this folder that
> is current. Everything else still reflects the 2026-08-27 capture. Re-run the events export
> with `node scripts/probe-events-schema.mjs`.

Each `<entity>.csv` is two rows: **header = field names, one row = a real sample value.**
Long values (`bodyHtml`, `bodyText`) are truncated and marked `...[truncated]`.
Files are UTF-8 with BOM so Excel opens the CJK samples correctly.

## Start here

| File | What it is |
|---|---|
| `_index.csv` | Every endpoint: URL, observed HTTP status, response shape, field count, which service calls it |
| `_field-dictionary.csv` | All 265 fields in one flat table — entity, endpoint, type, nullable, sample, source |
| `_gaps.csv` | 28 fields/issues the frontend needs that the API does not provide, ranked by severity |
| `_taxonomy-rename.csv` | Old → new naming for the sector/industry realignment. Written up in [../taxonomy-migration.md](../taxonomy-migration.md) |

## The three vital entities

| Entity | Live-verified | Notes |
|---|---|---|
| **Event** | `events.csv` (12), `event-companies-nested.csv` (10), `event-detail.csv` (12), `event-releases-by-company-year.csv` (5) | Re-exported 2026-09-08. `/api/Events` **pages** — pageSize is honoured and the default is only 10, so an unpaged probe returns 10 of **839**. `/api/Events/{id}` still 500s, so `event-detail.csv` is spec-derived from the list shape. `legacy-event.csv` is the older 7-field shape |
| **Article / press release** | `article-detail.csv` (16), `article-list-homepage.csv` (10), `article-list-by-industry.csv` (10), `article-list-paged.csv` (9), `article-search.csv` (33) | Four list endpoints, four different shapes — see gap `ART-02`. Nested: `article-companies-nested.csv`, `article-images-nested.csv` |
| **Company** | `company.csv` (16), `company-details.csv` (24) | Profile and details are separate calls |

## Capture status

- **`live` / live-verified** — response actually fetched and parsed. Everything from `https://development.acnnewswire.com`.
- **`spec` / spec-derived** — schema read from `data/swagger.json`, response *not* verified. All `legacy-*.csv` files, because every legacy endpoint returned **HTTP 503** at capture time (gap `INF-01`). Treat field names as documented intent, not observed fact.

## Two things to read before using this

1. **`SEC-01` — `GET /api/Companies/{id}` returns `username` and `password` in plaintext.** Both were non-empty for the company tested. Values are **redacted** from this export; `company.csv` shows `<redacted>`. The frontend calls this endpoint, so the credentials reach the browser.
2. **`INF-01` — the entire legacy API is down.** The company press-release archive has no working source: its primary endpoint is 503 and its fallback (`/api/Articles/by-company/{id}`) returns 500. Locally this is masked — Next is serving cached responses from before the outage.

## Regenerating

**Events:** `node scripts/probe-events-schema.mjs` — committed, idempotent, rewrites the four
Event CSVs plus the Event rows of `_index.csv` and `_field-dictionary.csv` in place, leaving
every other entity untouched.

**Everything else:** the original scripts (`probe.py`, `gen.py`, `gaps.py`) were only ever in a
session scratchpad and were never committed, so the article, company and legacy exports cannot
be regenerated from this repo today. `probe-events-schema.mjs` is a working template for
rebuilding them.
