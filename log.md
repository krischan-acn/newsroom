I'll need an overlay, LIKE a Chrome/Edge extension but let's build it in the page. 
We'll need to make a way for employees of ACN Newswire to be able to do A/B testing on the actual website, hopefully on the ACN pages and they can have a vote.

What I'm asking for
An overlay, exclusive to employees that only employees can access, where they can and will be able to see before and after changes and vote what layout they like better.
There will be a button to show the A version, the B version, and then a side by side, and then a before/after slider.

i have employee credentials that we will hardcode into the website.
no worreis for security because only employeeswill have access for this website and no end users can gain access to these.


Ask me at least 20 questions before proceeding so we have a clear scope in mind.
I'll look at the codebase first so my questions are grounded in what you actually have.

Bash Inspect project root and package.json
IN
ls -la && echo "---PKG---" && cat package.json 2>/dev/null | head -60

OUT
total 297
drwxr-xr-x 1 amych 197609      0 Aug 27 19:46 .
drwxr-xr-x 1 amych 197609      0 Aug 15 00:17 ..
drwxr-xr-x 1 amych 197609      0 Aug 27 20:37 .git
-rw-r--r-- 1 amych 197609    480 Jun 16 19:26 .gitignore
drwxr-xr-x 1 amych 197609      0 Aug 27 20:22 .next
-rw-r--r-- 1 amych 197609     20 Jun 16 19:26 .npmrc
-rw-r--r-- 1 amych 197609   4697 Jun 16 19:26 README.md
drwxr-xr-x 1 amych 197609      0 Jun 16 19:26 data
drwxr-xr-x 1 amych 197609      0 Aug 27 20:24 docs
-rw-r--r-- 1 amych 197609    465 Jun 16 19:26 eslint.config.mjs
-rw-r--r-- 1 amych 197609    253 Aug 27 19:00 next-env.d.ts
-rw-r--r-- 1 amych 197609    905 Jun 16 19:26 next.config.ts
drwxr-xr-x 1 amych 197609      0 Aug 15 01:08 node_modules
-rw-r--r-- 1 amych 197609 113242 Aug 15 01:08 package-lock.json
-rw-r--r-- 1 amych 197609    721 Jun 16 19:26 package.json
-rw-r--r-- 1 amych 197609     94 Jun 16 19:26 postcss.config.mjs
drwxr-xr-x 1 amych 197609      0 Jun 16 19:26 public
drwxr-xr-x 1 amych 197609      0 Jun 16 19:26 scripts
drwxr-xr-x 1 amych 197609      0 Jun 16 19:26 src
-rw-r--r-- 1 amych 197609    670 Jun 16 19:26 tsconfig.json
-rw-r--r-- 1 amych 197609 125035 Aug 27 20:22 tsconfig.tsbuildinfo
---PKG---
{
  "name": "acn-newswire-portal",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "dompurify": "^3.4.7",
    "next": "^16.2.6",
    "next-intl": "^4.8.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "transliteration": "^2.6.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "babel-plugin-react-compiler": "1.0.0",
    "eslint": "^10.0.0",
    "eslint-config-next": "^0.2.4",
    "tailwindcss": "^4",
    "typescript": "^5"
  },
  "overrides": {
    "ajv": "^8.18.0"
  }
}
Bash Map src directory structure
IN
find src -type d | head -60 && echo "===FILES===" && find src -type f \( -name "*.tsx" -o -name "*.ts" \) | head -80

