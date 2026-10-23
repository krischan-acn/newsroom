# BIBLE.md

**Read this before writing code. Every time.**

This file is the contract. It is short on purpose — the detail lives in three companion
files, and this tells you which one to open and when.

---

## 1. Read order

| Open | When | Trust |
|---|---|---|
| **BIBLE.md** (this file) | always, first | the rules here override habit |
| **[COMPONENTS.toon](COMPONENTS.toon)** | before adding, moving or importing a component | **generated** — always current |
| **[STYLING.toon](STYLING.toon)** | before writing any markup or class name | hand-written — check `updated:` |
| **[PROJECT-CONTEXT.toon](PROJECT-CONTEXT.toon)** | before touching routes, services or the API | hand-written — `api_health`, `blockers` and `current_steps` rot fast |

`README.md` was rewritten on 2026-10-23 and is now a one-screen pointer. `AGENTS.md` holds the principles, hosting and gotchas; the acn-docs site holds everything else.

---

## 2. The tier rule

Components live in exactly one of three tiers under `src/components/`. **Imports flow one way:**

```
features/  ──►  shared/  ──►  common/
```

| Tier | Admission test | Examples |
|---|---|---|
| `common/` | mounted by `app/layout.tsx`, so it is on every page | `nav/`, `Footer/`, `ab/` |
| `shared/` | imported by **2+ different feature areas** | `Rail`, `LanguageTag`, `PressReleaseItem`, `SocialLinks` |
| `features/<area>/` | one feature area only | `article/`, `company/`, `events/`, `home/`, `search/` |

**A `features/` component must never import from another `features/` area.** If two areas
need it, promote it to `shared/` in the same commit — don't reach across.

Two consumers inside the *same* area still counts as one area. `features/search/Pagination.tsx`
has two consumers and stays feature-local for exactly this reason.

### Where things that aren't components go

- **Types** → `src/types/`. Never in a component folder. `services/` and `lib/` import types
  *downward* from there; before 2026-09-16 they imported upward out of `components/press-release/types.ts`,
  which is the inversion that made the tree feel tangled.
- **Page bodies** → beside their route. `app/events/[eventId]/LiveEvent.tsx` and
  `app/admin/AdminPanel.tsx` are the second half of a route, not reusable components.
  They stay where they are and are deliberately absent from `COMPONENTS.toon`.

---

## 3. Hard rules

1. **Pages and route handlers fetch. Components take props.** Only three components fetch
   client-side — `ab/AbOverlay`, `shared/PressReleaseItem`, `features/article/InfiniteArticleFeed`
   — and each is a documented exception, not a precedent.
2. **`revalidate` goes on the `fetch()` call, never as a route-segment export.** There are zero
   segment config exports in `src/app`. Keep it that way.
3. **Any right-hand rail uses `<Rail>`** from `src/components/shared/Rail.tsx`. Never hand-roll
   `<aside className={RAIL_WIDTH}>` — four copies of that is what the 2026-09-16 refactor deleted.
4. **Anything button-shaped uses `.button` / `.button.alt`.** Tailwind on top for *layout only*.
   Never re-declare colour, font-size or padding.
5. **Never put a font-weight on a heading above `text-sm`.** Display type here is weightless
   Inter with `tracking-tight`, in `text-black` — not `gray-900`. Weight belongs only to
   micro-labels. This is the house voice, and adding `font-semibold` to headings is the fastest
   way to make the site look like every other site. `STYLING.toon` §headings has the four tiers.
6. **Don't add rounding or shadows to public pages.** The `border-radius` in `.button` is
   commented out deliberately; the flat, square surface is the design. Rounding and elevation
   live almost entirely in `common/ab/` — the employee tool, which is not public.
7. **Sector and industry logic goes through `src/lib/taxonomy.ts`**, not the older `sector-mapper.ts`.
8. **Language strings resolve through `src/lib/languages.ts`.** Never hand-roll a language string.
9. **Sanitise by runtime**: `lib/sanitize.ts` (regex, no DOM) on the server; DOMPurify only inside
   `features/article/Body.tsx` in the browser. `'use client'` does **not** keep a component off the
   server — calling DOMPurify there 500s every article page.
10. **Never put credentials, tokens or env values in any `.toon` or `.md` file.** Record the variable
   name and where it is read.

---

## 4. Adding a component

1. Decide the tier using the admission test above. When unsure, start in `features/` — promoting
   later is cheap, demoting is not.
2. Write it. Copy class strings from `STYLING.toon` rather than inventing new ones.
3. Run `npm run components:map` and confirm it lands in the tier you intended with the consumers
   you expect.
4. If it shows up under `orphans[...]`, wire it up or delete it before committing.

## 5. Changing styling

`STYLING.toon` marks each area **CANONICAL** or **DIVERGENCE**.

- **CANONICAL** → copy it verbatim.
- **DIVERGENCE** → known debt with a decision still owed. Do **not** propagate it, and do **not**
  silently fix it either. A fix there is a visible change and needs to be asked for.

Two divergences are open and deliberately unfixed, each recorded with what the fix would be:
the **press release page shell** (the only one without `container`, the only one with `sm:px-6`)
and **list-row titles** (four spellings of the same `h3` across four components).

Section headings, the events button, the stray blues and the `--text-csolor` typo were all
resolved on 2026-09-16.

---

## 6. Before you say you're done

```bash
npx tsc --noEmit          # must be clean
npm run build             # must reach "Generating static pages (19/19)"
npm run components:map    # refresh the inventory
```

`npm run lint` is **currently broken** — the `ajv: ^8.18.0` override in `package.json` is
incompatible with `eslint@10`, which wants `ajv/lib/refs/json-schema-draft-04.json`. This
predates the refactor. Don't read its failure as your change breaking something.

There is **no test runner**. The two files in `src/lib/__tests__/` cannot execute as configured.
`tsc` and the build are the only real gates.

---

## 7. Keeping the map honest

`COMPONENTS.toon` is generated from the real import graph by `scripts/gen-components.mjs`.
Hand-editing it is pointless — the next run overwrites it.

Enable the per-commit refresh once per clone:

```bash
git config core.hooksPath .githooks
```

After that every commit touching `src/**/*.{tsx,ts,jsx,js,css}` regenerates the file and stages
it. `npm run components:check` exits non-zero when it is stale, which is what you'd wire into CI.

---

## 8. Repo gotchas that will waste your time

- `NEXT_PUBLIC_API_BASE_URL` is documented but **read by no code**. API hosts are hardcoded in
  `src/services/*.ts`. Changing it in Netlify does nothing.
- Deploy config lives in the **Netlify dashboard**. There is no `netlify.toml`.
- Articles rendering locally but 404ing when deployed means a stale `.next/cache/fetch-cache`
  serving pre-outage responses a fresh build has no copy of. See `local_vs_deployed` in
  `PROJECT-CONTEXT.toon`.
- `www.acnnewswire.com/eventimages` is **not** in `next.config.ts` `remotePatterns`, so event
  photos must stay raw `<img>`.
