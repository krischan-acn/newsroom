// scripts/probe-events-schema.mjs
//
// Regenerates the EVENTS-surface schema export in docs/api-schemas/.
//
//   node scripts/probe-events-schema.mjs
//
// Hits the live API and rewrites, in the format docs/api-schemas/README.md
// describes (UTF-8 with BOM, CRLF, header row + one real sample row):
//
//   events.csv                           GET /api/Events
//   event-companies-nested.csv           the companies[] element inside an event
//   event-releases-by-company-year.csv   GET /api/Events/company/{id}/year/{year}
//   event-detail.csv                     GET /api/Events/{id}  (spec-derived: 500s)
//
// It also rewrites the Event rows of _index.csv and _field-dictionary.csv in
// place, leaving every other entity's rows untouched.
//
// The original capture scripts (probe.py, gen.py, gaps.py) were never committed
// — see docs/api-schemas/README.md "Regenerating". This covers the events third
// of that surface so it can at least be re-run without rediscovering the shape.

import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const NEW_API = 'https://development.acnnewswire.com';
const OUT_DIR = join(process.cwd(), 'docs', 'api-schemas');
const TRUNCATE_AT = 300;

const EVENTS_PAGE_SIZE = 500;
const EVENTS_URL = `${NEW_API}/api/Events?pageNumber=1&pageSize=${EVENTS_PAGE_SIZE}`;
const DETAIL_URL = `${NEW_API}/api/Events/{id}`;
const RELEASES_URL = `${NEW_API}/api/Events/company/{companyId}/year/{year}`;

// ---------------------------------------------------------------------------
// CSV helpers — match the existing export byte-for-byte: BOM, CRLF, minimal
// quoting (quote only when the value contains a comma, quote or newline).
// ---------------------------------------------------------------------------

function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (text.length > TRUNCATE_AT) text = `${text.slice(0, TRUNCATE_AT)}...[truncated]`;
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filename, rows) {
  const body = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  writeFileSync(join(OUT_DIR, filename), `﻿${body}\r\n`, 'utf8');
  console.log(`  wrote ${filename}`);
}

/** Header row + one sample row, which is the shape every <entity>.csv uses. */
function writeEntityCsv(filename, fields, sample) {
  writeCsv(filename, [fields, fields.map((f) => flatten(sample?.[f]))]);
}

/** Nested objects/arrays are summarised rather than inlined, as in the original. */
function flatten(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.length === 0 ? '' : `[${value.length} items]`;
  if (typeof value === 'object') return '[object]';
  return value;
}

// ---------------------------------------------------------------------------
// Type inference across EVERY sampled row, not just the first. The 2026-08-27
// capture recorded compId as "null" and companies as "array[empty]" from a
// single sample; both are populated on other rows, so one row is not enough.
// ---------------------------------------------------------------------------

function jsonType(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return value.length === 0 ? 'array[empty]' : 'array';
  return typeof value === 'number'
    ? (Number.isInteger(value) ? 'integer' : 'number')
    : typeof value;
}

function describeField(rows, field) {
  const types = new Set();
  let nullable = false;
  let sample = '';

  for (const row of rows) {
    const value = row?.[field];
    if (value === null || value === undefined) {
      nullable = true;
      continue;
    }
    types.add(jsonType(value));
    if (sample === '') {
      const flat = flatten(value);
      if (flat !== '' && flat !== '[object]') sample = flat;
    }
  }

  const observed = [...types].filter((t) => t !== 'array[empty]');
  const type = observed.length > 0 ? observed.join('|') : ([...types][0] ?? 'null');
  return { type, nullable: nullable ? 'yes' : 'no', sample };
}

function fieldsOf(rows) {
  const seen = [];
  for (const row of rows) {
    for (const key of Object.keys(row ?? {})) if (!seen.includes(key)) seen.push(key);
  }
  return seen;
}

