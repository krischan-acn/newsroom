# AGENTS.md: newsroom

ACN Newswire's public press release site (Next.js 16, App Router). Read by every AI agent and every new developer before changing code.

**Full documentation** (hosting, the API, runbooks, staff guides, generated reference): the **acn-docs** site, repo `krischan-acn/acn-docs`. This file holds only what you need with the code open.

## Principles

Synced from the ACN knowledge base `PRINCIPLES.md` on 2026-10-23. If they disagree, the knowledge base wins.

- **Chesterton's fence.** Don't remove, rename or "clean up" anything until you know why it's there. Check `git log -p`, the comments, `BIBLE.md` and the decisions page in acn-docs, then ask.
- **Pareto.** Do the 20% that carries 80% of the result first.
- **Jakob's law.** Familiar beats clever. Readers skew older and click around a lot: labelled navigation, no surprise new tabs, no hidden menus.
- **Work mode.** Code changes are work mode. Restate the request, list what's out of scope, ask at least three clarifying questions, and wait for an explicit yes before writing code.
- **Nothing goes live without approval** for that exact change. Pushing `main` deploys to production on two hosts.
- **Performance is a pillar.** Target sub-300 ms loads. Treat page weight, caching and request chains as first-class.

## Read this first

**Before writing any code, read [`BIBLE.md`](BIBLE.md).**

It is the contract: the component tier rule, the hard rules, how to add a component, how to change styling, and what to run before claiming you are done. It is short, and it tells you which of the three companion files to open next.

| File | Covers | Generated? |
|---|---|---|
| [`BIBLE.md`](BIBLE.md) | the rules. **Read first, every time** | no |
| [`COMPONENTS.toon`](COMPONENTS.toon) | every component, its tier, and every file importing it | **yes**: `npm run components:map` |
| [`STYLING.toon`](STYLING.toon) | tokens, canonical class strings, known visual debt | no |
| [`PROJECT-CONTEXT.toon`](PROJECT-CONTEXT.toon) | routes, services, API health, blockers | no |

Don't re-derive what those files already state. Do verify anything marked fast-rotting (`api_health`, `blockers`, `current_steps`) before acting on it; those carry a `probed`/`updated` date.

## Talking to ACN staff

Most people asking about this site aren't developers. Use their words:
- **press release**, never "article";
- **issuer** (the company a release is from);
- **sector** (the 9 broad groups) and **industry** (the 76 narrow ones);
- **exchange** and **listing**.

Explain any technical term in one plain sentence, or avoid it. The full glossary is in acn-docs.

## The component tier rule

Everything under `src/components/` sits in one of three tiers, and imports flow one way:

```
features/  ──►  shared/  ──►  common/
```

- `common/`: mounted by `app/layout.tsx`, so on every page
- `shared/`: imported by **2+ different feature areas**
- `features/<area>/`: one feature area only

A `features/` component never imports from another `features/` area. If two areas need it, promote it to `shared/`. Types live in `src/types/`, never in a component folder. `BIBLE.md` §2 has the full test.

## Hosting

| Host | Address | GitHub copy | Branch |
|---|---|---|---|
| Netlify | portal.acnnewswire.com | `krischan-acn/newsroom` | `main` |
| Vercel | acn-newswire.vercel.app | `s-ging/newsroom` | `main` |

Hosted twice **on purpose**, for redundancy. Push with the `all` remote, which goes to both. Work lands on `staging` and is fast-forwarded to `main`. The `cloudflare` branch is a shelved experiment; don't merge it. Build settings and env vars live in the host dashboards, not in this repo.

## Maintaining these files

- `COMPONENTS.toon` is **generated**; hand-editing it is pointless. It refreshes on every commit once you run `git config core.hooksPath .githooks`.
- `PROJECT-CONTEXT.toon` is refreshed **twice monthly**. `meta.next_review` holds the next date, and its `update_protocol` section lists the steps.
- Row counts are declared in TOON as `key[N]{...}:`. If you add or remove a hand-written row, update `N`.
- If you change routes, env vars or API calls, run `npm run gen` in acn-docs and commit the result there.
- Never put credentials, tokens or env values in any file here or in acn-docs. Record the variable name and where it's read.

## Repo-specific gotchas

- `README.md` was rewritten on 2026-10-23. The old one's claims (route groups, Zod, isomorphic-dompurify, wired next-intl, `.env.example`, a working `USE_MOCK` path) were false.
- `npm run lint` is **broken**: the `ajv: ^8.18.0` override is incompatible with `eslint@10`. Pre-existing. `tsc --noEmit` and `npm run build` are the real gates.
- `NEXT_PUBLIC_API_BASE_URL` is documented in places but **read by no code**. API hosts are hardcoded in `src/services/*.ts`. Changing it in Netlify does nothing.
- There is **no test runner**. The two files in `src/lib/__tests__/` can't run as configured.
- There is no `netlify.toml`.
- **Articles render locally but 404 on the deployed site.** This is a known failure mode: the local `.next/cache/fetch-cache` serves stale pre-outage responses that a fresh build has no copy of. See the `local_vs_deployed` section of `PROJECT-CONTEXT.toon`.

## Conventions

- Pages and route handlers fetch; components take props.
- `revalidate` is set per `fetch()` call, never as a route-segment export.
- Every right-hand rail goes through `<Rail>` in `src/components/shared/Rail.tsx`. Never hand-roll an `<aside>`.
- Anything button-shaped uses `.button` / `.button.alt` from `globals.css`, with Tailwind for layout only.
- Sector and industry logic goes through `src/lib/taxonomy.ts`, not the older `src/lib/sector-mapper.ts`.
- Language strings resolve through `src/lib/languages.ts`.

## Before you say you're done

```bash
npx tsc --noEmit
npm run build            # must reach "Generating static pages (19/19)"
npm run components:map
```
