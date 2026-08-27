# Sector / industry realignment — hand-off

**The short version.** The classification is two levels: **sector > industry**. Nine sectors,
76 industries. The old database called them `sector_type` and `sector_name`, which is one
level off from the business terms, and those column names leaked into the API and the
frontend. This document is the naming contract for the new API, plus three measured bugs
that the rename should carry with it.

Nothing in the running app has changed. The realignment so far is **additive only**:

| Change | Risk |
|---|---|
| **Added** `src/lib/taxonomy.ts` — correct names over the same data, derived not copied | None. No existing call site imports it. Deleting the file restores the previous state exactly. |
| **Added** `docs/api-schemas/_taxonomy-rename.csv` — machine-readable old → new map | None. Documentation. |
| **Edited** `src/lib/sectors.ts` — header note + `@deprecated` JSDoc on the misnamed exports | None. Comments only; no logic touched. Your IDE now shows a strikethrough hint at each old usage, which is how you find the call sites. |

Verified after the change: `tsc --noEmit` clean, `next build` clean, all four event pages
still prerender, and a 31-assertion check against the real article corpus passes (results at
the bottom).

---

## 1. The naming

| Level | Count | Old name | Correct name | Example |
|---|---|---|---|---|
| Parent | 9 | `sector_type` | **sector** | `Industrial`, `Technology` |
| Child | 76 | `sector_name` | **industry** | `Construct Engineering`, `Automation [IoT]` |

Worth knowing: **the UI already says this.** The nav has a Sector menu listing the nine and
an Industry menu listing the 76 (`components/nav/MainNav/Sector` and `.../Industry`). Only
the data layer disagrees, so this is a rename, not a redesign.

---

## 2. What the new API should send

### 2.1 Field names

| Endpoint | Now | Should be | Also fix |
|---|---|---|---|
| `GET /api/Articles/press-release/{id}` | `sectors` | `industries` | **Type is wrong too** — it arrives as a JSON-encoded *string*, not an array. Consumers have to parse the response, then parse this field again. |
| `GET /api/articles/homepage`, `/api/Articles/by-industry` | `sectorName` | `sector` | Singular field holding a sector, named as if it held an industry. |
| `article.companies[].sectorName` | `sectorName` | `sector` | **Please confirm the level.** The sample value we captured is `"Automotive"`, which is an *industry*, not a sector — so this field may be carrying the wrong level as well as the wrong name. |

### 2.2 One endpoint we need

There is **no taxonomy endpoint on the new API**. The legacy one
(`GET /api/v1/Sector/GetSectors`) had the right shape already — sectors with a nested
`industry[]` array — but the legacy API is being switched off.

Because of that, the frontend currently **hardcodes all 76 industries** in
`src/lib/sectors.ts`. That is the root cause of the spelling drift in §3.1: two copies of the
same list, maintained separately. A single `GET /api/Taxonomy` (or `/api/Sectors`) returning
sectors with their industries would let us delete the hardcoded list.

Suggested shape:

```json
[
  { "sector": "Industrial",
    "label": "Industry",
    "industries": [
      { "id": 33, "industry": "Construct Engineering",
        "names": { "en": "Construct Engineering", "ja": "建設", "zhHans": "Construction",
                   "zhHant": "Construction", "ko": "Construction" } }
    ] }
]
```

### 2.3 Pick one spelling and hold it

See §3.1. Whichever the new API settles on, say so explicitly, and keep it identical
between the article payload and the taxonomy endpoint.

---

## 3. Three bugs, measured

### 3.1 Industry names are spelled two ways — 59 article tags don't match

The API uses commas where the frontend list uses spaces:

| API sends | Frontend has | Article tags affected |
|---|---|---|
| `Energy, Alternatives` | `Energy Alternatives` | 12 |
| `EVs, Transportation` | `EVs Transportation` | 10 |
| `Construct, Engineering` | `Construct Engineering` | 9 |
| `Environment, ESG` | `Environment ESG` | 7 |
| `PE, VC & Alternatives` | `PE VC & Alternatives` | 7 |
| `Crypto, Exchange` | `Crypto Exchange` | 5 |
| `Telecoms, 5G` | `Telecoms 5G` | 3 |
| `Broadcast, Film & Sat` | `Broadcast Film & Sat` | 2 |
| `Wireless, Apps` | `Wireless Apps` | 2 |
| `Art, Music & Design` | `Art Music & Design` | 1 |
| `Cosmetics, Spec.Chem` | `Cosmetics Spec.Chem` | 1 |

**Effect.** Exact-match filters return nothing, and `getSectorCategory()` maps these
articles to *no sector at all*, so they are also missing from the homepage sector rows.
Measured: `/search?sec=Construct+Engineering` returns 0 articles, `?sec=Construct,+Engineering`
returns 9.

