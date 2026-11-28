---
description: "Task list for the Discovery feature (search, catalog, learning path, radar, home)"
---

# Tasks: Discovery (search, catalog, learning path, radar, home)

**Input**: Design documents from `specs/003-discovery-search-paths/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: REQUIRED for all logic (constitution VII, non-negotiable). Every test task MUST be
written and **seen to fail for the right reason** before its implementation task. Presentational
markup (Astro components, CSS, DOM glue in `src/scripts/`, nginx) is exempt from unit tests and
is verified with the [quickstart](quickstart.md) section named in the task.

**Organization**: by user story (US1–US6 from spec.md), after a short foundational phase. US1
(palette) and US2 (home) are both P1; US1 comes first because it needs nothing from the catalog.
No new package is installed by this feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6
- Paths are repo-relative (single project, plan.md § Project Structure)
- "data-model.md `Entity.field`" is the canonical definition of a constrained field; tasks cite it instead of repeating it

---

## Phase 1: Setup

**Purpose**: confirm a green baseline and create the shared test data.

- [X] T001 Run `npm ci`, `npm test`, `npm run lint`, `npm run validate`, `npm run build` and `npm run check:build` on the branch. All must pass before any change. Note the test count (373 at Phase 2 close) and save `dist/cards/saga/index.html` aside outside the repo (scratchpad) for the T009 comparison.
- [X] T002 [P] Create `tests/helpers/discovery-fixtures.ts` exporting sample `TopicEntry[]` and card records (not files): 5 published cards over 3 domains, all four radar statuses used, two cards sharing a `reviewed` month, one domain with zero published cards, and one published card whose topic-list `state` is `drafting` (as Saga today). Shapes follow data-model.md § Inputs.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the catalog module, the status line per page kind, the order rule, and a shell that can host pages that are not cards.

**⚠️ CRITICAL**: no user story starts until this phase is done.

- [X] T003 [P] Write `tests/unit/status-fields.test.ts` for `statusFields(kind, context)` (data-model.md `StatusFields`, `PageKind`): `card` keeps `READ`, domain, file, status, progress; `domain` returns mode `catalog` and the domain only; `home`, `catalog`, `path`, `radar` return only their mode label. Run it and see it fail because the module does not exist.
- [X] T004 [P] Implement `src/lib/discovery/status-fields.ts` until T003 is green, per data-model.md `StatusFields.mode`, `StatusFields.domain`, `StatusFields.file`, `StatusFields.status` and `StatusFields.progress` (omitted fields stay absent, not empty).
- [X] T005 [P] Write `tests/unit/catalog.test.ts` for `buildCatalog(topics, publishedCards)` using T002 fixtures: domain order 1–13; each topic once (data-model.md `DomainSummary.entries`); `CatalogEntry.published` comes from the cards, not the topic `state`; `CatalogEntry.status`, `CatalogEntry.reviewed` and `CatalogEntry.href` are `null` when unpublished (FR-009); `CatalogEntry.position` and the path order follow topic-list order (R6); `DomainSummary.published`, `DomainSummary.total` and `DomainSummary.meter` (via `domainMeter`) match counts, with a zero-published domain giving `0 / N` (FR-014); an invariant test that the concatenated path has every topic exactly once (SC-005, SC-006). See them fail.
- [X] T006 [P] Implement `src/lib/discovery/catalog.ts` until T005 is green, per data-model.md `CatalogEntry.published`, `CatalogEntry.status`, `CatalogEntry.reviewed`, `CatalogEntry.href`, `CatalogEntry.position`, `DomainSummary.published`, `DomainSummary.total` and `DomainSummary.meter`. Reuse `DOMAINS` and `domainMeter`; do not duplicate them. Also export a small `toPublished(collectionEntries)` mapper (card data → the shape `buildCatalog` takes) so no page repeats it.
- [X] T007 [P] Add the failing case for the `order-matches-topics` rule (data-model.md § Validation rule added): a fixture card `tests/fixtures/broken/cards/order-mismatch.mdx` whose `order` differs from its topic-list position (with its entry in `tests/fixtures/broken/TOPICS.md`), and a test in `tests/unit/cross-card-rules.test.ts` that expects the failure naming the card, both numbers and the topic-list line. See it fail.
- [X] T008 Implement `order-matches-topics` in `src/lib/cards/rules.ts` and run it from `scripts/validate-cards.ts` so `npm run validate` reports it. Confirm the real Saga card still passes (`order: 3`, third in domain 05).
- [X] T009 Refactor `src/layouts/Shell.astro` and `src/components/StatusLine.astro` (no unit test, DOM markup; quickstart §4 and §6): `card` prop becomes optional; add a `kind` prop (`PageKind`); render `Toc` and its grid column only for `card` (keep the existing `grid-template-columns: 16.25rem minmax(0, 1fr) 13.125rem` rule for cards, which `tests/unit/font-units.test.ts` asserts; give the other kinds a separate two-column rule); feed `StatusLine` from `statusFields`; leave the persisted tree's open/closed state alone on non-card pages and open only the matching domain on `domain` pages. `src/pages/cards/[id].astro` passes `kind="card"`. Verify the Saga page is unchanged: rebuild and diff `dist/cards/saga/index.html` against the file saved in T001 (only asset hashes may differ).

**Checkpoint**: `npm test`, `npm run lint`, `npm run validate`, `npm run build`, `npm run check:build` green; Saga page identical. Show Carlos.

---

## Phase 3: User Story 1 - Find any card in seconds (P1) 🎯 MVP

**Goal**: the palette, from any page, by keyboard or the top-bar button, with typo-tolerant matching and a loading/empty/error state, working offline after load.

**Independent Test**: quickstart §5 and §8.

- [X] T010 [P] [US1] Write `tests/unit/search-index.test.ts` for `buildSearchIndex(publishedCards)` (data-model.md `SearchEntry.id`, `.title`, `.aliases`, `.tags`, `.domain` (domain **name**), `.status`, `.href`; contracts/search-index.md): only published cards; deterministic order and bytes for the same input; `version: 1`; empty input gives `entries: []`; a size guard test that 85 generated entries stay ≤ 12 KB gzipped. See it fail.
- [X] T011 [P] [US1] Write `tests/unit/match.test.ts` for `search(entries, query, limit)` (research.md R4, contracts/search-index.md § Matcher): normalisation (case, diacritics, symbols as separators); AND over tokens; exact, prefix and typo tiers; typo limits 0/1/2 by length 1–2/3–7/8+ with optimal-string-alignment distance (`sga`→`saga` is 1); same-length-prefix typo match (`distribt`); field weights and order (score, then title); empty query returns `[]`; `(`, `[a-`, `<b>` do not throw; default limit 8. Add the SC-002 test over the T002 fixtures (title, every alias, every tag in the top 3) and the misspelling set (`sga`, `sagaa`, `distribtued transactions`, `consitency` → Saga; `microservces` → a fixture microservices card). Add a loose speed bound (SC-003): one search over 85 generated entries finishes well under 100 ms (assert < 25 ms, run three times and take the best, to avoid flakiness). See it fail.
- [X] T012 [P] [US1] Write `tests/unit/keys.test.ts` for `shouldOpenPalette(key event fields, active element info)` (contracts/ui-contract.md § Shortcuts): `Ctrl+K` and `⌘K` open even inside an input; `/` opens only when focus is not in `input`, `textarea`, `select` or `contenteditable` and no modifier is held; other modifier combinations return false. See it fail.
- [X] T013 [P] [US1] Write `tests/unit/palette-state.test.ts` for `nextPaletteState(state, event)` and `moveCursor(cursor, count, direction)` (data-model.md `PaletteState`): closed→loading when the index is not ready, closed→ready when it is, loading→ready or error, any→closed; `moveCursor` wraps both ways and returns `-1` when `count` is 0; Enter with cursor `-1` yields no navigation; a long alternating open/close/open/close sequence always ends in a consistent state (edge case: no half-open palette). See it fail.
- [X] T014 [US1] Implement `src/lib/discovery/search-index.ts` until T010 is green, per data-model.md `SearchEntry.id`, `SearchEntry.title`, `SearchEntry.aliases`, `SearchEntry.tags`, `SearchEntry.domain` (domain name, not slug), `SearchEntry.status` and `SearchEntry.href`.
- [X] T015 [US1] Implement `src/lib/discovery/match.ts` until T011 is green. Refactor only while green.
- [X] T016 [P] [US1] Implement `shouldOpenPalette` in `src/lib/discovery/keys.ts` until T012 is green.
- [X] T017 [P] [US1] Implement `src/lib/discovery/palette-state.ts` until T013 is green, per data-model.md `PaletteState.state` and `PaletteState.cursor` (`-1` when there are no results).
- [X] T018 [US1] Add the static endpoint `src/pages/search-index.json.ts` (official Astro endpoint: exported `GET` returning `Response.json`) using `buildSearchIndex` over the cards collection. Run `npm run build` and check `dist/search-index.json` holds the Saga entry and is under 12 KB gzipped.
- [X] T019 [US1] Add `tests/integration/search-collection.test.ts`: read the real cards in `src/content/cards/` with `parseCard`, build the index, and assert the SC-002 property for every real published card (title, each alias, each tag in the top 3). It must pass now and fails the build when a future card breaks it.
- [X] T020 [P] [US1] Create `src/components/SearchDialog.astro`: the `<dialog id="palette">` markup of contracts/ui-contract.md § Palette (labelled title, `role="combobox"` input with its aria attributes, `role="listbox"` list, `role="status"` line). Include it once in `Shell.astro`. No script logic here.
- [X] T021 [US1] Update `src/components/TopBar.astro` (FR-001): the search trigger becomes a real button named "Search" with `/` and `⌘K`/`Ctrl+K` `<kbd>` hints, hidden until `html[data-js]` exists; remove the `aria-disabled` and the "not available yet" label and the Phase 2 comment.
- [X] T022 [US1] Extend `tests/unit/contrast.test.ts` with the foreground/background pairs the palette and kbd hints will use (existing tokens only) and see whether any fails; if one does, fix the choice of token, not the threshold (FR-019).
- [X] T023 [P] [US1] Create `src/styles/discovery.css` with the palette styles (dialog, `::backdrop`, input, rows, radar badge reuse, status line, kbd) using existing tokens, a short opacity fade removed under `prefers-reduced-motion: reduce`, 44 px targets at ≤ 880 px, and no use of `hidden` to hide the dialog. Import it from `Shell.astro`.
- [X] T024 [US1] Create `src/scripts/palette.ts` (DOM glue; text APIs only, no `innerHTML`): fetch `/search-index.json` once and keep it in memory (R3), render results with `createElement`/`textContent` (title, domain name, radar badge, FR-004), wire `nextPaletteState`, `moveCursor` and `search`, handle the loading, empty-hint, no-match and error lines, close on Esc and backdrop click, restore focus to the previously focused element, follow the highlighted result with Enter or click. `Shell` re-renders the `<dialog>` on every router navigation, so look every element up when the palette opens and never cache a reference from the first load (FR-022).
- [X] T025 [US1] Update `src/scripts/shell.ts`: delegated `keydown` on `document`, bound once, calling `shouldOpenPalette` and opening the dialog; click on the trigger; the idle loader (`requestIdleCallback`, `setTimeout` 200 ms fallback) that `import('./palette.ts')`, also triggered by the first open; close the dialog on `astro:before-swap`. Keep every existing behaviour untouched.
- [X] T026 [P] [US1] Extend `tests/unit/check-build.test.ts` (red first) with the new structure checks of contracts/build-budget.md § Structure checks: every shell page has a search trigger that is a `<button>` without `aria-disabled`, and exactly one `<dialog id="palette">`. A "shell page" is any HTML file containing `<header class="topbar">`; the Phase 1 `index.html` has none, so these two checks skip it until T032 replaces it (the home exemption itself is removed in T034). See it fail.
- [X] T027 [US1] Implement those two checks in `scripts/check-build.ts` until T026 is green, then run `npm run build && npm run check:build` (the existing JS budget of 12 KB may fail here; if so, do **not** raise it yet, T055 owns the budget). **Result:** the 12 KB budget holds with the palette: the Saga page measures 10,939 B of JS. The checker was not counting the palette chunk until its import regex learned backticks (new test); so the 18 KB in the plan is not needed and T055 returns the number to 12 KB.
- [X] T028 [US1] Run quickstart §5 and §8 in a browser and record the result under the task (palette by keyboard, misspelled queries, no-match line, offline after load, cold-offline error line). **Result (Chrome, preview build):** Ctrl+K and `/` open it with the field focused; `sga`, `consitency` and the alias `distributed transactions` find Saga with domain and ADOPT; no-match line and hint line show; one `Esc` closes it and focus returns; Enter navigates through the router, closes the dialog and focuses the title; the shortcut still works afterwards; with the preview server stopped (curl error 7) search with a typo still returned Saga. Found and fixed in this task: the palette kept the previous query on reopen, and the first `Esc` only cleared a search field's text. **Not covered in a browser:** the cold-offline error line (a stopped server cannot serve the page to reload), and `/` inside a text field (unit-tested in `keys.test.ts`).

**Checkpoint**: palette works from every page; quickstart §5 and §8 pass. Show Carlos.

---

## Phase 4: User Story 2 - Home page (P1)

**Goal**: the root replaces the Phase 1 index with hero, two entry points, 13 domain tiles and the freshness strip.

**Independent Test**: quickstart §4 (home part) and §9.

- [X] T029 [P] [US2] Write `tests/unit/freshness.test.ts` for `freshness(publishedCards)` (data-model.md `FreshnessItem.reviewed`, `FreshnessItem.title`, `FreshnessItem.status`): at most 5; `reviewed` descending then `title` ascending; fewer than 5 returns all; empty returns `[]`; each item carries its current status; no history fields. See it fail.
- [X] T030 [US2] Implement `src/lib/discovery/freshness.ts` until T029 is green, per data-model.md `FreshnessItem.reviewed` (sort key, `YYYY-MM` string order), `FreshnessItem.title` (tie-break) and `FreshnessItem.status`; cut to 5.
- [X] T031 [P] [US2] Create `src/components/DomainTile.astro`: domain number and name, `published / total` text and the `domainMeter` bar (data-model.md `DomainSummary.meter`), link to `/catalog/<slug>/`; reads as `0 / N` and stays linked when empty.
- [X] T032 [US2] Replace `src/pages/index.astro` with the home in `Shell` (`kind="home"`): hero (what and who, two short sentences; **draft copy for Carlos to approve**), entry point 1 a link to `/path/`, entry point 2 a button that opens the palette (hidden until `html[data-js]`, R7), the 13 tiles in order from `buildCatalog`, and the freshness strip from `freshness`. Add the home styles to `src/styles/discovery.css`. Remove the old Phase 1 list.
- [X] T033 [P] [US2] Extend `tests/unit/check-build.test.ts` (red first): the root `index.html` is no longer exempt from checks 3 and 4 (contracts/build-budget.md § Structure checks). See it fail against the old exemption.
- [X] T034 [US2] Remove the `index` exemption in `scripts/check-build.ts` and its CLI plumbing until T033 is green; run `npm run check:build` on the new home.
- [X] T035 [P] [US2] Extend `tests/unit/health-gate.test.ts` (red first): the `index` kind also requires an `<a href="/path/">` (contracts/build-budget.md § Health gate). See it fail.
- [X] T036 [US2] Implement it in `scripts/health-gate.ts` until T035 is green.
- [X] T037 [US2] Run quickstart §4 (home) and §9 (320 px, scripts blocked, reduced motion) for `/`, and record the result. Domain tile links 404 until Phase 5; note it and continue. **Result (Chrome, preview build):** the home shows the hero, both entry points, 13 tiles with `published / total` (Saga's domain reads `1 / 6`) and the freshness strip with Saga and ADOPT; one `<h1>`; `/path/` is the start link. With `data-js` removed (proxy for scripts blocked) the top-bar trigger and the search button are hidden and the start link remains. At a 320 px frame the page measures 319 px wide, the same as the Saga page (Phase 2), so it fits with overlay scrollbars; with a 15 px classic scrollbar both overflow by 14 px (pre-existing, not from this phase). Found and fixed in this task: tile names did not align because each tile sized its own number column. Tile and `/path/` links 404 until Phases 5–6. **Budget watch:** the home HTML is 32 KB of the 50 KB limit and card pages' CSS is 6.8 KB of 8 KB, so the path page (83 rows next to the tree) and the remaining styles need measuring when they land.

**Checkpoint**: home renders in the shell and passes the structure checks. Show Carlos, including the hero copy.

---

## Phase 5: User Story 3 - Browse by domain (P2)

**Goal**: the catalog of 13 domains and one page per domain, in path order, with published and unwritten states.

**Independent Test**: quickstart §4 (catalog and domain part).

- [X] T038 [P] [US3] Create `src/components/EntryList.astro`: rows of contracts/ui-contract.md § Entry rows (published: link plus radar badge; unpublished: dimmed text, no link, no badge, hidden "not yet available"), driven by `CatalogEntry.published`, `.status` and `.href` (data-model.md `CatalogEntry`).
- [X] T039 [US3] Create `src/pages/catalog/index.astro` (`kind="catalog"`): all 13 domains in order, each with `DomainSummary.published` / `.total` and a link to its page (reuse `DomainTile`).
- [X] T040 [US3] Create `src/pages/catalog/[domain].astro` (`kind="domain"`, `getStaticPaths` over the 13 `DOMAINS`): the domain's `entries` in `position` order through `EntryList`; the matching tree domain opens (Shell behaviour from T009).
- [X] T041 [US3] Run quickstart §4 for `/catalog/` and `/catalog/distributed-data/` and §6 (shell stays put when moving home → catalog → domain → card): record it. Re-run `npm run check:build`. **Result (Chrome, preview build):** `/catalog/distributed-data/` lists its 6 entries in topic-list order (Saga with ADOPT as the only link, the other five dimmed with a hidden "not yet available" and no link), says `1 / 6 cards published`, shows `catalog | 05 distributed-data` in the status line and opens its own tree domain. Moving home → `/catalog/` → `/catalog/storage/` → the Saga card → home by router links kept the same tree node, its scroll position (220 px with all 13 domains open) and the open domains (a domain page opens its own and the reader's others stay open), the status line changed per page kind, and there was always exactly one palette dialog; Ctrl+K still opened it afterwards. `check:build`: 16 pages within budget; Saga CSS 6.9 KB of 8, catalog pages about 29–32 KB of HTML. Added `src/lib/discovery/load.ts` so no page repeats the topic and card loading.

**Checkpoint**: Show Carlos.

---

## Phase 6: User Story 4 - Learning path (P2)

**Goal**: the recommended order across all domains with a start point at the first published card.

**Independent Test**: quickstart §4 (path part).

- [X] T042 [P] [US4] Add to `tests/unit/catalog.test.ts` (red first) tests for `startPoint(catalog)`: returns the first published entry in path order; `null` when none is published. See them fail.
- [X] T043 [US4] Implement `startPoint` in `src/lib/discovery/catalog.ts` until T042 is green.
- [X] T044 [US4] Create `src/pages/path.astro` (`kind="path"`): every domain heading and its entries in path order through `EntryList`, and the start link "Start with <title>" (plain text saying none is available yet when `startPoint` is `null`). Link the home entry point (T032) to this page.
- [X] T045 [US4] Run quickstart §4 for `/path/` (each topic once, start link opens Saga) and record it. **Result (Chrome, preview build):** `/path/` has 13 domain sections and 83 rows with 83 unique titles, so every topic appears exactly once (SC-005); Foundations first, Reference architectures last; Saga is the only link and the start link reads "Start with Saga" and opens `/cards/saga/` through the router with focus on the title; status line mode is `path`; one `<h1>`. `check:build`: 17 pages within budget; the path page is 44,943 B of HTML (limit 51,200), the tightest page so far, and Saga's CSS is 7,024 B of 8,192. The introduction said "marked not yet available" while the rows are only dimmed, so the wording now says dimmed.

**Checkpoint**: Show Carlos.

---

## Phase 7: User Story 5 - Radar (P3)

**Goal**: published cards grouped by adopt, trial, assess, hold.

**Independent Test**: quickstart §4 (radar part).

- [X] T046 [P] [US5] Write `tests/unit/radar.test.ts` for `radarGroups(publishedCards)` (data-model.md `RadarGroup.status`, `RadarGroup.cards`): always four groups in the order adopt, trial, assess, hold; an empty group is present with `cards: []`; each card appears in exactly one group; cards inside a group are in path order and carry domain name and `reviewed`. See it fail.
- [X] T047 [US5] Implement `src/lib/discovery/radar.ts` until T046 is green, per data-model.md `RadarGroup.status` (fixed order adopt, trial, assess, hold) and `RadarGroup.cards` (may be empty).
- [X] T048 [US5] Create `src/pages/radar.astro` (`kind="radar"`): the four groups with a heading each, cards as links with domain and reviewed month, and an empty-state sentence in empty groups. Run quickstart §4 for `/radar/` and record it. **Result (Chrome, preview build):** four groups ADOPT, TRIAL, ASSESS, HOLD in that order with counts 1, 0, 0, 0; Saga sits under ADOPT with its domain and `reviewed 2026-11`; the three empty groups say "No published card is trial yet." and so on; status line mode `radar`; one `<h1>`. `radarGroups` takes the catalog (not the bare card list the task text said), because path order inside a group needs the topic-list order. I first wrote a one-line meaning under each status and removed it: the project defines no meaning for the four statuses (DESIGN only gives them colours) and the spec does not ask for any. `check:build`: 18 pages within budget.

**Checkpoint**: Show Carlos.

---

## Phase 8: User Story 6 - `j` and `k` (P3)

**Goal**: section keys on a card, relative to the section the TOC highlights.

**Independent Test**: quickstart §7.

- [X] T049 [P] [US6] Add to `tests/unit/keys.test.ts` (red first) tests for `adjacentSection(sectionIds, currentId, key)` and `shouldHandleSectionKey(...)` (contracts/ui-contract.md § Shortcuts): `j` returns the next id, `k` the previous; at the first and last section it returns the same id; with the page above the first heading (`currentId` is `null`) `j` goes to the first section and `k` stays; an unknown id behaves like `null`; at either end it returns `null` (stay put) rather than the same id, so the page does not nudge; `reachedSection(tops, line, atBottom, viewport)` decides the current section, counting what is on screen once the page cannot scroll further (added in this task, see its result); ignored when the palette is open, focus is in an editable field, a modifier is held, or the page is not a card. See them fail.
- [X] T050 [US6] Implement them in `src/lib/discovery/keys.ts` until T049 is green.
- [X] T051 [US6] Bind `j`/`k` in `src/scripts/shell.ts` using the TOC's currently highlighted link and `scrollIntoView` (`behavior: 'auto'` when `prefers-reduced-motion` is set, else `'smooth'`); add the shortcut hint (`j / k sections`, `/ search`) to `StatusLine.astro`, hidden on phones with the existing `hide-sm`.
- [X] T052 [US6] Run quickstart §7 and record it. **Result (Chrome, preview build, plus an 800 px iframe because the browser window is 1781 px tall):** from the top `j` goes to the first section; in the iframe ten quick `j` reach the end of the card, `k` steps back section by section (the first `k` at the very bottom cannot scroll further, the second moves to the previous section), `j` returns; after scrolling with the wheel into section 4, `k` goes to section 3; with the palette open `j` does nothing; with a textarea focused `j` does nothing; on `/catalog/` `j` does nothing. **Two bugs found and fixed here, both with a red test or a re-run first:** (1) three quick `j` moved only one section, because each press was measured while the smooth scroll was still on its way, so the target is now remembered until the reader uses the wheel, touch, a click or another key; (2) near the end of a card the last sections never reach the reading line (even at 800 px high, `related` and `deeper`), so `j` stuck before the end; `reachedSection` now counts what is on screen at the bottom of the page. **Decided by Carlos and fixed afterwards (extra, test first):** the table of contents highlight used to stop at an earlier section near the end of a card (Phase 2 behaviour, `READING_LINE` slack) while `j`/`k` reached the end. `currentSection` now takes an optional `{ viewport }` that applies at the bottom of the page and `lastOnScreen` is shared with `reachedSection`; in an 800 px iframe the highlight reads `problem` at the top, `trade-offs` in the middle, `go-deeper` at the bottom and `in-the-wild` 400 px above it. `check:build`: Saga JS 11,340 B of 12,288 (92 %).

**Checkpoint**: Show Carlos.

---

## Phase 9: Polish and cross-cutting

**Purpose**: reach the pages from a card, enforce the new budgets, fix the docs, run everything.

- [X] T053 Add the primary navigation (research.md R5): `nav aria-label="Primary"` with links `catalog`, `path`, `radar` in `src/components/TopBar.astro`; at ≤ 880 px the same links are the first block of the phone menu (extend `src/styles/shell.css` / `discovery.css`; reuse the existing menu open/close logic, no new state). Verify at 320 px with no horizontal scroll and 44 px targets. **Result (Chrome):** desktop shows `catalog path radar` after the brand with the current page marked (`path` on `/path/`) and the drawer copy hidden; in a 320 px frame the top bar links are hidden, the menu button shows, the open drawer lists the three links at 44 px each, tapping `path` navigates and closes the menu; all six page kinds measure 319–320 px wide, so they fit a 320 px viewport. The drawer copy carries no current-page mark because the tree persists across pages and would show a stale one. `check:build`: Saga CSS 7,236 B of 8,192; path HTML 45,417 B of 51,200.
- [X] T054 [P] Extend `tests/unit/check-build.test.ts` (red first) for the search-index budget (contracts/build-budget.md § New: search index): gzipped size ≤ 12 KB, parses with `version` 1 and an `entries` array, every `entries[].href` exists in `dist/`. (The JS-budget constant test dropped out: the budget stays 12 KB, see T055.) See them fail.
- [X] T055 Implement the index checks and set `BUDGETS.js` in `scripts/check-build.ts` until T054 is green. Run `npm run build && npm run check:build -- --report`, record the real numbers in research.md R8, and if the measured JS is ≤ 12 KB put the constant back to 12 KB in this same task (contracts/build-budget.md). **Result:** the constant was never raised and stays 12 KB; measured Saga JS 11,378 B; `plan.md`, `contracts/build-budget.md` and `research.md` R8/R10 now carry the real numbers and the corrected decision 3. `check:build` also fails with "file missing" if `search-index.json` is absent from `dist/`.
- [X] T056 [P] Extend `tests/unit/health-gate.test.ts` (red first) with the `search-index` kind: 200, `X-Robots-Tag` noindex, body parses with `version` 1 and an `entries` array. See it fail.
- [X] T057 Implement the `search-index` kind and its CLI request in `scripts/health-gate.ts` until T056 is green. (Run against the container in T059.)
- [X] T058 [P] Amend `docs/DESIGN.md` §6 (Search row: build-time JSON index and in-house matcher, with the measured reason; Navigation row: palette note) and `docs/PHASES.md` Phase 3 "Plan notes" (no Pagefind, palette not a React island). Do not change statuses yet (T064). **Done:** DESIGN §6 (Interactivity, Navigation and Search rows) and a new decision D14, plus the Phase 3 plan note in PHASES.
- [X] T059 Run the whole [quickstart](quickstart.md) §1–§10, including the Docker run with a free port and a distinct container name (do not stop containers you did not start). Record results and any deviation under this task. Fix what fails, test-first when it is logic. **Results:** §1 `npm test` green (564). §2 `validate` reports `order-matches-topics` when Saga's `order` is changed to 4, and passes again when reverted. §3 `build` + `check:build` pass (18 pages and the index) and the `--report` numbers are recorded in research.md R8. §4 home, catalog, a domain, path and radar checked in Chrome (T037, T041, T045, T048). §5 palette by keyboard, typos, aliases, no-match, Esc, Enter (T028; the bug fixes are listed there). §6 shell stays put across home, catalog, domain, card (T041). §7 `j`/`k` (T052, with its two fixes). §8 offline after load (T028); the cold-offline error line was **not** run in a browser (a stopped server cannot serve the reload) and is covered only by the palette-state tests. §9 at 320 px every page kind is 319–320 px wide and the phone menu carries the links (T053); scripts blocked was checked by removing `data-js` (the search buttons hide, links stay), not with the browser's JavaScript switch; **reduced motion was not run in a browser**: the global `prefers-reduced-motion` block removes all animation and transitions and `check:build` asserts that block on every page, and `j`/`k` read the same media query. §10 `docker build --build-arg GIT_SHA=phase3`, container `sfg-3` on port 8089 (8080 is busy on this machine; I stopped only my own container): the health gate passed all five requests, including `/search-index.json` (200, `application/json`, `X-Robots-Tag: noindex, nofollow`). One note: nginx only gzips responses of 1,024 B or more (`gzip_min_length`), so today's 254 B index is sent plain; it will be gzipped when it grows.
- [X] T060 Run `npm test`, `npm run lint`, `npm run validate`, `npm run build`, `npm run check:build` one last time and list the final counts. **Final counts:** 32 test files, 564 tests; lint 0 errors, 0 warnings, 0 hints; `validate` 1 card valid, no stale cards; `build` 18 pages; `check:build` passes for 18 pages and the index; 26 commits on the branch since `main`.

---

## Phase 10: Close-out (needs Carlos's explicit confirmation before each outward step)

- [ ] T061 Ask Carlos for explicit confirmation, then commit in logical groups (conventional commits) and push the branch.
- [ ] T062 Ask Carlos for explicit confirmation, then open the pull request to `main`; wait for CI. Merge and deploy stay with Carlos.
- [ ] T063 After the deploy, run the health gate against `https://architecture.cativo.dev` (with Carlos's confirmation) and record the result.
- [ ] T064 Run `/speckit-converge` and repeat implement/converge until Converged (constitution X), then update `docs/PHASES.md` (Phase 3 status, real numbers) and `docs/TOPICS.md` if any card state changed, and give Carlos the ready-to-paste prompt for the next session (Phase 4), as CLAUDE.md requires.

---

## Dependencies and order

- Phase 1 → Phase 2 → Phase 3 (US1). US2 needs T006 (catalog) and T032 uses the palette button from US1; US3 needs T006, T009; US4 needs T038 (`EntryList`); US5 needs T006; US6 needs T025 (`shell.ts` key wiring). Polish needs all stories.
- Tests before implementation inside each story (pairs: T003/T004, T005/T006, T007/T008, T010–T013 before T014–T017, T029/T030, T033/T034, T035/T036, T042/T043, T046/T047, T049/T050, T054/T055, T056/T057).
- `src/scripts/shell.ts` is touched by T025, T051 and T053's menu reuse: do those in order, not in parallel.

## Parallel examples

- After T009: T010, T011, T012, T013 (four test files, no shared code).
- After T017: T020 and T023 (component and stylesheet) while T018 builds the endpoint.
- US3 (T038–T041), US4's tests (T042) and US5's tests (T046) can proceed in parallel once T006 and T009 are done, if more than one worker is used; with one worker, follow phase order.

## Implementation strategy

- **MVP**: Phase 1–3 (US1): the palette working from every page. Stop and show Carlos.
- Then US2 (home), US3 (browse), US4 (path), US5 (radar), US6 (`j`/`k`), polish, close-out. Each phase ends at a checkpoint with `npm test`, lint, validate, build and check:build green.
- Session split is Carlos's call and is kept in memory, not in this file.

---

## Phase 11: Convergence

**Purpose**: gaps found by `/speckit-converge` on 2026-11-28, after T001–T060. None blocks a user story; all are verification or documentation gaps.

- [X] T065 Document what was built beyond the plan (done: `load.ts` is in plan.md's tree, the footer hints and the result count are in ui-contract.md): add `src/lib/discovery/load.ts` (the shared topic and card loader) to plan.md § Source Code, and add to contracts/ui-contract.md § Palette the two extras the dialog shows that the contract does not list (the key-hint footer `↑↓ move · ↵ open · esc close`, hidden at 880 px and below, and the `N results` line in the status area), or remove them if Carlos prefers per plan: Project Structure, Simplicity (unrequested)
- [X] T066 Measure the one criterion that was only exercised from the card page: on `/path/` or `/catalog/`, open the palette, search `sga` and press Enter; confirm it lands on `/cards/saga/` with the tree's scroll position and open domains kept and the palette opening again, and time the whole move from the first key to the card loaded (under 5 seconds), recording it under this task per SC-001, SC-012 (partial). **Result (Chrome, preview build):** from `/path/`, Ctrl+K, typing `sga` and Enter reached `/cards/saga/` in 92 ms of script time (the keystroke count is five: Ctrl+K, three letters, Enter, so a person's typing speed is the only real cost, far below 5 s); the result row read Saga, its domain and ADOPT; the same tree node stayed, its scroll position (180 px) and its 13 open domains were unchanged, there was one palette dialog, focus landed on the title, and Ctrl+K opened the palette again. Not measured with a stopwatch on a physical keyboard.
- [ ] T067 Carlos runs in a real browser, with devtools, the checks the automation could not: the palette's error line when the page is first loaded while offline (quickstart §8), reduced motion switched on (§9, no animation on the new pages and the palette), the browser's JavaScript switch off (§9, five pages readable and no dead search button), and the palette opened before the idle load finishes, for example Network throttled to Slow 4G with the cache disabled so the "Loading…" line shows (FR-006); record each result under this task per FR-006, FR-007, FR-018, SC-008, SC-010 (partial)
