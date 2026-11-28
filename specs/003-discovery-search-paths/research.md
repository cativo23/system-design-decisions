# Research: Discovery (search, catalog, learning path, radar, home)

Decisions for [plan.md](plan.md). Each entry: decision, rationale, alternatives. Items not
verified are listed in R10 with their fallback.

## R1. Search engine: no Pagefind

**Decision**: no search library. `dist/search-index.json` is generated at build time and an
in-house matcher ([R4](#r4-the-matcher-rules)) searches it in the browser.

**Evidence (measured 2026-11-27, scratch project outside the repo)**: Pagefind (npm `pagefind`,
default config) indexed one HTML page shaped like the Saga card (title, two aliases, three
tags). Queries run through its browser API against a local static server:

| Query | Results |
|---|---|
| `saga` | 1 |
| `sag` (prefix) | 1 |
| `transac` (prefix) | 1 |
| `distributed transaction` (alias, stemmed) | 1 |
| `sga` | **0** |
| `distribtued` | **0** |
| `consitency` | **0** |

So Pagefind does prefix and stemming but no typo tolerance. FR-003 and SC-002 require typo
tolerance (`sga` is the minimum case). Its output for that one page was 660 KB on disk,
including optional UI bundles; the parts a custom palette would load are `pagefind.js` (47,228
bytes raw) and one wasm file (59,758 or 55,386 bytes raw), fetched at first search, plus index
fragments on demand. The spec only searches titles, aliases and tags (a few thousand characters
in total), not card bodies.

**Rationale**: the corpus is at most about 85 short entries; a single JSON file fits in a few
KB gzipped, is loaded once, and makes "works after the network is lost" trivially true (R3).
Constitution VIII (smallest viable solution) and the typo requirement both point the same way.

**Alternatives**:
- *Pagefind plus a typo layer*: two engines, more weight, the layer would need its own tests anyway.
- *Pagefind and drop typo tolerance*: changes the approved spec.
- *Fuse.js or similar*: a dependency for about 60 lines of tested code; it also ranks by its own rules, which we would then have to test around.
- *Pagefind later*: if full-text search over card bodies is ever wanted, it can be added in its own phase next to this index. Nothing here blocks it.

**Docs to amend in the implementation phase**: `docs/DESIGN.md` §6 "Search" row and the
`docs/PHASES.md` Phase 3 "Plan notes" line.

## R2. The palette: dialog, script and idle loading

**Decision**: the palette is a native `<dialog>` rendered by `SearchDialog.astro` inside every
shell page. `shell.ts` binds the shortcuts once. The behaviour lives in `src/scripts/palette.ts`,
a separate chunk that `shell.ts` loads with `import()` inside `requestIdleCallback` (fallback:
`setTimeout` of 200 ms where unsupported), and also loads on the first shortcut or click if idle
has not fired yet.

- `<dialog>` opened with `showModal()` gives the focus trap, Esc to close, an inert background
  and `aria-modal` semantics without custom code (FR-005). Focus is restored by remembering
  `document.activeElement` before opening.
- Opening before the chunk or the JSON has arrived shows a visible "Loading…" line in the
  dialog (FR-006); a failed load shows "Search is unavailable. Check your connection." and the
  dialog still closes with Esc.
- Results and every string are built with `createElement` and `textContent` (constitution:
  safe rendering). No `innerHTML`, no `set:html`.
- The dialog closes on `astro:before-swap` so a result that navigates leaves no open modal;
  the existing `focusTitle()` then places focus on the new page's title.

**Why not a framework island**: DESIGN §6 lists the palette as a React island with
`client:idle`. React was deferred in Phase 1 (approved) and `client:idle` is a directive for
framework components. The same *behaviour* (load when the browser is idle) is kept in plain
TypeScript. Fallback if Carlos wants React back: add `@astrojs/react` and port `palette.ts`.

**Alternatives**: `<div role="dialog">` with a hand-written focus trap (more code, more bugs,
the `inert` handling already exists only for the phone menu); loading the script eagerly in
`shell.ts` (adds the matcher to the first-load budget for readers who never search).

## R3. Offline: one preloaded file, no service worker

**Decision**: at idle the palette chunk fetches `/search-index.json` and keeps the parsed
entries in memory. Client-side navigation (`<ClientRouter />`) does not reload the module, so
the entries stay available across pages. No service worker.

- SC-004 ("network disconnected after load") holds once the idle fetch has finished, which on
  a normal connection is within a second or two. If the reader is already offline when the page
  first loads and the file is not in the browser cache, search shows the error state (above)
  instead of failing silently. That is the honest limit of "no service worker".
- A full reload while offline works only if the browser still has the page and the JSON in its
  HTTP cache. This is not promised by the spec and is not tested.

**Alternatives**: a service worker (precache, offline reload) is real machinery for a
guarantee the spec does not ask for (YAGNI); inlining the JSON into every page would add its
size to every page's HTML budget.

## R4. The matcher rules

Pure functions in `src/lib/discovery/match.ts`, written test-first. The rules (fixed here so
tests can be written before code):

1. **Normalise** query and fields: lower-case, remove diacritics (NFD, strip combining marks),
   split on anything that is not a letter or digit. Regex or markup characters are therefore
   plain separators (edge case: plain text only).
2. **Tokens** of the query must **all** match (AND). Each query token matches an entry when it
   matches a word of the title, an alias or a tag, in one of three ways, best first:
   exact word; prefix of a word; within the typo limit of a word or of the same-length prefix of
   a word (so `distribt` still matches `distributed` while typing).
3. **Typo limit** by token length: 1–2 characters: 0; 3–7: 1; 8 or more: 2. Distance is the
   optimal-string-alignment distance (insert, delete, substitute, swap of adjacent letters), so
   `sga` → `saga` is 1 and `distribtued` → `distributed` is 1.
4. **Score**: per token, field weight (title 3, alias 2, tag 1) times match quality (exact 3,
   prefix 2, typo 1). The entry's score is the sum. A tag or alias match with the best token
   score still lists the entry once.
5. **Order**: score descending, then title ascending (stable and reproducible).
6. **Empty query**: no results and a prompt line ("Type to search titles, aliases and tags").
7. **Limit**: show the top 8 results; the keyboard cursor wraps (ArrowDown on the last goes to the first).

SC-002's test iterates every published card's title, each alias and each tag and asserts the
card is in the top 3. A fixed misspelling set also passes, and is the minimum SC-002 names:
`sga` → Saga, `sagaa` → Saga, `distribtued transactions` → Saga, `consitency` → Saga,
`microservces` (against its title once that card exists, using a fixture today).

**Limits stated**: typos in the first letter or more than the limit are not found; very short
tokens (1–2 letters) match exact or by prefix only. This is deliberate: looser matching returns
noise on a corpus this small.

## R5. Reaching the new pages: top-bar links

**Decision**: the top bar gets a `nav aria-label="Primary"` with three links: `catalog`,
`path`, `radar`. At ≤ 880 px they move to the top of the phone menu (tree drawer), above the
tree, as a second small list, so the top bar does not overflow at 320 px (FR-017).

**Why**: the spec lists the pages but nowhere says how a reader on a card gets to the catalog,
the path or the radar; the home only links the path and the domains. Three text links are the
smallest fix. The palette searches cards only (FR-003), so it cannot be the route.

**Alternatives**: put the links in the tree's root line (hidden when the tree is closed on
phones anyway); add a footer (new shell region); leave them unreachable (fails FR-008..FR-011).
The brand link already goes home.

## R6. One source of truth for path order

**Decision**: the learning-path order of every entry (published or not) is its position in
`docs/TOPICS.md`: domain order, then list order inside the domain. This is what the tree and
the pager already do (`buildTree`, `Pager.astro`). A new cross-card rule, `order-matches-topics`,
fails validation when a published card's frontmatter `order` differs from its 1-based position
within its domain in the topic list (the Saga card has `order: 3` and is third in domain 05, so
it passes today). `order` stays in the schema; the rule keeps it from drifting.

**Why**: the Phase 2 home sorted by `order`, the tree by list position; both could silently
disagree once 41 cards exist. SC-005 ("exactly once, in path order") needs one answer.

**Alternatives**: delete `order` from cards (a card-format change, out of scope); trust authors
(constitution II forbids relying on memory).

## R7. Pages, shell and status line

- **Shell reuse**: `Shell.astro` keeps one layout. `card` becomes optional; a `kind` prop
  (`card` | `home` | `catalog` | `domain` | `path` | `radar`) decides two things: the table of
  contents column is rendered only for `card` (the other pages use the wider reading column),
  and the status line fields come from `status-fields.ts`.
- **Status line** (clarified): `card` keeps today's fields. Other kinds show the mode label
  (`home`, `catalog`, `path`, `radar`; domain pages use `catalog`), the domain (`NN slug`) only
  on domain pages, and the scroll position. File, radar status and `domain read/total` are
  omitted.
- **Tree**: on domain pages the matching domain is opened; on other pages no domain is forced
  open and the reader's own open/closed state stays (FR-022). `treeCurrent` already returns
  null for non-card paths, so no card is marked.
- **Persisted tree and shortcuts**: the tree stays `transition:persist`. Shortcut listeners are
  delegated on `document` and bound once (same pattern as the phone menu), so no page needs to
  re-bind them (FR-022, SC-012).
- **Home**: a hero (one sentence of what and for whom, one of how it is organised), two entry
  points (a link to `/path/`, and a button that opens the palette), 13 `DomainTile`s with
  published/total as text and a bar from the existing `domainMeter`, and the freshness strip.
  Hero copy is written during implementation and reviewed by Carlos.
- **No script**: the palette button is rendered `hidden` until `html[data-js]` exists (the
  attribute shell.ts already sets), as the phone menu button does, so with scripts blocked the
  home shows one working entry point instead of a dead button (SC-010).

## R8. Performance budget (constitution VI)

Baseline from Phase 2 (Saga page, measured): JS 7.1 KB, CSS 5.6 KB, fonts 101.9 KB, page 123 KB.

Estimates for the new work, to be replaced by real numbers (`check:build --report`) when
implemented, as Phase 2's R11 did:

| Piece | Estimate (gzipped) | Basis |
|---|---|---|
| matcher (normalise, OSA distance, rank) | 1–1.5 KB | about 60 lines |
| palette script (dialog, fetch, render with text APIs, cursor) | 2–3 KB | about 120 lines |
| shortcuts, `j`/`k`, idle loader in `shell.ts` | about 1 KB | about 40 lines |
| **Added JS** | **4–5.5 KB** | → page JS about 11.5–12.5 KB |

That is at or just over the old 12 KB, so the budget is set at **18 KB** with headroom rather
than squeezing the code now (decision 3). If the measured total is under 12 KB the budget
returns to 12 KB in the same task, with the number recorded here.

Search index: each entry is about 150–300 bytes of JSON (title, up to a few aliases and tags,
domain name, status, URL). 85 entries is about 25 KB raw, which gzips well because field names
repeat; the limit is **12 KB gzipped**, checked in `check:build`, plus a unit test on entry size.
Only published cards enter the index, so today it holds one entry.

Pages: the learning path lists 83 rows next to the tree's 83; estimated HTML 25–35 KB raw
against the 50 KB limit. Measured in implementation.

## R9. Test strategy

Pure first (red, then green), in `tests/unit/`:

| Module | Behaviours covered |
|---|---|
| `match` | normalisation, AND tokens, exact/prefix/typo tiers and limits by length, scoring and order, empty and symbol-only queries, SC-002 over fixtures, the misspelling set |
| `catalog` | domain order, counts, entry states, path order from the topic list, orphan topics, a domain with zero cards |
| `search-index` | only published cards, fields, size guard, deterministic output |
| `radar` | fixed group order, empty groups present, each card once, domain and reviewed month carried |
| `freshness` | top 5, month then title, fewer than 5, tie handling |
| `keys` | `/` ignored in inputs, textareas, selects and contenteditable; `⌘K`/`Ctrl+K` always; modifier combos left alone; `j`/`k` next/previous from the highlighted section, at ends, inert when palette is open |
| `palette-state` | closed → loading → ready/error → closed, cursor wrap, Enter on no result |
| `status-fields` | fields per page kind |
| `rules` | `order-matches-topics` fails on a fixture |
| `check-build`, `health-gate` | index budget, home no longer exempt, search-index request |

Not unit-tested (DOM glue, exempt as in Phase 2): `palette.ts` rendering, `shell.ts` listeners,
`.astro` markup. They are covered by `check:build` structure checks and by the manual run in
[quickstart.md](quickstart.md): keyboard-only open/search/open/close, focus return, offline
(devtools "Offline" after load), 320 px width, scripts blocked, reduced motion.

## R10. Not verified, with fallbacks

| Item | State | Fallback |
|---|---|---|
| Palette chunk size (estimate 4–5.5 KB gz added) | estimated | Budget is 18 KB; if over, drop the loader fallback paths first, then simplify result rendering |
| `requestIdleCallback` in Safari | not available in Safari (as far as I know) | `setTimeout` fallback is in the design (R2); verify in a Safari run if the owner has one |
| `<dialog>` `showModal()` focus restore | the plan restores focus by hand, so it does not depend on browser behaviour | n/a |
| Typo matching quality on real content | rules proven on one card and fixtures only; 41 MVP cards arrive in Phase 7 | the SC-002 test runs over the real collection in CI, so a new card that breaks it fails the build |
| Slow 4G run | Phase 2 could not apply the devtools throttling preset | same limit; broadband numbers recorded |
