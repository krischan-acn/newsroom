# Not yet wired — search and press releases

**Written:** 2026-09-09
**Follows:** `docs/brief-company-search-v1.md` (the v1 ask) and
`docs/api-integration-2026-09-08.md` (what changed on 09-08/09)
**API state while this was written:** `development.acnnewswire.com` unreachable — connection
never completes (`http=000`), not a 500 or a 404. The legacy host has been 503 since 2026-08-27.

Every claim below was checked against the code or a running server on 2026-09-09. Where something
could not be checked because the API was down, it says so. Items are ordered by whether a reader
sees the problem, not by effort.

---

## How to read the status column

| Status | Meaning |
|---|---|
| **Ours** | Frontend work. Can be done now, no backend needed |
| **Data** | Needs the VMs back so a script can be re-run. No code change |
| **Backend** | Blocked on an API change. Cannot be fixed here at all |
| **Decision** | Needs a product call before anyone writes code |

---

## A. Search

### A1. The Language and Region filters are dead controls — **Ours / Decision**

The highest-priority item on this page, because it is the only one a visitor can catch us on.

`SearchSidebar` still renders Language and Region checkbox groups
([SearchSidebar.tsx:7-19](../src/components/search/SearchSidebar.tsx#L7-L19)). `/search` reads
`?lang=` and `?reg=` into `languages` and `regions`
([page.tsx:59-69](../src/app/search/page.tsx#L59-L69)) — and then applies **neither**. Only
sectors reach the fetch.

So a reader can tick "Japanese", watch the URL change, watch the page reload, and get byte-identical
results. That reads as broken software rather than as a missing feature.

Neither can be honestly wired today:

- **Language** — `by-industry` returns no language field, so the live sector-browse results
  cannot be filtered by it. Note this is *not* because language is unavailable in general — see
  [B1](#b1-every-canonical-url-is-wrong--ours-correction-this-is-not-backend-blocked), which
  establishes that we hold language for 99.8 % of the snapshot. If the id→language map in B1 gets
  built, a language facet becomes possible on any snapshot-backed result set; it stays impossible
  on live sector browse until the endpoint returns the field.
- **Region** — no endpoint exposes a country per article since the legacy host went down. The
  brief already ruled region out of v1 scope.

**Recommendation:** hide both groups until they filter something. Leaving a control that does
nothing is worse than not offering it. This is a one-file change to `SearchSidebar`; I did not make
it because removing visible UI is a product call, not a cleanup.

### A2. The company index is a bootstrap — 8.9 % coverage — **Data**

`src/data/company-index.json` holds **836 of ~9,439 companies**. It was derived offline from
`src/data/prefetched-articles.json` because `/api/Companies` could not be swept.

What that costs today:

| | Bootstrap (now) | Full sweep |
|---|---|---|
| Companies | 836 | ~9,439 |
| Multilingual names | **0** | most rows |
| Company URLs | **0** | most rows |

A company that has not published inside the recent 5,000-article window is simply not findable —
verified: `nissan` returns 0 results.

**Fix:** `node scripts/build-company-index.mjs` against a reachable API. It detects the live host
and uses it automatically; no flag, no code change.

### A3. Multilingual company search has no data behind it — **Data**

The matching code handles name variants and is verified working (a search for 三菱重工業 resolves
against an alt name, and diacritics fold so `anhauser` matches `Anhäuser`). The bootstrap index
carries **zero** alt names, so on a multilingual newswire every non-English company search
currently fails. Same fix as A2 — this is the single biggest reason to re-run that script early.

### A4. Sector-browse pagination is a heuristic — **Backend**

`by-industry` returns no total count, so `sectorTotal` is inferred from whether the page came back
full ([page.tsx:117-123](../src/app/search/page.tsx#L117-L123)). The result count shown to the
reader is therefore an estimate, and the last page can be reached with a Next link still offered.

Deliberately not faked with a made-up total. Needs either a count on the response or a
`X-Total-Count` header.

### A5. Industry vs sector granularity — **Backend / Decision**

The Industry mega-menu links **76 industries**; `?industry=` accepts only the **9 sector types**.
Every value is resolved up to its parent sector via `taxonomy.sectorOf()`, so clicking
**Semiconductors** shows all of **Technology**.

Nothing breaks and no wrong articles appear — the results are just broader than the label implies.
Two ways out: the endpoint accepts industry names, or the menu narrows to 9 entries for v1.

### A6. The old article search is orphaned but still in the bundle — **Decision**

`searchArticles` in `src/services/search.ts` now has **no callers** (verified by grep — only the
`SearchResult` type and `getSectorDisplayName` are still imported). It continues to import
`prefetched-articles.json`, so all 5,000 rows are pulled into the server bundle for two helpers.

The brief said not to delete the snapshot without a decision, so it stays. Three options: delete
both, keep the snapshot but move the two helpers out of that module, or restore keyword search as
a second tab alongside companies.

### A7. No typeahead on the search bar — **Ours**

The bar is a plain `GET` form, so every query is a full page load. The index is only 50 KB and is
already a static import, which makes client-side suggestions cheap. Not started — it was not in
the v1 ask.

---

## B. Press releases

The article path is in worse shape than search, and almost all of it is one root cause: **the
legacy host has been 503 since 2026-08-27 and several fields exist nowhere else.**

### B1. Every canonical URL is wrong — **Ours** (correction: this is not backend-blocked)

The most damaging item in this document, and the classification here was **wrong in the first
draft** — it was filed as backend-only. It is fixable from the frontend today.

`adaptNewApiPressRelease` reads `clean(legacy?.language) ?? raw.language`
([acn-adapter.ts:68](../src/services/acn-adapter.ts#L68)), and the article page builds its canonical
from it: `languageToSlug(data.language ?? 'english')`
([page.tsx:65](../src/app/article/[...segments]/page.tsx#L65)).

With the legacy host down, **every article of every language canonicalises to `/article/english/…`**
and redirects there. A Japanese release tells search engines it is English.

**Where language actually lives.** Three endpoints, three different answers:

| Source | Has `language`? | Evidence |
|---|---|---|
| Legacy `GetArticleById` | **Yes** — `string`, e.g. `"English"` | `spec` only. From `swagger.json`; the endpoint was already 503 at capture, so it was never live-verified. The adapter comment implies it worked before the outage |
| Current `/api/Articles/press-release/{id}` | **No** | Absent from the field dictionary; confirmed absent 2026-09-09 |
| Current `/api/Articles?Page&Size` (list) | **Yes** — e.g. `"EN"` | **`live`** in `_field-dictionary.csv:71` — verified against the running API |

So the current API *does* expose language. Just not on the detail endpoint the article page uses.

**And we already hold it.** `src/data/prefetched-articles.json` carries `rawLanguage` on
**4,989 of 5,000 articles (99.8 %)**, swept from that list endpoint:

```
EN 2402   ZH-TW 1136   ZH-CN 872   JA 552   KO 11   ID 7   VI 7   TH 2
```

All five major codes resolve cleanly through `lib/languages.ts` — verified by running
`resolveLanguage` against each: `ZH-TW → zh-Hant "Traditional Chinese"`, `ZH-CN → zh-Hans`,
`EN → en`, `JA → ja`, `KO → ko`. That covers **4,973 of the 4,989**.

`ID`, `TH` and `VI` (16 articles) log `Unrecognised language tag` and resolve to nothing. They need
three lines in the `ALIASES` table in `lib/languages.ts` — a genuine, if tiny, bug of its own.

**The fix, in order of effort:**

1. Add `ID` / `TH` / `VI` to `ALIASES` in `lib/languages.ts`. Three lines
2. Build an `id → language` lookup from the snapshot and read it in the adapter ahead of the
   legacy call. Fixes canonicals for the 5,000 covered ids with no backend involvement
3. Extend `scripts/prefetch-articles.mjs` (or a sibling) to sweep `/api/Articles` for **id and
   language only** across the full 20,000+ corpus. Two fields per row is a small file — roughly
   200 KB — and it makes the map near-total rather than recent-only
4. Still worth asking for: `language` on `/api/Articles/press-release/{id}`, which removes the
   need for the map entirely

Note this does **not** unblock [B2](#b2-release-versions-language-siblings-is-a-full-stub--backend).
That module's own header is explicit that language alone is insufficient — it also needs a group id.

### B2. Release versions (language siblings) is a full stub — **Backend**

`src/services/release-versions.ts` calls no endpoint. Its own header explains the reasoning at
length and it is worth preserving: the obvious heuristic — same company, same day, different
language — is **wrong on real records**, with two documented counterexamples (a pair published on
different calendar days, and two unrelated releases sharing a company and an exact timestamp).

A wrong link here asserts "this is the same release in Japanese" and readers act on it, so the
feature stays dark rather than guessing. The UI is already built and renders the populated state.

**Unblocks it, cheapest first:** a `releaseGroupId` / `parentArticleId` on the article record; or a
`/api/Articles/{id}/versions` endpoint. `/api/Articles/{id}/versions` currently **404s** and
`?releaseGroupId=` was never implemented.

### B3. Legacy-only fields render empty or hardcoded — **Backend**

All of these resolve through the dead legacy record
([acn-adapter.ts:69-95](../src/services/acn-adapter.ts#L69-L95)):

| Field | Behaviour today |
|---|---|
| `views` | **Hardcoded `'0'`** — displayed as a real number |
| `supplier` | Empty string |
| `location` | Empty `{ name, sub_Location }` |
| `url` (origin) | Empty string |
| `topic` | Falls back to `raw.topicName` — partially covered |
| Company socials (facebook, twitter, youtube, linkedin, telegram) | All `undefined` |

`views` is the one to look at first: showing a confident `0` is worse than showing nothing, and
suppressing it is a frontend change we can make without the backend.

### B4. An unreachable API 404s every article — **Ours**

Same bug class we just fixed on company pages, still live here.

`fetchPressRelease` throws on a non-ok response
([press-release.ts:53](../src/services/press-release.ts#L53)), and the page catches everything and
calls `notFound()` ([page.tsx](../src/app/article/[...segments]/page.tsx)):

```ts
} catch (e) {
  if (isRedirectError(e)) throw e;
  notFound();
}
```

So an outage returns **404 on articles that exist** — telling search engines to deindex the entire
corpus — and now that a 6 s deadline exists, a merely slow API does the same.

**Fix:** apply the pattern already built for companies. `getJson`'s `Outcome<T>` discrimination in
`src/services/company-profile.ts` is the reference: a 404 from the API is a real 404, anything else
is an outage. Articles have a local fallback available too — `prefetched-articles.json` carries
headline, summary, date, company and image for 5,000 ids, which is enough for a partial article
page in the same shape as the partial company page.

This is the best-value item in section B: no backend needed, and the component work
(`FeedUnavailable`, the partial notice) already exists to copy.

### B5. No error boundary anywhere — **Ours**

`src/app/not-found.tsx` exists; there is no `error.tsx` at any level. Any unhandled throw in a
server component gives the visitor Next's default error screen. Worth adding one at the root now
that timeouts make throwing a normal, expected event.

---

## Suggested order

1. **A1** — hide the dead facets. Visitor-visible, one file, no dependencies
2. **B3 (`views`)** — stop printing a hardcoded `0`
3. **B1** — the `ALIASES` three-liner, then the id→language map. Fixes every canonical URL
4. **B4** — partial article pages, reusing the company-page pattern
5. **A2 / A3** — re-run the index script the moment the VMs are back *(no code)*
6. **B5** — root error boundary
7. **A6** — decide the fate of the article snapshot.
   Note B1 gives it a second job as the language map, which argues against deleting it
8. **A4, A5, B2** — raise with the backend as one list

## What to ask the backend for, in one list

1. `language` on `/api/Articles/press-release/{id}` — would retire the id→language map B1 builds.
   Lower priority than it first appeared: the list endpoint already exposes language, so this is a
   convenience, not a blocker
2. `releaseGroupId` (or `parentArticleId`) on the article record — unblocks B2
3. A total count on `by-industry` — unblocks A4
4. `?industry=` accepting the 76 industry names, not just the 9 sector types — unblocks A5
5. Restore the legacy fields on the current API, or confirm they are retired — settles B3
6. **`/api/Companies` returns `username` and `password` in plaintext on every row** (gap `SEC-01`).
   Not a blocker for anything above, but it is the most serious thing in the API and should be on
   the same list every time it is sent.
