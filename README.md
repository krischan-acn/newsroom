# ACN Newswire newsroom

The public press release site for ACN Newswire: press releases in English, Chinese, Japanese and Korean, company pages, events and search. Next.js 16 (App Router), React 19, Tailwind CSS 4.

Live at **portal.acnnewswire.com** (Netlify), with a second copy at acn-newswire.vercel.app (Vercel).

```bash
npm install
git config core.hooksPath .githooks
npm run dev        # http://localhost:3000, reads the live ACN API
```

Before committing, run `npx tsc --noEmit` and `npm run build`.

- **Changing code?** Read [`AGENTS.md`](AGENTS.md), then [`BIBLE.md`](BIBLE.md).
- **Everything else** (hosting, the API, runbooks, guides for staff) is in the **ACN docs** site, repo `krischan-acn/acn-docs`.
