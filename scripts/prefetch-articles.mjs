// scripts/prefetch-articles.mjs
//
// Rebuilds src/data/prefetched-articles.json — the static snapshot that is the
// SOLE backing store for /search.
//
//   node scripts/prefetch-articles.mjs
//
// Why this exists: the committed snapshot held 292 articles with ids
// 107000–107303, captured from the LEGACY api in June 2026. Not one of those
// ids exists on the current API (which serves 100269–106708), so every single
// search result linked to a 404. The old scripts/prefetch-articles.js cannot
// regenerate it — it sweeps legacy ids and that host has been 503 since August.
//
// Two endpoints are needed because neither is complete on its own:
//
//   /api/Articles              has `language`, but no sector and no images
//   /api/Articles/by-industry  has `sectorName` and images, but no `language`
//
// So the base sweep comes from the first and is enriched from the second.
//
// Not recoverable from either: `location`. It was a legacy-only field, so the
// region facet in the search sidebar will match nothing until the API exposes
// a country per article. Recorded as an empty string rather than faked.

import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://development.acnnewswire.com';
const OUT = join(process.cwd(), 'src', 'data', 'prefetched-articles.json');

/** /api/Articles 400s above this. */
const PAGE_SIZE = 100;
const MAX_PAGES = 400;

/**
 * The corpus is 20,000+ articles and this file is imported statically into the
 * server bundle, so it cannot hold all of them. /api/Articles returns newest
 * first, so this keeps the most recent slice. Raise it if search needs to reach
 * further back, and watch the file size - roughly 0.6KB per article.
 */
const MAX_ARTICLES = 5000;

/** Legacy summaries arrived pre-truncated at roughly this; the new API returns
 *  the full body text, which would balloon the bundled JSON. */
const SUMMARY_MAX = 300;

async function getJson(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
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

function truncate(text) {
  const t = clean(text);
  return t.length > SUMMARY_MAX ? `${t.slice(0, SUMMARY_MAX)}...` : t;
}

/** Pages an endpoint until it returns a short page. */
async function sweep(makeUrl, label, limit = Infinity) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await getJson(makeUrl(page));
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (rows.length >= limit) return rows.slice(0, limit);
    if (batch.length < PAGE_SIZE) break;
  }
  if (label) process.stdout.write(`  ${label}: ${rows.length}\n`);
  return rows;
}

async function main() {
  // --- 1. base corpus, for language ----------------------------------------
  console.log('Sweeping /api/Articles ...');
  const base = await sweep(
    (p) => `${API}/api/Articles?Page=${p}&Size=${PAGE_SIZE}`,
    'articles',
    MAX_ARTICLES,
  );
  if (base.length === 0) {
    console.error('FATAL: /api/Articles returned nothing.');
    process.exit(1);
  }

  // --- 2. industry sweep, for sectors and images ---------------------------
  // The ?industry= parameter takes a SECTOR TYPE (Technology, Business,
  // Financial, ...), not one of the 76 sector_name industries - passing an
  // industry name returns [] silently, which is what made a first run of this
  // script tag only 296 of 6000 articles. Read from the sector_type column.
  //
  // Read out of the source rather than imported: this is a plain .mjs script
  // and sectors.ts is TypeScript.
  const sectorsSrc = readFileSync(join(process.cwd(), 'src', 'lib', 'sectors.ts'), 'utf8');
  const industries = [
    ...new Set(
      [...sectorsSrc.matchAll(/sector_type:\s*'([^']+)'/g)].map((m) => m[1]),
    ),
  ];

  const enrich = new Map(); // articleId -> { sectors:Set, thumbImage, bigImage, companies }
  console.log(`Sweeping /api/Articles/by-industry across ${industries.length} industries ...`);
  for (const industry of industries) {
    const rows = await sweep(
      (p) =>
        `${API}/api/Articles/by-industry?industry=${encodeURIComponent(industry)}` +
        `&pageNumber=${p}&pageSize=${PAGE_SIZE}`,
      null,
    );
    for (const r of rows) {
      const cur = enrich.get(r.articleId) ?? { sectors: new Set(), images: null, companies: null };
      if (clean(r.sectorName)) cur.sectors.add(clean(r.sectorName));
      if (!cur.images && Array.isArray(r.images) && r.images.length > 0) cur.images = r.images[0];
      if (!cur.companies && Array.isArray(r.companies) && r.companies.length > 0) {
        cur.companies = r.companies[0];
      }
      enrich.set(r.articleId, cur);
    }
    process.stdout.write(`  ${industry}: ${rows.length}\n`);
  }

  // --- 3. merge ------------------------------------------------------------
  const PHOTOS = 'https://photos.acnnewswire.com/';
  const LOGOS = 'https://www.acnnewswire.com/images/company/';
  const seen = new Set();
  const out = [];

  for (const a of base) {
    if (seen.has(a.articleId)) continue;
    seen.add(a.articleId);

    const extra = enrich.get(a.articleId);
    const baseCompany = a.companies?.[0] ?? null;
    const extraCompany = extra?.companies ?? null;

    // Casing differs between the two endpoints - read both.
    const companyId =
      baseCompany?.companyId ?? baseCompany?.companyID ??
      extraCompany?.companyId ?? extraCompany?.companyID ?? null;
    const companyName = clean(baseCompany?.companyName ?? extraCompany?.companyName) || null;
    const logo =
      baseCompany?.logoFilename ?? baseCompany?.logoFileName ??
      extraCompany?.logoFilename ?? extraCompany?.logoFileName ?? null;

    const thumb = clean(extra?.images?.thumbImage);
    const big = clean(extra?.images?.bigImage);
    const sectors = extra ? [...extra.sectors] : [];

    out.push({
      id: a.articleId,
      headline: clean(a.headline),
      dateTime: a.publishDate,
      thumbImage: thumb ? `${PHOTOS}${thumb}` : null,
      bigImage: big ? `${PHOTOS}${big}` : null,
      summary: truncate(a.summary),
      companyName,
      companyLogo: logo ? `${LOGOS}${logo}` : null,
      companyId: companyId === null ? null : String(companyId),
      sectors,
      // sectorMappings / primarySector* are derived at read time by
      // lib/taxonomy via services/search.ts, so they are left empty here
      // rather than baked in and allowed to drift from the taxonomy.
      sectorMappings: [],
      primarySector: sectors[0] ?? null,
      primarySectorType: null,
      rawLanguage: clean(a.language),
      rawSource: '',
      // Legacy-only field, not exposed by the current API. See header note.
      location: '',
    });
  }

  out.sort((x, y) => String(y.dateTime).localeCompare(String(x.dateTime)));

  const json = JSON.stringify(out, null, 0);
  writeFileSync(OUT, `${json}\n`, 'utf8');

  const withSectors = out.filter((a) => a.sectors.length > 0).length;
  const withImage = out.filter((a) => a.thumbImage || a.bigImage).length;
  const withLang = out.filter((a) => a.rawLanguage).length;
  console.log(`\nWrote ${out.length} articles to ${OUT}`);
  console.log(`  ${(json.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  id range      ${Math.min(...out.map((a) => a.id))}-${Math.max(...out.map((a) => a.id))}`);
  console.log(`  with sectors  ${withSectors}`);
  console.log(`  with image    ${withImage}`);
  console.log(`  with language ${withLang}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
