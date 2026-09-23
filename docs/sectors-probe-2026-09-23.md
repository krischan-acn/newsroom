# `/api/Sectors` — probe report, 2026-09-23

**Probe only. No taxonomy code was changed by this pass.**

`GET /api/Sectors` is one of four routes added to the dev API alongside the
`/full` projections. It publishes the wire's own sector vocabulary, which until
now both repos could only guess at. This records what it holds and what it would
cost to adopt, so the decision can be made on numbers rather than on the hope
that two lists called "sectors" mean the same thing.

## What the endpoint returns

One flat array, 199 rows, 40 KB, no paging parameters. A row:

```json
{
  "id": 211,
  "name": "Aerospace & Defence",
  "description": "Aerospace & Defence",
  "subId": 16,
  "title": "Aerospace & Defence",
  "titleJ": "宇宙・防衛",
  "titleCh": "航空航天和国防",
  "titleCt": "航空航天和國防",
  "titleKo": "항공 우주 및 방위"
}
```

`subId` takes 22 distinct values and is the wire's grouping level — the rough
equivalent of our `sector_type`, which has 9.

## Against `src/lib/sectors.ts`

Names compared after the same canonicalisation `lib/taxonomy.ts` already uses:
case-folded, punctuation collapsed, so `Construct, Engineering` matches
`Construct Engineering`.

| | |
|---|---|
| Wire rows | 199 |
| Local rows | 76 |
| Wire rows whose name matches a local row | 85 |
| Local rows with no wire counterpart | **0** |
| Names only the wire has | 114 |
| Wire rows carrying real localised titles | 156 of 199 |

The local list is a strict subset of the wire's by name. Nothing we classify
under would disappear; the wire simply knows 114 more industries, including
whole areas the site currently cannot tag at all — `BlockChain`,
`CryptoCurrency`, `Datacenter & Cloud`, `Biometrics`, `Consumer Electronics`,
`Commercial Banking`.

## The ids are not interchangeable — and that is the whole finding

Of the 85 rows where both lists know the name:

- **33** agree on the id
- **52** do not

Worse than disagreeing: **35 wire ids, read against the local list, land on a
real but wrong industry.** They do not fail loudly — they resolve to something
plausible.

| wire id | the wire means | reading it locally gives |
|---|---|---|
| 190 | Alternative Energy | Enterprise IT |
| 232 | Artificial Intel [AI] | Alternative Energy |
| 239 | Automation [IoT] | Digitalization |
| 176 | Aviation | BioTech |
| 255 | BlockChain | Beauty & Skin Care |
| 256 | CryptoCurrency | Cosmetics Spec.Chem |
| 243 | Datacenter & Cloud | CyberSecurity |
| 122 | E-commerce | Education |

This is AC-M1 in `contracts/company.before.json`, now measured rather than
inferred. It is the mechanism that once tagged Mitsubishi Heavy Industries
"Fashion & Apparel" and "eSports Gaming": an id matched against the wrong
taxonomy produces a wrong answer that looks right.

Both repos already avoid it. `company-profile.ts` (`buildIndustry`) and
`map-company.ts` (`mapSector`) both match on **name**, and `sectorFromId` in the
admin deliberately yields no sector rather than a blank-named one when an id
does not resolve. Nothing in this probe changes that — it confirms the rule and
says how expensive breaking it would be.

## Two cautions before anyone wires this up

1. **The wire's names are not unique.** `Clinical Trials` appears at both id 80
   and id 247; `Biometrics` and `Consumer Electronics` likewise appear twice.
   Any name-keyed map built from this endpoint silently drops one of each pair.
   Decide which wins, or key on `id` and carry the name.
2. **`subId` has not been mapped to `sector_type`.** 22 wire groups against 9
   local sectors, and the relationship is unexamined. The nav's mega-menus and
   the search facets are built on the 9. Adopting the wire's vocabulary without
   answering this replaces a hierarchy the UI depends on.

## What adopting it would touch

Recorded for scoping, not proposed:

- `src/lib/sectors.ts` — the master list itself
- `src/lib/taxonomy.ts` — `resolveIndustry`, and the SECTOR > INDUSTRY tree
- `src/lib/filter-data.ts` — the search sidebar's industry hierarchy
- `src/data/prefetched-articles.json` — the search snapshot's sector strings
- `acn-admin/src/lib/sectors.ts` — the admin's copy of the same list
- the company editor's sector picker

The localised titles are the strongest argument for adopting it: 156 rows carry
real ja/zh-Hans/zh-Hant/ko names, and the site renders four non-English
languages today with no localised sector vocabulary at all.

## Open questions for the API team

1. Is `subId` the intended equivalent of our `sector_type`, and is there a
   name for each of the 22 groups? Only the id is published.
2. Are the duplicate names (`Clinical Trials` 80/247) two real classifications
   or a data-entry artefact?
3. Are the sector ids on `/api/Companies/{id}/full` → `sectors[]` drawn from
   this same list? They appear to be — company 82's id 211 is
   `Aerospace & Defence` in both — but that has been assumed before and been
   wrong, so it is worth a yes.