OUT
src
src/app
src/app/api
src/app/api/company-articles
src/app/api/company-articles/[compID]
src/app/api/og
src/app/api/og/article
src/app/api/og/article/[id]
src/app/api/press-release
src/app/api/press-release/[id]
src/app/article
src/app/article/[...segments]
src/app/company
src/app/company/[id]
src/app/events
src/app/events/[eventId]
src/app/events/[eventId]/press-releases
src/app/news
src/app/search
src/assets
src/assets/favi
src/assets/icons
src/components
src/components/company
src/components/events
src/components/home
src/components/nav
src/components/nav/MainNav
src/components/nav/MainNav/Company
src/components/nav/MainNav/Country
src/components/nav/MainNav/Industry
src/components/nav/MainNav/Language
src/components/nav/MainNav/Region
src/components/nav/MainNav/Sector
src/components/nav/TopNav
src/components/press-release
src/components/search
src/components/ui
src/config
src/data
src/lib
src/lib/__tests__
src/services
===FILES===
src/app/api/company-articles/[compID]/route.ts
src/app/api/og/article/[id]/route.tsx
src/app/api/press-release/[id]/route.ts
src/app/article/[...segments]/page.tsx
src/app/company/[id]/page.tsx
src/app/events/page.tsx
src/app/events/[eventId]/page.tsx
src/app/events/[eventId]/press-releases/page.tsx
src/app/layout.tsx
src/app/news/page.tsx
src/app/not-found.tsx
src/app/page.tsx
src/app/search/layout.tsx
src/app/search/page.tsx
src/components/company/CompanyPagination.tsx
src/components/company/CompanySidebar.tsx
src/components/events/event-date.ts
src/components/events/event-industries.ts
src/components/events/EventCountdown.tsx
src/components/events/EventListCard.tsx
src/components/events/EventReleaseItem.tsx
src/components/events/EventStatusPill.tsx
src/components/home/CategoryRow.tsx
src/components/home/EventsRow.tsx
src/components/home/FeaturedReleases.tsx
src/components/home/HomeHero.tsx
src/components/home/ShelfScrollBar.tsx
src/components/nav/index.tsx
src/components/nav/MainNav/Company/index.tsx
src/components/nav/MainNav/Country/index.tsx
src/components/nav/MainNav/index.tsx
src/components/nav/MainNav/Industry/index.tsx
src/components/nav/MainNav/Language/index.tsx
src/components/nav/MainNav/MegaMenuNav.tsx
src/components/nav/MainNav/Region/index.tsx
src/components/nav/MainNav/Sector/index.tsx
src/components/nav/MainNav/types.ts
src/components/nav/TopNav/ClientLinks.tsx
src/components/nav/TopNav/DateDisplay.tsx
src/components/nav/TopNav/DateTimeDisplay.tsx
src/components/nav/TopNav/index.tsx
src/components/nav/TopNav/LanguageSelector.tsx
src/components/nav/TopNav/types.ts
src/components/press-release/ArticleFooterLink.tsx
src/components/press-release/ArticleMeta.tsx
src/components/press-release/ArticleSidebar.tsx
src/components/press-release/Body.tsx
src/components/press-release/Company.tsx
src/components/press-release/Hero.tsx
src/components/press-release/index.tsx
src/components/press-release/InfiniteArticleFeed.tsx
src/components/press-release/MoreFromCompany.tsx
src/components/press-release/PressRelease.tsx
src/components/press-release/PressReleaseItem.tsx
src/components/press-release/ShareBar.tsx
src/components/press-release/types.ts
src/components/search/NestedCheckbox.tsx
src/components/search/Pagination.tsx
src/components/search/SearchResults.tsx
src/components/search/SearchSidebar.tsx
src/components/ui/Footer.tsx
src/components/ui/LanguageTag.tsx
src/components/ui/Rail.tsx
src/components/ui/SocialLinks.tsx
src/config/categories.ts
src/data/company-profiles.ts
src/data/mock-events.ts
src/lib/azure.ts
src/lib/countries.ts
src/lib/filter-data.ts
src/lib/languages.ts
src/lib/metadata.ts
src/lib/region-mapping.ts
src/lib/regions.ts
src/lib/sanitize.ts
src/lib/search-mock-data.ts
src/lib/sector-mapper.ts
src/lib/sectors.ts
src/lib/taxonomy.ts
src/lib/utils.ts
Bash Read layout, middleware, config, docs
IN
cat src/app/layout.tsx && echo "===MW===" && ls src/middleware.ts 2>/dev/null || echo "no middleware" && echo "===NEXTCONF===" && cat next.config.ts && echo "===DOCS===" && ls docs

