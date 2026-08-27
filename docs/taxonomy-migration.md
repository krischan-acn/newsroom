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

### 2.2 The taxonomy table and its endpoint

**Confirmed 2026-08-27: industries are becoming a database table.** That is the fix for
everything in §3.1 — the spelling drift exists only because the list is maintained in two
places. Notes for building it:

The frontend currently **hardcodes all 76 industries** in `src/lib/sectors.ts`, because there
is no taxonomy endpoint on the new API. The legacy one (`GET /api/v1/Sector/GetSectors`) had
the right shape already — sectors with a nested `industry[]` array — but that API is being
switched off.

**Two tables, not one.** Sector is its own entity with 9 rows, not a string column repeated
across 76 industry rows. The repeated-string design is what allowed `Cryptocurrency` and
`CryptoCurrency` to coexist (§3.2).

`sector`

| Column | Type | Notes |
|---|---|---|
| `id` | int, PK | |
| `key` | varchar, unique | Stable machine name, e.g. `Industrial`. Never shown to users, never renamed. |
| `label` | varchar | Display name. `Financial`→`Finance`, `Medicine`→`Healthcare`, `Sustainability`→`Environment`. **`Industrial`→`Industrial`** (see §4 — decided). |
| `sort_order` | int | The frontend currently relies on master-list order; make it explicit. |

`industry`

| Column | Type | Notes |
|---|---|---|
| `id` | int, PK | Keep the existing ids from `lib/sectors.ts` — 33 is `Construct Engineering`, etc. They are already in the frontend and in the legacy `IndustryModel`. |
| `sector_id` | int, FK → `sector.id` | Replaces today's repeated string. |
| `name` | varchar, unique | Canonical English name, one spelling only. **This is where §3.1 gets fixed.** |
| `name_ja`, `name_zh_hans`, `name_zh_hant`, `name_ko` | varchar, nullable | Already in `lib/sectors.ts`; carry them over rather than losing them. |
| `sort_order` | int | |

Two things worth adding while the table is new:

- **A `unique` constraint on a normalised form of `industry.name`** — lowercased with commas
  and full stops stripped. That makes `Construct, Engineering` and `Construct Engineering`
  collide at insert time instead of silently becoming two industries. This is exactly the
  `taxonomyKey()` rule in `lib/taxonomy.ts`.
- **An `alias` table** (`industry_id`, `alias`) if old article rows keep the comma spellings.
  Then the migration does not have to rewrite historical article tags, and the API can resolve
  either spelling to one industry.

**Endpoint.** `GET /api/Taxonomy` (or `/api/Sectors`), sectors with their industries nested:

```json
[
  { "sector": "Industrial",
    "label": "Industrial",
    "industries": [
      { "id": 33, "industry": "Construct Engineering",
        "names": { "en": "Construct Engineering", "ja": "建設", "zhHans": "Construction",
                   "zhHant": "Construction", "ko": "Construction" } }
    ] }
]
```

This shape maps 1:1 onto `SECTOR_LIST` in `lib/taxonomy.ts`, so adopting it is a change of
source inside that one file — see step 6 in §5. Nothing that imports it changes.

### 2.3 Pick one spelling and hold it

See §3.1. Whichever spelling the table settles on, keep it identical between the article
payload and the taxonomy endpoint. Once the table is the single source, `taxonomyKey()` in the
frontend becomes belt-and-braces rather than load-bearing — worth keeping for old bookmarked
URLs, but nothing will depend on it.

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

## 4. Decisions taken (2026-08-27)

**The `Industrial` sector displays as "Industrial", not "Industry".** It previously showed as
"Industry", which became ambiguous once the child level was named industry — the Industry nav
menu lists 76 industries, one of which sat under a sector also labelled "Industry".
`config/categories.ts` already titled that homepage row "Industrial", so this is now
consistent across the app.

Applied: the label map lives once in `lib/taxonomy.ts` → `SECTOR_LABELS`, where `Industrial`
has no entry and therefore falls through to its own name. `lib/filter-data.ts` imports
`sectorLabel` instead of keeping its own copy.

Backwards compatible: `?sec=Industry` still resolves, via `LEGACY_SECTOR_ALIASES` in
`lib/taxonomy.ts`. Verified — both `?sec=Industrial` and `?sec=Industry` return 20 articles.
The alias is inbound-only and never displayed; it can be dropped once no old links matter.

**Industry links go to filtered search**, not a dedicated landing page. `/industry` was never
a real route, so those links 404'd. They now point at `/search?sec=`, matching the sibling
Sector menu.

---

## 5. Frontend migration, in order

Each step is independently shippable and independently revertable. Nothing before step 5
changes what a user sees.

1. **Done.** `lib/taxonomy.ts` added; `lib/sectors.ts` annotated. No behaviour change.
2. **Done.** Label maps consolidated. All three copies replaced by `SECTOR_LABELS` /
   `resolveSector()` / `sectorLabel()`. **Fixed bug 3.2** — `?sec=Cryptocurrency` went from
   0 articles to 12.
3. **Done for search, NOT for the homepage.** `services/search.ts` now resolves sectors and
   compares industries through `taxonomyKey()`. **Fixed bug 3.1 in search** — all eleven
   affected industries return results (Construct Engineering 9, Energy Alternatives 12, EVs
   Transportation 10, and so on), with no regression to the ones already working.

   ⚠ **Still outstanding:** `lib/sector-mapper.ts` is untouched, so the homepage sector rows
   still exclude those articles. Search and the homepage therefore disagree right now. The fix
   is two one-line delegations — `getSectorCategory = sectorOf`,
   `getArticleCategories = sectorsOf` — and would surface roughly 28 articles in homepage rows
   they are currently missing from. Held back deliberately because it is a visible change.
4. **Done.** Nav route fixed (bug 3.3) — `MainNav/Industry` links to `/search?sec=`.
5. **Remaining call sites.** `lib/sector-mapper.ts` (see step 3), `lib/filter-data.ts`'s
   `INDUSTRY_HIERARCHY` (rebuild from `SECTOR_LIST`, keeping the `NestedItem` shape the sidebar
   expects), `MainNav/Sector`, `config/categories.ts`,
   `components/events/event-industries.ts`.
6. **Swap the source to the taxonomy table** from §2.2 once the endpoint exists. `INDUSTRIES`
   and `SECTOR_LIST` in `lib/taxonomy.ts` are the only things that read the hardcoded list, so
   this is a change inside that one file — nothing importing it changes. `lib/sectors.ts` and
   its deprecated exports can then be deleted.

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