**Fix, both ends.** Backend picks one spelling. Frontend stops depending on which one:
`taxonomyKey()` in `lib/taxonomy.ts` treats a comma as a space, drops full stops and folds
case. Measured against the corpus: **59 of 59 previously unmatched assignments resolve, none
left over.**

### 3.2 `Cryptocurrency` sector filter returns nothing

`lib/filter-data.ts` and `services/search.ts` both spell the key `CryptoCurrency` (capital C
in the middle). The actual value in `lib/sectors.ts` is `Cryptocurrency`. The mapping matches
nothing and is silently inert.

Measured: `/search?sec=Cryptocurrency` → **0 articles**, while `?sec=Technology` → 20,
`?sec=Finance` → 20, and `?sec=Blockchain+Technology` → 7. Frontend-only fix.

`lib/taxonomy.ts` guards against this class of typo: in dev it warns if a `SECTOR_LABELS` key
matches no sector.

### 3.3 Every industry link in the nav 404s

`components/nav/MainNav/Industry/index.tsx` links to `/industry?sec=…`, but there is no
`/industry` route in `src/app`. The working route is `/search?sec=…`. Frontend-only fix,
one line.

---

## 4. One decision needed before this ships

`Industrial` is currently displayed to users as **"Industry"**. Once the child level is
officially called an industry, a *sector* labelled "Industry" is ambiguous — the Industry nav
menu lists 76 industries, one of which sits under the sector displayed as "Industry".

Options: keep `Industrial` as the label, or something like `Manufacturing & Industry`. This is
a product call, not a technical one. Currently set in `lib/taxonomy.ts` → `SECTOR_LABELS` and
duplicated in `lib/filter-data.ts`.

---

## 5. Frontend migration, in order

Each step is independently shippable and independently revertable. Nothing before step 5
changes what a user sees.

1. **Done.** `lib/taxonomy.ts` added; `lib/sectors.ts` annotated. No behaviour change.
2. **Consolidate the label maps.** Three copies of the sector-label mapping exist:
   `SECTOR_DISPLAY_NAMES` in `lib/filter-data.ts`, and `DISPLAY_TO_TYPE` + `TYPE_TO_DISPLAY`
   in `services/search.ts`. Replace all three with `SECTOR_LABELS` / `resolveSector()` /
   `sectorLabel()`. **This alone fixes bug 3.2.**
3. **Point `lib/sector-mapper.ts` at the new module.** Keep the old function names as
   one-line wrappers so no caller changes yet:
   `getSectorCategory = sectorOf`, `getArticleCategories = sectorsOf`.
   **This alone fixes bug 3.1** — expect ~28 articles to start appearing in homepage sector
   rows that were previously invisible. That is the first visible change, so ship it on its own.
4. **Rebuild `INDUSTRY_HIERARCHY` from `SECTOR_LIST`.** Keep the `NestedItem` shape the
   sidebar expects; it becomes a thin adapter over the new tree.
5. **Fix the nav route** (bug 3.3) and migrate the remaining call sites — `MainNav/Sector`,
   `MainNav/Industry`, `config/categories.ts`, `components/events/event-industries.ts`.
6. **Replace the hardcoded list** with the API taxonomy endpoint from §2.2, once it exists.
   `lib/sectors.ts` can then be deleted along with its deprecated exports.

### Call sites to migrate

| File | Uses |
|---|---|
| `lib/sector-mapper.ts` | `sector_name`, `sector_type`, `SECTOR_TYPES` |
| `lib/filter-data.ts` | `sector_type`, `sector_name`, own label map |
| `services/search.ts` | two label maps, `INDUSTRY_HIERARCHY` |
| `components/nav/MainNav/Industry/index.tsx` | `sector_type`, `sector_name`, dead route |
| `components/nav/MainNav/Sector/index.tsx` | `SECTOR_TYPES` |
| `config/categories.ts` | `getArticleCategories` |
| `components/search/SearchResults.tsx` | `sector-mapper` |
| `components/events/event-industries.ts` | `SECTORS`, `INDUSTRY_HIERARCHY` |

`lib/__tests__/sector-mapper.test.ts` is a scratch `console.log` script, not a test — there is
no test runner configured. Worth replacing with a real one during step 3.

---

## 6. Verification

The compiled `lib/taxonomy.ts` was exercised against the real article corpus
(`src/data/prefetched-articles.json`, 292 articles, 488 industry assignments):

```
Structure ................................. 5/5 passed
The rename: sector > industry ............. 3/3 passed
Value mismatch (the comma problem) ........ 9/9 passed
Sector resolution (key/label/industry) .... 7/7 passed
Whole-corpus coverage ..................... 2/2 passed
Old exports untouched ..................... 5/5 passed
                                           31/31 passed

industry assignments in corpus         : 488
mapped by exact match (current code)   : 429
mapped by lib/taxonomy.ts              : 488
recovered                              : 59
```

The verification script lives in the session scratchpad rather than the repo, since the
project has no test runner. Say if you want it committed — it would need one added.