OUT
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNav, MainNav } from '@/components/nav';
import Footer from '@/components/ui/Footer'
import { generateBaseMetadata } from '@/lib/metadata';

const inter = Inter ({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = generateBaseMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <TopNav />
        <MainNav />
        {children}
        <Footer />
      </body>
    </html>
  );
}===MW===
no middleware
===NEXTCONF===
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/_next/image',
        headers: [{ key: 'Content-Disposition', value: 'inline' }],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/companies', destination: '/company', permanent: true },
      { source: '/companies/:id', destination: '/company/:id', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.acnnewswire.com',
        port: '',
        pathname: '/images/company/**', // This matches your image path!
        search: '',
      },
      // Add other domains you might need
      {
        protocol: 'https',
        hostname: 'photos.acnnewswire.com',
        port: '',
        pathname: '/**',
        search: '',
      },
    ],
  },
};

export default nextConfig;
===DOCS===
api-schemas
taxonomy-migration.md
Bash Check for auth/client patterns and data layer
IN
grep -rn "cookies()\|localStorage\|sessionStorage\|'use client'" src --include=*.tsx --include=*.ts -l | head -30; echo "===AZURE==="; head -40 src/lib/azure.ts; echo "===README==="; head -50 README.md

OUT
src/components/events/EventCountdown.tsx
src/components/events/EventStatusPill.tsx
src/components/home/CategoryRow.tsx
src/components/home/EventsRow.tsx
src/components/home/HomeHero.tsx
src/components/home/ShelfScrollBar.tsx
src/components/nav/MainNav/Company/index.tsx
src/components/nav/MainNav/Country/index.tsx
src/components/nav/MainNav/index.tsx
src/components/nav/MainNav/Industry/index.tsx
src/components/nav/MainNav/Language/index.tsx
src/components/nav/MainNav/MegaMenuNav.tsx
src/components/nav/MainNav/Region/index.tsx
src/components/nav/MainNav/Sector/index.tsx
src/components/nav/TopNav/ClientLinks.tsx
src/components/nav/TopNav/DateDisplay.tsx
src/components/nav/TopNav/DateTimeDisplay.tsx
src/components/nav/TopNav/LanguageSelector.tsx
src/components/press-release/Body.tsx
src/components/press-release/Company.tsx
src/components/press-release/Hero.tsx
src/components/press-release/InfiniteArticleFeed.tsx
src/components/press-release/PressReleaseItem.tsx
src/components/press-release/ShareBar.tsx
src/components/search/NestedCheckbox.tsx
src/components/search/Pagination.tsx
src/components/search/SearchSidebar.tsx
src/components/ui/LanguageTag.tsx
===AZURE===
// Placeholder—no real connections
export const azureClient = {
  query: async () => ({ data: [] }),
  mutate: async () => ({ success: true }),
};
===README===
# ACN Newswire — Frontend Rebuild

