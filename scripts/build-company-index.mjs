// scripts/build-company-index.mjs
//
// Rebuilds src/data/company-index.json — the static index the company search
// bar matches against.
//
//   node scripts/build-company-index.mjs
//
// Why this is static: the API has no company-name search. /api/Articles/search
// accepts a CompanyName parameter but returns 0 rows for every input, including
// unfiltered, so it cannot back a lookup. Company records barely change, and
// once a visitor reaches /company/{id} the release feed is live — so staleness
// stops at the front door. Article data, which changes daily, is a bad fit for
// the same treatment and keeps its own snapshot in prefetch-articles.mjs.
//
// SECURITY — gap SEC-01. /api/Companies returns `username` and `password` in
// PLAINTEXT on every row, the list endpoint included. This script allow-lists
// the fields it copies rather than deleting the ones it does not want, so a new
// credential field appearing upstream cannot leak into the committed output by
// default. It also refuses to write a file that contains either word. Do not
// replace pickFields() with a spread-and-delete.

import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://development.acnnewswire.com';
const OUT = join(process.cwd(), 'src', 'data', 'company-index.json');
const ARTICLES = join(process.cwd(), 'src', 'data', 'prefetched-articles.json');

/** 9,439 companies over 95 pages at this size. */
const PAGE_SIZE = 100;
const MAX_PAGES = 200;

/**
 * Name variants are kept in full rather than English-only. This is a
 * multilingual newswire and a reader searching 三菱重工業 should reach the same
 * page as one searching Mitsubishi. English-only would be roughly 570 KB
 * against 0.6–1.9 MB for all five; if the file outgrows that, drop KO/JP before
 * dropping CH/CT — the traditional/simplified pair carries the most traffic.
 */
const NAME_FIELDS = ['en', 'ch', 'ct', 'jp', 'ko'];

/**
 * Timed out rather than left to the OS socket timeout: when the host is down
 * an unbounded fetch hangs for ~20s per attempt, so three retries across the
 * first page alone would stall a minute before the offline fallback could run.
 */
async function getJson(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (attempt === tries) return null;
    }
  }
  return null;
}

function clean(text) {
  return typeof text === 'string' ? text.trim() : '';
}

/**
 * The list endpoint spells the English name `companyNameEN`, while
 * /api/Companies/{id} was reported as `companyName` on 2026-09-09 — the schema
 * capture in docs/api-schemas/company.csv predates that and shows `companyNameEN`
 * on both. Read either, so this survives whichever shape the server settles on.
 */
function englishName(row) {
  return clean(row.companyName) || clean(row.companyNameEN);
}

/**
 * Copies only the fields named here. See the SEC-01 note at the top of the file:
 * this is an allow-list on purpose.
 */
function pickFields(row) {
  const names = {
    en: englishName(row),
    ch: clean(row.companyNameCH),
    ct: clean(row.companyNameCT),
    jp: clean(row.companyNameJP),
    ko: clean(row.companyNameKO),
  };

  // A row with no name of any kind cannot be searched for and cannot label a
  // result, so it is dropped rather than indexed as a blank entry.
  if (!NAME_FIELDS.some((f) => names[f])) return null;

  const entry = { id: row.companyId, n: names.en };

  // Variants are stored only where they differ from the English name. Most rows
  // repeat the same string in all five columns (see company.csv row 82), and
  // storing four duplicate copies of every name roughly triples the file for no
  // extra match.
  const alt = NAME_FIELDS.filter((f) => f !== 'en')
    .map((f) => names[f])
    .filter((v) => v && v !== names.en);
  if (alt.length > 0) entry.a = [...new Set(alt)];

  const logo = clean(row.logoFilename);
  if (logo) entry.l = logo;

  const url = clean(row.url);
  if (url) entry.u = url;

  return entry;
}

/**
 * Derives an index from src/data/prefetched-articles.json, the committed
 * article snapshot. Each row carries companyId, companyName and an absolute
 * companyLogo URL, which is everything the search list renders.
 *
 * No name variants: the article feed only ever carries one name per company.
 * A sweep of /api/Companies supersedes this whenever one can be run.
 */
function fromArticles() {
  let articles;
  try {
    articles = JSON.parse(readFileSync(ARTICLES, 'utf8'));
  } catch {
    return [];
  }
  if (!Array.isArray(articles)) return [];

  const byId = new Map();
  for (const a of articles) {
    const id = Number(a?.companyId);
    const name = clean(a?.companyName);
    if (!Number.isFinite(id) || id <= 0 || !name) continue;
    if (byId.has(id)) continue;

    const entry = { id, n: name };
    // companyLogo is already absolute here, unlike the API's bare logoFilename.
    // Store just the filename so both sources produce the same shape.
    const logo = clean(a?.companyLogo);
    if (logo) entry.l = logo.split('/').pop();
    byId.set(id, entry);
  }

  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/** Serialises, runs the credential tripwire, and writes. Shared by both paths. */
function write(out, source) {
  const json = JSON.stringify(out, null, 0);

  // Belt and braces over the allow-list above: never write credentials.
  const leak = /"(username|password)"|password/i.exec(json);
  if (leak) {
    console.error(
      `FATAL: refusing to write — output contains ${leak[0]} (gap SEC-01).\n` +
      'Check pickFields(); a credential field has reached the output.',
    );
    process.exit(1);
  }

  writeFileSync(OUT, `${json}\n`, 'utf8');

  console.log(`\nWrote ${out.length} companies to ${OUT}`);
  console.log(`  source          ${source}`);
  console.log(`  ${(json.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  id range        ${out[0]?.id}-${out[out.length - 1]?.id}`);
  console.log(`  with alt names  ${out.filter((c) => c.a).length}`);
  console.log(`  with logo       ${out.filter((c) => c.l).length}`);
  console.log(`  with url        ${out.filter((c) => c.u).length}`);

  if (json.length > 2 * 1024 * 1024) {
    console.warn('\nWARNING: over 2 MB. See the NAME_FIELDS note about trimming variants.');
  }
}

async function main() {
  console.log('Sweeping /api/Companies ...');

  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await getJson(`${API}/api/Companies?Page=${page}&Size=${PAGE_SIZE}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    process.stdout.write(`\r  page ${page}: ${rows.length} companies`);
    if (batch.length < PAGE_SIZE) break;
  }
  process.stdout.write('\n');

  // Offline fallback. When the API is unreachable, the companies named on the
  // committed article snapshot are still a real, usable index — roughly 836 of
  // the 9,439, but they are the ones that have actually published recently,
  // which is most of what anyone searches for. Better a partial index that
  // works than an empty one that tells the reader to run a build script.
  //
  // Re-run this against a reachable API to replace it with the full sweep.
  if (rows.length === 0) {
    console.warn('  /api/Companies unreachable — falling back to the article snapshot.');
    const out = fromArticles();
    if (out.length === 0) {
      console.error(
        'FATAL: no companies from either source. The index was NOT written — the\n' +
        'existing file is left in place rather than being truncated to an empty\n' +
        'index, which would silently break company search.',
      );
      process.exit(1);
    }
    write(out, 'article snapshot');
    return;
  }

  // The list endpoint has been observed repeating rows across page boundaries.
  // Last write wins, then sort by id so the diff between two runs is readable.
  const byId = new Map();
  for (const row of rows) {
    if (typeof row.companyId !== 'number') continue;
    const entry = pickFields(row);
    if (entry) byId.set(row.companyId, entry);
  }

  const out = [...byId.values()].sort((a, b) => a.id - b.id);
  write(out, '/api/Companies');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
