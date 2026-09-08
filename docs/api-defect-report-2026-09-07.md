# API defect report — article, company-feed and event detail endpoints returning HTTP 500

**Date:** 2026-09-07
**Reported by:** newsroom-main (frontend) — portal.acnnewswire.com
**Target repo:** `acnnewswire-api`
**Host:** `https://development.acnnewswire.com`
**Severity:** Critical — every press release on the public portal currently renders as a 404.

---

## Summary

Three endpoints return HTTP 500 with an EF Core `InvalidOperationException`. In each case a
`FromSql` raw query returns a result set that is missing a column the mapped entity declares as
required.

Two distinct missing columns: **`Sectors`** (articles) and **`Companies`** (events).

The API host itself is healthy — Swagger responds, and the list endpoints work. This is a
query/entity mismatch in application code, not an outage. Restarting the service does not clear
it (verified).

---

## User-visible impact

| Symptom | Cause |
|---|---|
| **Every article page on portal.acnnewswire.com returns 404** | `press-release/{id}` 500s; the frontend converts a failed article fetch into `notFound()` |
| Company pages show an empty release archive | `by-company/{id}` 500s, and the legacy fallback is also down (see note below) |
| Event detail pages fail | `Events/{id}` 500s |

There is currently **no working source for article body content anywhere** — this endpoint is
the only one that serves it, the legacy API is returning 503, and our local snapshot contains
metadata only. So this cannot be worked around on the frontend. It needs the API fix.

---

## The three failures

### 1. `GET /api/Articles/press-release/{artId}` → 500

```
The required column 'Sectors' was not present in the results of a 'FromSql' operation.

at ACNNewswire.Infrastructure.Services.ArticleService.GetPressReleaseSummaryByIdAsync(Int32 artId)
   src\ACNNewswire.Infrastructure\Services\ArticleService.cs:line 75
at ACNNewswire.API.Controllers.ArticlesController.GetPRelease(Int32 artId)
   src\ACNNewswire.API\Controllers\ArticlesController.cs:line 111
```

### 2. `GET /api/Articles/by-company/{companyId}` → 500

```
The required column 'Sectors' was not present in the results of a 'FromSql' operation.

at ACNNewswire.Infrastructure.Services.ArticleService.GetArticlesByCompanyIdAsync(
     Int32 companyId, Int32 pageNumber, Int32 pageSize, Nullable`1 hasThumbnail)
   src\ACNNewswire.Infrastructure\Services\ArticleService.cs:line 176
at ACNNewswire.API.Controllers.ArticlesController.GetArticlesByCompanyId(...)
   src\ACNNewswire.API\Controllers\ArticlesController.cs:line 94
```

### 3. `GET /api/Events/{id}` → 500

```
The required column 'Companies' was not present in the results of a 'FromSql' operation.

at ACNNewswire.Infrastructure.Services.EventService.GetEventsAsync(
     Int32 id, Int32 pageNumber, Int32 pageSize)
   src\ACNNewswire.Infrastructure\Services\EventService.cs:line 51
at ACNNewswire.API.Controllers.EventsController.GetEventById(Int32 id)
   src\ACNNewswire.API\Controllers\EventsController.cs:line 54
```

---

## Reproduction

Fails for every id, not specific records. IDs below were taken from the working list endpoints,
so they are known-good rows:

```bash
# 1 — article detail (all 500)
curl -i https://development.acnnewswire.com/api/Articles/press-release/106708
curl -i https://development.acnnewswire.com/api/Articles/press-release/106707
curl -i https://development.acnnewswire.com/api/Articles/press-release/109486

# 2 — company article feed (all 500)
curl -i https://development.acnnewswire.com/api/Articles/by-company/14
curl -i https://development.acnnewswire.com/api/Articles/by-company/16