A Next.js frontend rebuild of [acnnewswire.com](https://acnnewswire.com) — an Asian press release distribution platform supporting 5 languages across regional subdomains.

***

## What This Is

A React/Next.js wrapper around the existing ACN Newswire ASPX backend. This project does **not** rebuild the backend, replace the database, or migrate press release data.

**Two internal sub-projects, one deployment:**

| Route Group | Purpose | Auth Required |
|---|---|---|
| `(public)` | Press release feed, search, filtering, individual release pages | No |
| `(portal)` | Publisher dashboard, billing, metrics, account management | Yes |

***

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19 |
| Styling | Tailwind CSS v4 + `@tailwindcss/typography` |
| Validation | Zod |
| Sanitization | isomorphic-dompurify |
| i18n | next-intl |
| Icons | Custom SVGs via barrel export |

***

## Getting Started

```bash
# Clone
git clone https://github.com/your-org/acn-newswire.git
cd acn-newswire

# Install
npm install

# Set up environment
cp .env.example .env.local

# Run dev server
npm run dev --turbopack
```
Good context gathered. Quick read of what I'm working with: Next.js 16 App Router, React 19, Tailwind v4, no auth layer, no middleware, src/lib/azure.ts is a stub (so there's no database wired up yet), and the pages I'd be A/B-ing are server components (article/[...segments], company/[id], news, events, search, home).

Before I write anything, here are my questions. I've marked my recommendation on each so you can reply fast — e.g. "defaults, except 4=b and 11=c".

Access & identity

How do employees open the login? (a) secret URL like /ab or ?ab=1, (b) keyboard chord e.g. Ctrl+Shift+A anywhere on site, (c) both. — rec: (c)
Credential shape: (a) one shared team password, (b) per-employee username+password so votes are attributable, (c) both — shared gate then pick your name. — rec: (b), since you want votes.
Note on "hardcode into the website": if the check runs in client JS, the credentials sit in the public bundle and any visitor can read them in devtools. Same effort to put the list in a server route + httpOnly cookie, which keeps it out of the bundle. Want (a) server-checked (rec), or (b) genuinely client-side hardcoded?
How many employees, and can you give me the list of names/logins now, or a placeholder set I wire up and you edit later? — rec: placeholder file you edit
Session length: (a) until browser close, (b) 30 days, (c) 8 hours. — rec: (b)
Should the overlay ship in the production build at all, or only when an env flag (NEXT_PUBLIC_AB=1) is set? — rec: ship to prod but env-flag-able, since you want testing on the real site
How variants are defined

Where does "version B" come from? (a) devs write a second component variant in code, registered in a config file; (b) a CSS override sheet per experiment (no component changes); (c) a whole alternate route/page; (d) mix of (a) and (b). — rec: (d)
Can more than one experiment be live at once, and does an experiment target a specific page (e.g. "article sidebar") or a global element (e.g. nav)? — rec: multiple live, each declares which routes it applies to
Do you want the A/B variant choice to persist as you navigate between pages, or reset per page? — rec: persist
Who authors experiments — only you/devs in code, or do you want a UI where an employee can nudge CSS live and save it as variant B? (The second is a much bigger build.) — rec: code-authored for v1
The four view modes

Side-by-side and the before/after slider realistically need each variant rendered in its own frame (two <iframe>s of the same URL with a variant param) — otherwise you can't show both DOMs at once. OK with: (a) iframe-based for side-by-side + slider, native in-page for A and B solo (rec); (b) screenshot-based comparison instead; (c) something else you had in mind?
Side-by-side: (a) vertical split 50/50, (b) draggable divider, (c) synced scroll between panes. — rec: all three (draggable + synced scroll)
Slider direction: (a) horizontal wipe (rec), (b) vertical, (c) both toggleable.
Should side-by-side/slider let you pick the viewport width (desktop / tablet / mobile) to compare responsive behavior? — rec: yes, presets
Does the overlay itself need to work on a phone, or is desktop-only fine? — rec: desktop-only for compare modes, voting works on mobile
Voting