async function getJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not JSON — a 500 HTML/problem body */ }
    return { status: res.status, body, bytes: Buffer.byteLength(text) };
  } catch (err) {
    return { status: 0, body: null, bytes: 0, error: String(err) };
  }
}

// ---------------------------------------------------------------------------

async function main() {
  console.log('Probing the events surface...\n');

  // --- 1. the list endpoint, paged in full ----------------------------------
  // pageSize IS honoured and the default is only 10, so an unpaged call returns
  // a tiny arbitrary slice. Page right through, as services/events.ts does.
  const events = [];
  let listStatus = 0;
  let totalBytes = 0;
  for (let page = 1; page <= 20; page++) {
    const res = await getJson(`${NEW_API}/api/Events?pageNumber=${page}&pageSize=${EVENTS_PAGE_SIZE}`);
    listStatus = res.status;
    if (res.status !== 200 || !Array.isArray(res.body)) break;
    events.push(...res.body);
    totalBytes += res.bytes;
    if (res.body.length < EVENTS_PAGE_SIZE) break;
  }
  if (events.length === 0) {
    console.error(`FATAL: /api/Events returned ${listStatus}; cannot export.`);
    process.exit(1);
  }
  const list = { status: listStatus, bytes: totalBytes };
  const published = events.filter((e) => e.publish === 'y').length;
  console.log(`  /api/Events -> 200, ${events.length} rows (${published} published), ${totalBytes} bytes across all pages`);

  const eventFields = fieldsOf(events);
  // Prefer a sample row that actually exercises compId and companies[].
  const richEvent = events.find((e) => e.compId && e.companies?.length) ?? events[0];
  writeEntityCsv('events.csv', eventFields, richEvent);

  // --- 2. the nested companies[] element ------------------------------------
  const nested = events.flatMap((e) => e.companies ?? []);
  if (nested.length > 0) {
    const nestedFields = fieldsOf(nested);
    writeEntityCsv('event-companies-nested.csv', nestedFields, nested[0]);
  } else {
    console.log('  (no nested companies observed — skipping nested CSV)');
  }

  // --- 3. the releases-by-company-and-year endpoint -------------------------
  // Keyed on the organiser company + the year the show ran; this is the only
  // event-to-release relation the API exposes.
  let releases = [];
  let releasesUrlUsed = '';
  let releasesStatus = 0;
  for (const event of events) {
    if (!event.compId) continue;
    const year = String(event.startDate ?? '').slice(0, 4);
    if (!year) continue;
    const url = `${NEW_API}/api/Events/company/${event.compId}/year/${year}`;
    const res = await getJson(url);
    releasesStatus = res.status;
    if (res.status === 200 && Array.isArray(res.body) && res.body.length > 0) {
      releases = res.body;
      releasesUrlUsed = url;
      break;
    }
  }
  if (releases.length > 0) {
    console.log(`  ${releasesUrlUsed} -> 200, ${releases.length} rows`);
    writeEntityCsv('event-releases-by-company-year.csv', fieldsOf(releases), releases[0]);
  } else {
    console.log(`  releases-by-company-year returned no rows (last status ${releasesStatus})`);
  }

  // --- 4. the detail endpoint (expected 500) --------------------------------
  const detailId = richEvent.id;
  const detail = await getJson(`${NEW_API}/api/Events/${detailId}`);
  console.log(`  /api/Events/${detailId} -> ${detail.status}`);

  if (detail.status === 200 && detail.body) {
    writeEntityCsv('event-detail.csv', fieldsOf([detail.body]), detail.body);
  } else {
    // Still export a schema, flagged spec-derived: the list endpoint returns the
    // same per-event object, so its shape IS the detail shape.
    writeCsv('event-detail.csv', [
      ['field', 'json_type', 'note'],
      ...eventFields.map((f) => {
        const d = describeField(events, f);
        return [f, d.type, `spec-derived from /api/Events; detail endpoint returned ${detail.status}`];
      }),
    ]);
  }

  // --- 5. rewrite the Event rows of _index.csv ------------------------------
  const detailNote = detail.status === 200
    ? ''
    : `HTTP ${detail.status}: required column 'Companies' missing from FromSql result. Worked around in services/events.ts:fetchEvent by filtering the list`;

  const indexRows = [
    ['Event', 'events.csv', 'new', 'GET', EVENTS_URL, String(list.status), 'array',
      String(events.length), String(eventFields.length), 'live-verified', 'services/events.ts',
      `PAGES: pageSize is honoured, default is 10, so an unpaged call returns only 10 of ${events.length}. ${published} are publish=y. ${list.bytes} bytes across all pages, inflated because each event repeats its organiser once per release`],
    ['Event', 'event-companies-nested.csv', 'new', 'GET', EVENTS_URL, String(list.status), 'array',
      String(nested.length), String(nested.length ? fieldsOf(nested).length : 0), 'live-verified',
      'services/events.ts', 'The companies[] element inside an event. Deduped by mapEvent - the API repeats the same company once per release'],
    ['EventRelease', 'event-releases-by-company-year.csv', 'new', 'GET', RELEASES_URL,
      releases.length ? '200' : String(releasesStatus), 'array', String(releases.length),
      String(releases.length ? fieldsOf(releases).length : 0),
      releases.length ? 'live-verified' : 'not observed', 'services/events.ts',
      `The ONLY event-to-release relation the API exposes: organiser company + year. Only ${events.filter((e) => e.compId).length} of ${events.length} events carry a compId, so most events can never resolve releases this way`],
    ['Event', 'event-detail.csv', 'new', 'GET', DETAIL_URL, String(detail.status), 'object', '0',
      String(eventFields.length), detail.status === 200 ? 'live-verified' : 'spec-derived (endpoint 500 at capture time)',
      'not used', detailNote],
  ];
  // Must match EventRelease too, or re-running appends a duplicate of that row.
  rewriteEntityRows('_index.csv', indexRows,
    (cols) => (cols[0] === 'Event' && cols[2] === 'new') || cols[0] === 'EventRelease');

  // --- 6. rewrite the Event rows of _field-dictionary.csv -------------------
  const dictRows = [];
  for (const f of eventFields) {
    const d = describeField(events, f);
    dictRows.push(['Event', 'events', EVENTS_URL, f, '', d.type, d.nullable, d.sample, 'live', '']);
  }
  for (const f of nested.length ? fieldsOf(nested) : []) {
    const d = describeField(nested, f);
    dictRows.push(['Event', 'event-companies-nested', EVENTS_URL, f, 'companies', d.type, d.nullable, d.sample, 'live', '']);
  }
  for (const f of releases.length ? fieldsOf(releases) : []) {
    const d = describeField(releases, f);
    dictRows.push(['EventRelease', 'event-releases-by-company-year', RELEASES_URL, f, '', d.type, d.nullable, d.sample, 'live', '']);
  }
  rewriteEntityRows('_field-dictionary.csv', dictRows,
    (cols) => (cols[0] === 'Event' && cols[1] !== 'legacy-event') || cols[0] === 'EventRelease');

  console.log('\nDone.');
}

/**
 * Replaces the rows a predicate matches with `replacement`, keeping the header,
 * every other entity's rows, and their original order. Splits on CRLF and
 * tolerates quoted commas.
 */
function rewriteEntityRows(filename, replacement, matches) {
  const path = join(OUT_DIR, filename);
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0];

  const kept = [];
  let inserted = false;
  for (const line of lines.slice(1)) {
    if (matches(splitCsvLine(line))) {
      if (!inserted) {
        kept.push(...replacement.map((r) => r.map(csvCell).join(',')));
        inserted = true;
      }
      continue;
    }
    kept.push(line);
  }
  if (!inserted) kept.push(...replacement.map((r) => r.map(csvCell).join(',')));

  writeFileSync(path, `﻿${[header, ...kept].join('\r\n')}\r\n`, 'utf8');
  console.log(`  updated ${filename} (${replacement.length} Event rows)`);
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