# 3 — event detail (all 500)
curl -i https://development.acnnewswire.com/api/Events/1119
curl -i https://development.acnnewswire.com/api/Events/1118
```

---

## Diagnosis

**The list endpoints that share these services still work.** That narrows it considerably:

| Endpoint | Service method | Status |
|---|---|---|
| `GET /api/Articles` | list query | **200** |
| `GET /api/Articles/press-release/{id}` | `GetPressReleaseSummaryByIdAsync` | **500 — `Sectors`** |
| `GET /api/Articles/by-company/{id}` | `GetArticlesByCompanyIdAsync` | **500 — `Sectors`** |
| `GET /api/Events` | list query | **200** |
| `GET /api/Events/{id}` | `GetEventsAsync(id, …)` | **500 — `Companies`** |

Note that `GetEventById` calls `GetEventsAsync`, the same method backing the working list — so
the same method succeeds without an id and fails with one. That points at a separate SQL
statement or stored procedure on the by-id branch which was not updated alongside the list one.

Also worth noting: the working `GET /api/Articles` response contains no `sectors` field at all
(`articleId, headline, publishDate, summary, hasImage, imageUrl, language, companies, images`).
So the list projection doesn't ask for `Sectors`, which is why it survives, while the three
by-id projections still require it.

**Likely cause:** fallout from the sectors/industries schema work. Our taxonomy notes record
"Confirmed 2026-08-27: industries are becoming a database table." If a `Sectors` column was
removed, renamed, or moved into a join as part of that migration, any raw `FromSql` query still
selecting the old shape — or any entity still declaring it required — would fail exactly like
this. Same reasoning applies to `Companies` on the event query.

## Suggested fix

For each of the three call sites, make the SQL and the entity agree again — either:

1. **Add the column back to the SELECT** in the raw SQL / stored procedure so the result set
   provides `Sectors` (resp. `Companies`) in the shape the entity expects; or
2. **Drop it from the projection/entity** if the migration intentionally removed it, so EF stops
   requiring a column that no longer exists.

Option 2 is the right one if sectors have genuinely moved to a related table — in which case
these queries should load them via the new relation rather than a flat column. The working list
query is a useful reference for the post-migration shape.

Two additional notes if you're touching these queries anyway:

- **`sectors` is double-encoded.** On the article detail response, `sectors` arrives as a
  JSON-encoded *string* rather than an array, so consumers must `JSON.parse` a field that has
  already been deserialized. Returning a real array would be correct. (Our tracker: `ART-01`.)
- **Four list endpoints return four different shapes**, including `companyID` vs `companyId`
  casing between the detail and list responses. Casing drift fails silently in clients.
  (Our tracker: `ART-02`, `CO-03`.)

---

## Separate but compounding: the legacy API is down

`https://www.acnnewswire.com/acnnewswireapi` returns **HTTP 503** on every
`/api/v1/*` path, Cloudflare-fronted with no origin. Verified repeatedly since 2026-08-27.

This matters because it is our fallback: `press-release/{id}` failures used to degrade to the
legacy article endpoint, and the company release archive is served from legacy
`GetNewsByCompanyId` precisely *because* `by-company/{id}` has been 500ing for a while. With
both down at once there is no path to the data. Whoever owns that host should be looped in — it
is a different fix from the one above.

---

## Also worth flagging: credentials in a public response

`GET /api/Companies/{id}` returns `username` and `password` as fields in the response body on an
unauthenticated endpoint. These reach the browser. The frontend ignores them, but they are
transmitted. They should be removed from the DTO. (Our tracker: `SEC-01`, severity critical.)

---

## What is currently healthy

For scope: these were probed on 2026-09-07 and return 200.

```
GET /swagger/v1/swagger.json          200   (15 endpoints published)
GET /api/Articles                     200   (10 rows; newest publishDate 2026-04-28)
GET /api/Articles/homepage            200   (returns [] — empty, see note)
GET /api/Articles/by-industry         200   (returns empty)
GET /api/Articles/search              200   (returns [])
GET /api/Companies                    200
GET /api/Companies/{id}               200
GET /api/Companies/{id}/details       200
GET /api/Events                       200
GET /api/Events/company/{id}/year/{y} 200
```

Two things in that list are worth a second look independently of the 500s:

- **`/api/Articles/homepage` returns an empty array.** It's the source for our homepage hero and
  news feed, so an empty response means an empty homepage even once the 500s are fixed.
  `/api/Articles/by-industry` and `/api/Articles/search` are likewise returning nothing.
- **The dataset looks stale.** `/api/Articles` returns 10 rows whose newest `publishDate` is
  2026-04-28 — about four months old. If this environment is expected to carry current content,
  it isn't.