Where do votes get stored? There's no DB here. Options: (a) an API route writing to a JSON file on the server, (b) hosted KV/Postgres (Vercel KV, Supabase), (c) your existing ASPX backend, (d) localStorage only (no aggregation — one person's votes never reach you). — rec: (a) for v1 behind a small interface I can swap to (b)/(c) later
What's the deploy target? Vercel, IIS/Windows server alongside the ASPX app, or something else? This decides whether (a) above even works (serverless filesystems are read-only).
Vote shape: (a) simple A vs B, (b) A / B / no preference, (c) 1–5 rating on each, (d) A vs B plus an optional comment box. — rec: (d)
One vote per employee per experiment, changeable afterwards? — rec: yes, one, editable
Can voters see the running tally before they vote, or is it hidden until they cast (to avoid bandwagoning)? — rec: hidden until you vote
Should there be a results view inside the overlay — counts, who voted, comments list, CSV export? — rec: yes: counts + comments + CSV, names visible
Should an experiment have a close date / "voting closed" state? — rec: open/closed toggle, no auto-date
Scope & sequencing

Which experiment do you want first as the proving case? Based on your recent commits, the article sidebar/aside or the company page seem live in your head — is one of those the real first test?
Do you want me to build the framework + one real experiment (rec), or framework + a dummy "red button vs blue button" experiment so you can wire up real ones yourself?
Anything the overlay must not touch — e.g. must never affect the real page's analytics, SEO, or what a logged-out visitor sees?
Answer what you care about, say "default" for the rest, and I'll write up the plan.

1. d: all options and a button somewhere hidden in the navbar.
now that I think about it can it not be like f2 or something so it's not a chord people have to think about
2. per employee.
| Username | Password |
|----------|----------|
| Bruce    | Bruce256 |
| cougar   | cougar32 |
| FTP      | saroj123 |
| Glen     | Glen321  |
| Jaymine  | jaymi543 |
| Kazuyo   | kazuyo21 |
| kris     | kris456  |
| Leizlmae | leizl345 |
| Lovely   | lovely45 |
| Marie    | mpb820   |
| MaryAn   | mary321  |
| Paulo    | paulo123 |
| Saroj    | saroj123 |
| Shirley  | Shirl321 |
| Tiara    | tiara879 |
3. how do we do server if possible? this lives on github and vercel and netlify. how do we handle the nuances
4. #3
5. at least 12 hours
6. prod, everything is not public anyways. the link is distributed privately
7. beta versions come with CSS changes mostly but the information in the website should largely be the same.
8. multilive, mostly pages only. no global elements anymore.
9. reset per page.
10. me I author experiments. no UI for employees to nudge css. fuck that bro genuinely

11. yup whatever works as long as it works
12. nah 50/50 split, sync scroll, so it's simpler
13. horizontal only
14. desktop only keep it simple.
15. desktop only

16. okay a json works, will it get stored on the github? how do I access it
17. vercel and netlify separately
18. a or b only no in between. give them an inch they'll take a mile
19. yes editable
20. no. hidden.
21. only for me if I login kris kris456
22. let me have an admin panel where I can see the vote tally, and an onoff, and see which pages have an active voting session with a/b.

23. company, events, press releases/articles
24. real experiment.
25. yup. this should be a separate thing altogether.

so if I hit f2 on an article, it should show me the login panel, and then finally show the vote, preferably on the bottom side of the screen.
and then briefly pulse all changes/comparisons lightly so it'snot overwhelming.

hit me back.
Let me check two things before I answer the storage/CSS questions.

Bash Check host configs, globals.css, article page markup
IN
ls netlify.toml vercel.json .env* 2>/dev/null; echo "===GLOBALS==="; wc -l src/app/globals.css; head -30 src/app/globals.css; echo "===ARTICLE PAGE==="; sed -n '1,60p' src/app/article/\[...segments\]/page.tsx

OUT
===GLOBALS===
125 src/app/globals.css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
@import "tailwindcss" theme(static);

