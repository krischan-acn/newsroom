# CLAUDE.md

## Read this first

**Before exploring the codebase, read [`PROJECT-CONTEXT.toon`](PROJECT-CONTEXT.toon).**

It is a TOON-format context map covering: the stack, every route and what it fetches, every
component and how they compose, the services/data layer, all external API endpoints with a
probed health matrix, known blockers, and the current priority steps. It exists specifically so
a session does not have to rediscover the project by grepping.

Do not re-derive what that file already states. Do verify anything it marks as fast-rotting
(`api_health`, `blockers`, `current_steps`) before acting on it — those sections carry a
`probed`/`updated` date.

## Maintaining the context file

It is refreshed **twice monthly**; `meta.next_review` holds the next date. The
`update_protocol` section at the bottom of the file lists the exact steps. Two rules that matter:

- Row counts are declared in TOON as `key[N]{...}:` — if you add or remove a row, update `N`.
- Never put credentials, tokens or env values in it. Record the variable name and where it is read.

## Repo-specific gotchas

- `README.md` is **stale** — roughly 12 of its claims are false (route groups, Zod,
  isomorphic-dompurify, wired next-intl, `.env.example`, a working `USE_MOCK` path). Trust
  `PROJECT-CONTEXT.toon` over the README.
- `NEXT_PUBLIC_API_BASE_URL` is documented but **read by no code**. API hosts are hardcoded in
  `src/services/*.ts`. Changing it in Netlify does nothing.
- There is **no test runner**. The two files in `src/lib/__tests__/` cannot run as configured.
- Deploy config (build command, env vars) lives in the **Netlify dashboard**, not in this repo —
  there is no `netlify.toml`.
- Articles rendering locally but 404ing on the deployed site is a known failure mode: the local
  `.next/cache/fetch-cache` serves stale pre-outage responses that a fresh Netlify build has no
  copy of. See the `local_vs_deployed` section.

## Conventions

Pages and route handlers fetch; components take props. `revalidate` is set per `fetch()` call,
never as a route-segment export. New sidebar cards use the `src/components/ui/Rail.tsx`
primitives. Sector/industry logic goes through `src/lib/taxonomy.ts`, not the older
`src/lib/sector-mapper.ts`. Language strings resolve through `src/lib/languages.ts`.
