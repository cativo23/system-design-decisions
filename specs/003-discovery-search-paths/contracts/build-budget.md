# Contract: Build Output, Budgets and Headers (amendments)

Amends [002 build-budget.md](../../002-design-system-card-layout/contracts/build-budget.md).
Anything not listed here is unchanged. Estimates and their basis:
[research.md R8](../research.md#r8-performance-budget-constitution-vi).

## Per-page budgets

| Budget | Phase 2 | Phase 3 |
|---|---|---|
| JavaScript, gzipped (inline + same-origin scripts + every imported chunk, **dynamic `import()` included**) | ≤ 12 KB | ≤ 12 KB (unchanged; measured 11.1 KB on the Saga page) |
| CSS, gzipped | ≤ 8 KB | ≤ 8 KB |
| Fonts (woff2) | ≤ 110 KB | ≤ 110 KB |
| HTML, raw | ≤ 50 KB | ≤ 50 KB |
| Whole page, gzipped | ≤ 150 KB | ≤ 150 KB |
| Other-origin resources | 0 | 0 |

`scripts/check-build.ts` follows `import(` as well as static `from`, with single, double **and
backtick** quotes (the bundler writes `import(\`./x.js\`)`; backticks were added with a test
because the palette chunk was silently not counted before). The palette chunk loaded at idle is
therefore counted against every page that loads `shell.ts`, which is every shell page. The real
total was under 12 KB, so the constant stayed at 12 KB; the numbers are in research.md R8.
Changing a constant needs the reason in plan.md (constitution VI).

## New: search index

| Budget | Limit |
|---|---|
| `dist/search-index.json`, gzipped level 6 | ≤ 12 KB |
| It parses as JSON with `version` 1 and `entries` an array | required |
| Every `entries[].href` exists in `dist/` | required |

A failure prints `✗ search-index.json: <what> …` and exits 1, like the page checks.

## Structure checks

Unchanged six checks, with one change: **the root `index.html` is no longer exempt from checks
3 and 4** (skip link, landmarks). One addition for every shell page: the search trigger is a
`<button>` that is not `aria-disabled`, and the `<dialog id="palette">` exists exactly once.

## nginx

No change. `/search-index.json` falls under the server-level `X-Robots-Tag` and `gzip_types`
already covers `application/json`.

## Health gate

One more request per round, after the font request:

5. `GET /search-index.json` → `200`, `X-Robots-Tag` contains `noindex`, body parses as JSON
   with `version` 1 and an `entries` array (a new pure case `search-index` in
   `checkResponse`). Same timeouts, retries and no-redirect rules.

The Saga card check on `/cards/saga/` stays. The `/` check changes only in that the page now
also contains the link to `/path/` (asserted loosely: an `<a href="/path/">`), proving the new
home was deployed and not the Phase 1 index.