:root {
  --background: #ffffff;
  --foreground: #171717;
  --text-csolor: #999999;
  --nav-text-color: #000000;
  --accent-color: #2088c9;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
}
/*
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --text-color: #999999;
  }
}
*/
body {
  background: var(--background);
  color: var(--text-color);
  font-family: 'Inter', Helvetica, sans-serif;
  letter-spacing: -0.3px;  
===ARTICLE PAGE===
// app/article/[...segments]/page.tsx
import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { PressRelease, InfiniteArticleFeed } from '@/components/press-release';
import { fetchPressRelease } from '@/services/press-release';
import { fetchCompanyArticles } from '@/services/company-articles';
import { fetchReleaseVersions } from '@/services/release-versions';
import { headlineToSlug, languageToSlug } from '@/services/acn-adapter';
import { generateArticleMetadata, SITE_URL, SITE_NAME } from '@/lib/metadata';

type Props = {
  params: Promise<{ segments: string[] }>
}

function extractId(segments: string[]): string | null {
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];
  if (segments.length === 2) {
    return !isNaN(Number(segments[0])) ? segments[0] : segments[1];
  }
  return segments[1]; // [lang, id, slug...]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments } = await params;
  const id = extractId(segments);
  const numericId = Number(id);
  if (!id || isNaN(numericId)) return {};

  try {
    const article = await fetchPressRelease(numericId);
    return generateArticleMetadata(article);
  } catch {
    return {};
  }
}

export default async function ArticlePage({ params }: Props) {
  const { segments } = await params;

  let id: string;
  let lang: string | undefined;
  let slug: string | undefined;

  if (segments.length === 1) {
    [id] = segments;
  } else if (segments.length === 2) {
    // could be [id, slug] or [lang, id]
    if (!isNaN(Number(segments[0]))) {
      [id, slug] = segments;   // numeric first = id/slug
    } else {
      [lang, id] = segments;   // non-numeric first = lang/id
    }
  } else {
    [lang, id, slug] = segments;
  }

  const numericId = Number(id);
  if (isNaN(numericId)) notFound();
Answered your open items, then six things I still need.

The nuances you asked about (#3, #16, #17)
Server-side auth: yes, works on both hosts, no extra services.
A Next.js route handler (POST /api/ab/login) checks the table, then sets an httpOnly; Secure; SameSite=Lax cookie for 12h whose value is user|expiry|HMAC-SHA256. The credential table lives in a server-only module imported only by route handlers, so it never enters the client bundle — I'll grep .next after build to prove it. Vercel and Netlify both run route handlers fine.

JSON file for votes: won't work in prod. Two reasons, and this is the real constraint:

Vercel and Netlify both have read-only/ephemeral filesystems. A write to votes.json either throws or silently vanishes on the next request. Nothing persists, nothing lands in GitHub.
You deploy to two hosts. Even if writes worked, you'd have two divergent tallies with no way to merge them.
So there are three real options:

How it works	Setup	Verdict
Upstash Redis	HTTP REST API, called identically from Vercel and Netlify. Same 2 env vars pasted into both dashboards = one shared tally across both hosts	~5 min signup, free tier is far beyond 15 employees	Recommended
GitHub as DB	Route handler commits ab-votes.json to the repo via a fine-grained PAT. Votes visible in git history	PAT + branch config	Every vote = a commit = a Vercel and Netlify rebuild. Plus lost votes when two people vote at once. Workable with a votes-only branch + ignored-build rules, but it's a deploy storm waiting to happen
Dev-only	Local JSON file, works on npm run dev	none	Fine for building; prod votes just don't persist
Either way I'll write it behind a tiny storage interface with swappable drivers, so switching later is a one-file change. Local JSON driver comes free for dev.

Two things worth flagging before I commit passwords to a repo
Those 15 credentials go into a file in git. Server-only keeps them out of the browser bundle, but not out the repo — if the GitHub repo is public, all 15 are readable by anyone. I'll make the module read an AB_USERS env var when present and fall back to the hardcoded table, so you can move them out later without a code change.
FTP / saroj123 and Saroj / saroj123 share a password, and the first one reads like an actual FTP account credential. If saroj123 is a live password somewhere else, give me a throwaway for the overlay instead.
Technical note on CSS-only variants (#7 + #25)
The pages are pure Tailwind utilities, so a CSS override would have to target things like .lg\:col-span-4.flex.gap-6 — brittle, breaks the moment you restyle. The fix is one data-ab="article-sidebar" attribute on each of the ~6 containers you want to test. No logic, no visual change, and it means every experiment is a self-contained CSS block in src/ab/ — which is exactly the "separate thing altogether" you asked for in #25. Also gives me the anchors for the light pulse (one 1.2s soft outline on switch, respecting prefers-reduced-motion).

F2 is a good call — it's unbound in Chrome, Edge, and Firefox. I'll ignore it while focus is in an input so it doesn't fire mid-search.

What I still need
Storage — Upstash (recommended), GitHub-commits, or build it dev-only for now and wire prod later?
Is the GitHub repo private?
The actual B variants. This is the big one — "real experiment" means I need the design deltas for company, events, and article. Do you want to (a) describe the three B layouts now, (b) have me draft one plausible B per page from your recent sidebar/company/events commits, which you then edit as plain CSS, or (c) ship article-only first and add the other two once the machinery is proven?
Admin panel location — separate /ab-admin route with noindex (my rec, keeps it out of the overlay code), or a tab inside the overlay itself?
Admins — just kris, or should anyone else see tallies?
Vote granularity — one tally per experiment (every article shares "article sidebar A vs B"), or a separate tally per page instance (article 12345 counted on its own)? Rec: per experiment, or you'll never reach a quorum.
1i only should see the tallies when I login.
per experiment
1. okay upstash you should know best
2. where would be a good place to store these? we do have a VM but it is VERY troublesome to write an API just for this. also remove all saroj instances
3. no not now, I'll make them. what I need is the infra for the voting. 
4. okay that works maybe /admin so it's inconspicuous haha. only kris can login
5. kris only
6. per experiment goddamit
Bash Check gitignore and TopNav
IN
cat .gitignore; echo "===TOPNAV==="; sed -n '1,80p' src/components/nav/TopNav/index.tsx

OUT
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
===TOPNAV===
// components/nav/TopNav/index.tsx
import './TopNav.css';

import type { TopNavProps } from './types';
import { DEFAULT_LANGUAGES, DEFAULT_CLIENT_LINKS } from './types';
import LanguageSelector from './LanguageSelector';
import DateTimeDisplay from './DateTimeDisplay';
import ClientLinks from './ClientLinks';
import DateDisplay from './DateDisplay';

export default function TopNav({
  activeLocale = 'en',
  languages = DEFAULT_LANGUAGES,
  clientLinks = DEFAULT_CLIENT_LINKS,
}: TopNavProps) {
  
  return (
    <section className="top-nav relative z-888">
      <div className="flex flex-row justify-between items-center min-h-7 pt-0.5">
        {/* Left: Language selector */}
        <div className="nav-left flex">
          <LanguageSelector 
            activeLocale={activeLocale}
            languages={languages}
          />
        </div>

        {/* Center: DateTime - hidden below 768px, absolutely centered when visible */}
        <div className="
          hidden 
          md:block 
          absolute 
          left-1/2 
          -translate-x-1/2
          whitespace-nowrap
        ">
          <DateTimeDisplay />
        </div>

        {/* Right: Client links -- temporarily removed */}
        <div className="nav-right ml-auto">
          { /* <ClientLinks links={clientLinks} /> -- temporarily removed */ }
          <DateDisplay />
        </div>
      </div>
    </section>
  );
}
Bash Find stable custom class names in target pages
IN
grep -rhno "className=\"[^\"]*\"" src/components/press-release src/components/company src/components/events src/app/company src/app/events 2>/dev/null | grep -oE "\b[a-z]+-[a-z-]+\b" | sort | uniq -c | sort -rn | head -40

OUT
     76 text-gray-
     29 text-xs
     26 font-semibold
     18 items-center
     18 border-gray-
     13 flex-wrap
     12 bg-gray-
     11 text-white
     11 text-black
     11 justify-center
     11 flex-col
      9 tracking-wider
      9 text-sm
      9 min-w-
      9 flex-row
      8 max-w-
      8 leading-relaxed
      8 inline-flex
      7 text-center
      7 justify-between
      7 divide-gray-
      6 transition-colors
      6 text-lg
      6 mx-auto
      6 grid-cols-
      6 font-medium
      5 tracking-tight
      5 object-contain
      5 line-clamp-
      5 items-stretch
      5 divide-y
      4 w-px
      4 text-md
      4 self-stretch
      4 rounded-full
      4 leading-snug
      4 items-baseline
      4 group-hover
      3 whitespace-nowrap
      3 w-auto
Bash Find semantic landmark elements
IN
grep -rn "<main\|<aside\|<article\|<section" src/components/press-release src/components/company src/app/company src/app/events src/app/article src/components/events | head -20

OUT
src/components/press-release/ArticleSidebar.tsx:105:    <aside className={RAIL_WIDTH}>
src/components/press-release/Company.tsx:44:    <section className={`mt-12 ${className}`}>
src/components/press-release/MoreFromCompany.tsx:19:    <section className="mt-8 pt-6">
src/components/press-release/PressRelease.tsx:34:        <article className="flex-1 min-w-0">
src/components/company/CompanySidebar.tsx:144:    <aside className={RAIL_WIDTH}>
src/app/company/[id]/page.tsx:75:              <section className="mb-10">
src/app/company/[id]/page.tsx:89:            <section>
src/app/events/page.tsx:13:    <section className="mb-10">
src/app/events/page.tsx:119:    <section className="mb-10">
src/app/events/[eventId]/page.tsx:177:            <section className="mb-10">
src/app/events/[eventId]/page.tsx:195:              <section className="mb-10">
src/app/events/[eventId]/page.tsx:239:            <section className="mb-10">
src/app/events/[eventId]/page.tsx:263:          <aside className={RAIL_WIDTH}>
src/app/article/[...segments]/page.tsx:100:        <main>
src/components/events/EventReleaseItem.tsx:17:    <article className="flex items-stretch py-3">
Everything's answered. Building it now — Upstash for storage, credentials in env vars (never in git), /admin for you only, per-experiment tallies, Saroj/FTP dropped.

Bash Create .env.local with credentials and append gitignore rule
IN
printf '\n# a/b overlay local vote store\n/.ab-data/\n' >> .gitignore && SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") && cat > .env.local <<EOF
# ---------------------------------------------------------------------------
# A/B overlay — employee credentials. This file is gitignored (.env* rule).
# Paste AB_USERS and AB_SECRET into Vercel + Netlify env vars for production.
# Format: user:password,user:password  (usernames are case-insensitive)
# ---------------------------------------------------------------------------
AB_USERS=Bruce:Bruce256,cougar:cougar32,Glen:Glen321,Jaymine:jaymi543,Kazuyo:kazuyo21,kris:kris456,Leizlmae:leizl345,Lovely:lovely45,Marie:mpb820,MaryAn:mary321,Paulo:paulo123,Shirley:Shirl321,Tiara:tiara879
AB_ADMINS=kris
AB_SECRET=$SECRET

# Upstash Redis (vote storage). Leave blank locally to use the .ab-data JSON file.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
EOF
echo "written:"; grep -c . .env.local; tail -3 .gitignore

OUT
claude-opus-5[1m] is temporarily unavailable, so auto mode cannot determine the safety of Bash right now. Wait a moment and then try this action again. If it keeps failing, continue with other tasks that don't require this action and come back to it later. Note: reading files, searching code, and other read-only operations do not require the classifier and can still be used.
Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead, or ask your admin to enable access

how do I fix this?
Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead, or ask your admin to enable access