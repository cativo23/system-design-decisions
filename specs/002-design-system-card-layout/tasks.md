---
description: "Task list for the Design System & Card Layout feature"
---

# Tasks: Design System & Card Layout

**Input**: Design documents from `specs/002-design-system-card-layout/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: REQUIRED for all logic (constitution VII, non-negotiable). Every test task MUST be
written and **seen to fail** before its implementation task. Presentational markup (Astro
components, CSS, the DOM glue in `src/scripts/shell.ts`, nginx config) is exempt from unit tests
and is verified in the browser with the [quickstart](quickstart.md) section named in the task.

**Organization**: phases follow the dependency order in plan.md § Implementation order, not the
spec's priority order. US5 (card format) comes first because it is what lets a card render, then
US1 (card sections), US2 (shell), US3 (phone), US4 (keyboard and motion). `check:build` budgets
come early (Phase 2) so CI stays green when fonts and the router arrive; its structure checks
come with US4, when the pages have the structure.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5 from spec.md
- Paths are repo-relative (single project at the root, per plan.md § Project Structure)
- "data-model.md `Entity.field`" is the canonical definition of a constrained field; tasks cite it instead of repeating it

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the two font packages and Astro's `fonts` configuration, so builds emit self-hosted fonts.

- [X] T001 (done, then reverted in T002: the packages turned out unused) Install the font files as build inputs: `npm install -D @fontsource-variable/geist-mono @fontsource-variable/inter` (research.md R2). Commit `package.json` and `package-lock.json` changes only.
- [X] T002 Add `fonts` to `astro.config.mjs` per the official Astro "Using custom fonts" guide (research.md R2): Geist Mono (`cssVariable: '--font-mono'`, weights `['400 600']`, styles `['normal']`, subsets `['latin', 'symbols2']`, fallbacks `['ui-monospace', 'monospace']`) and Inter (`'--font-sans'`, same weights, subsets `['latin']`, fallbacks `['system-ui', 'sans-serif']`). Try `provider: fontProviders.npm()` first. If it rejects these packages, use `fontProviders.fontsource()` and record the outcome in research.md R16. Do not render `<Font>` yet (T024). Run `npm run build` and confirm the log shows `Copying fonts` and `dist/_astro/fonts/` holds three woff2 files (about 102 KB in all). If the npm provider does not find the packages under `devDependencies`, move both to `dependencies` (the docs say it detects fonts from `package.json` dependencies).

**Checkpoint**: `npm run build` passes and emits the fonts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: every pure module the stories share, the design tokens, the stricter budget check, and the base layout. Test first, then implementation, per pair.

**⚠️ CRITICAL**: no user story starts until this phase is complete.

- [X] T003 [P] Write failing tests in `tests/unit/template.test.ts` for `src/lib/cards/template.ts`: nine sections in template order; each carries `title`, `id` and `tocLabel` exactly as data-model.md `TemplateSection.title`, `TemplateSection.id` and `TemplateSection.tocLabel` (`tldr`, `problem`, `how`, `when`, `tradeoffs`, `wild`, `pitfalls`, `related`, `deeper`; TL;DR has `tocLabel: null`); a `tocEntries()` helper returns the eight entries after TL;DR.
- [X] T004 Create `src/lib/cards/template.ts` to make T003 pass. Change `src/lib/cards/rules.ts` to derive `TEMPLATE_SECTIONS` from it. Existing `tests/unit/rules.test.ts` stay green unchanged. Fields per data-model.md `TemplateSection.title`, `TemplateSection.id` and `TemplateSection.tocLabel`.
- [X] T005 [P] Write failing tests in `tests/unit/meter.test.ts`: `meterString(n)` returns `'█'` repeated `n` then `'░'` repeated `6 − n` for integers 0–6 (data-model.md Meter); throws for 7, −1, 2.5 and NaN; `domainMeter(read, total)` returns four segments of `▰`/`▱` (`0/6` → `▱▱▱▱`, `6/6` → `▰▰▰▰`, `3/6` → `▰▰▱▱`, `total 0` → `▱▱▱▱`) per data-model.md `TreeDomain.meter`.
- [X] T006 Implement `src/lib/layout/meter.ts` to make T005 pass. Per data-model.md `Meter` (0–6) and `TreeDomain.meter`.
- [X] T007 [P] Write failing tests in `tests/unit/contrast.test.ts` (research.md R10, SC-007): `contrastRatio('#fff','#000')` is 21; a known mid pair matches to two decimals; and a token test that parses `src/styles/tokens.css` and asserts every text token (`--fg`, `--fg-muted`, `--fg-faint`, `--accent`, `--run`, `--info`, `--warn`, `--bad`) is ≥ 4.5 against each surface it is used on (`--bg`, `--bg-raised`, `--bg-hover`, and the status-line colour `#0b0c0f`). It fails first because `tokens.css` does not exist. Also assert the text-on-tint pairs the mockup uses (radar badge colours on their `--ok-soft`/`--info-soft`/`--warn-soft`/`--bad-soft` tints composited over `--bg-raised`, the diff add/del line text on their tints, the `--info` hunk header on its tint, `--warn` text in pitfalls) so FR-025 holds for all text, not only flat surfaces.
- [X] T008 Implement `contrastRatio(foreground, background)` (WCAG relative luminance) in `src/lib/layout/contrast.ts`.
- [X] T009 Create `src/styles/tokens.css`: the mockup's `:root` custom properties from `docs/mockups/saga-card.html` (colours, `--accent-glow`, soft tints), with `--fg-faint: #7d828c`, and `--mono` / `--sans` built from `var(--font-mono)` / `var(--font-sans)` followed by the system stacks (contracts/ui-contract.md § Tokens). T007 goes green.
- [X] T010 [P] Write failing tests in `tests/unit/path.test.ts` for `buildPath(topics, writtenCards)` and `neighbors(path, id)`: path order equals topic order across domains; `written` and `status` follow data-model.md `PathEntry.written` and `PathEntry.status` (status `null` when unwritten); first entry has no `prev`, last has no `next`; an id not in the path throws.
- [X] T011 Implement `src/lib/layout/path.ts` to make T010 pass. Fields per data-model.md `PathEntry.written` and `PathEntry.status`.
- [X] T012 [P] Write failing tests in `tests/unit/tree.test.ts` for `buildTree(topics, writtenIds, currentId)` and `treeCurrent(pathname, tree)`: 13 domains in order; only the current card's domain is `open`; `read` is 0 and `total` counts the domain's topics (data-model.md `TreeDomain.read`, `TreeDomain.total`); `meter` comes from `domainMeter`; written cards have `href`, unwritten have none; every card glyph is `○` (data-model.md `TreeCard.glyph`); `treeCurrent('/cards/saga/', tree)` returns the id and domain to mark, and an unknown path returns `null`.
- [X] T013 Implement `src/lib/layout/tree.ts` to make T012 pass. Fields per data-model.md `TreeDomain.read`, `TreeDomain.total`, `TreeDomain.meter` and `TreeCard.glyph`.
- [X] T014 [P] Write failing tests in `tests/unit/scroll.test.ts` for `scrollLabel(scrollY, maxScroll)`: `top` at 0 or when `maxScroll ≤ 0`; `bot` at or past the maximum; otherwise the rounded percentage with `%` (FR-006).
- [X] T015 Implement `src/lib/layout/scroll.ts` to make T014 pass.
- [X] T016 [P] Write failing tests in `tests/unit/toc.test.ts` for `currentSection(tops, line)`: returns the id of the last section whose top is above `line`; the first id when none is; empty input returns `null`.
- [X] T017 Implement `src/lib/layout/toc.ts` to make T016 pass.
- [X] T018 [P] Write failing tests in `tests/unit/menu.test.ts` for `nextMenuState(state, event)` (events `open`, `close`, `escape`, `backdrop`, `navigate`; `escape`/`backdrop`/`navigate`/`close` close it, `open` opens, closed ignores close events) and `nextFocusIndex(index, count, shift)` (Tab from the last wraps to 0, Shift+Tab from 0 wraps to `count − 1`, otherwise ±1; `count 0` returns −1). Research.md R7, R8.
- [X] T019 Implement `src/lib/layout/menu.ts` to make T018 pass.
- [X] T020 [P] Write failing tests in `tests/unit/typed-title.test.ts` for `isTypable(title)`: true up to 14 characters, false above, false for blank (research.md R9).
- [X] T021 Implement `src/lib/layout/typed-title.ts` to make T020 pass.
- [X] T022 [P] Write failing tests in `tests/unit/check-build.test.ts` (extend the Phase 1 file; replace the "0 JS" and "≤ 2 KB CSS" expectations) for the budgets in contracts/build-budget.md: JS gzip ≤ 12 KB across inline and same-origin scripts; CSS gzip ≤ 8 KB across `<style>` and same-origin stylesheets; fonts ≤ 110 KB from `@font-face` `url()`s; HTML raw ≤ 50 KB; whole page ≤ 150 KB; any off-origin resource fails; noindex meta still required; a page with a script under budget passes; message shape `<what> is <n> bytes (budget <m>)`; and a pure `formatReport(sizes)` for `--report`.
- [X] T023 Update `scripts/check-build.ts` to make T022 pass: gzip level 6, size same-origin scripts and fonts, the new constants at the top, `--report` flag. Phase 1's "no `<script>` at all" rule is removed. Keep the structure checks for T066. Count scripts transitively: follow `import` specifiers of each same-origin script to the chunks under `dist/_astro/` so a shared chunk cannot hide bytes.
- [X] T024 Update `src/layouts/Base.astro`: import `tokens.css` and a new `src/styles/global.css` (box-sizing, `[hidden] { display: none !important }`, body, links, selection, `:focus-visible`, `.sr-only`, the ambient background, and one `@media (prefers-reduced-motion: reduce)` block last that sets `animation` and `transition` to `none` and `scroll-behavior: auto`); render `<Font cssVariable="--font-mono" preload />` and `<Font cssVariable="--font-sans" preload />` from `astro:assets`; add `<ClientRouter />` from `astro:transitions`; keep the noindex meta. `src/pages/index.astro` keeps its structure and picks up the theme (FR-024). Run `npm test && npm run lint && npm run build && npm run check:build`: all green.

**Checkpoint**: foundation ready; CI-equivalent commands pass with the new budgets; the index page renders in the dark theme.

---

## Phase 3: User Story 5 - The card format carries what the layout needs (Priority: P2, built first)

**Goal**: authors write format v2; the checks reject incomplete layout data; the Saga card migrates and still builds.

**Independent Test**: take the valid fixture and remove or corrupt each new piece of data in turn; each defect fails with the card, the rule and the row or id named; the unmodified Saga card passes (quickstart §2).

> **Commit T026–T038 as one group.** After T026 changes the schema, `npm run build` and
> `npm run validate` fail on the v1 Saga card until T038 migrates it (T036 and T037 must exist
> first, or MDX errors on the unknown components). Unit tests stay green throughout.

### Tests and implementation

- [X] T025 [P] [US5] Write failing tests in `tests/unit/schema.test.ts` for the changed `related` field: data-model.md `Card.related` is a list of `{ id, why }`; `id` is a slug, ids are unique, `why` is non-blank text; `[]` is allowed; a plain string entry is invalid; issues expose the path (`related.0.why`).
- [X] T026 [US5] Change `src/lib/cards/schema.ts`: replace `related: uniqueList('related')` with the object list per data-model.md `Card.related`. T025 passes.
- [X] T027 [P] [US5] Add the nine codes `related-why-missing`, `use-avoid-shape`, `tradeoffs-shape`, `meter-missing`, `meter-range`, `wild-entry-malformed`, `pitfall-malformed`, `source-malformed`, `tldr-shape` to `RuleCode` in `src/lib/check-failure.ts` (contracts/card-format.md § New rule codes).
- [X] T028 [P] [US5] Write failing tests in `tests/unit/layout-rules.test.ts`, table-driven with inline section text, for each rule in contracts/card-format.md: `use-avoid-shape` (missing either `###`, wrong order, a heading with no bullet, extra heading); `tradeoffs-shape` (not 3 columns); `meter-missing` (a data cell without a leading `<Meter n={…} />`; names the row and column); `meter-range` (7, −1, 2.5, `"x"`; names the value), per data-model.md `TradeoffRow.approach` and `TradeoffRow.alternative`; `wild-entry-malformed` (name not directory form, missing description, no bullet), per `WildEntry.name` and `WildEntry.description`; `pitfall-malformed` (blank `title`, empty body, none, stray content), per `Pitfall.title` and `Pitfall.body`; `source-malformed` (no kind, blank title, non-`https` href, wrong form, none), per `Source.kind`, `Source.href` and `Source.title`. Each valid case passes and all failures in one section are returned together. Add `tldr-shape`: exactly one paragraph passes; zero or two paragraphs fail, naming the count.
- [X] T029 [US5] Implement `src/lib/cards/layout-rules.ts` (a line scanner over `Section.lines`, no AST, as Phase 1 R4) to make T028 pass. Rules per data-model.md `TradeoffRow.approach`, `TradeoffRow.alternative`, `Pitfall.title`, `Pitfall.body`, `Source.kind`, `Source.href`, `Source.title`, `WildEntry.name` and `WildEntry.description`.
- [X] T030 [P] [US5] Write failing tests in `tests/unit/rules.test.ts` and `tests/unit/cross-card-rules.test.ts`: `validateCards` runs the layout rules for the five sections; `related-why-missing` when an entry's `why` is blank (names the related id); `related-unknown` and `related-self` read `related[].id`; Phase 1 cases still hold with object `related`.
- [X] T031 [US5] Wire `src/lib/cards/rules.ts`: call `layout-rules.ts` from `checkSections`, read `related[].id`, emit `related-why-missing`. T030 passes.
- [X] T032 [US5] Migrate every fixture to format v2 so each still breaks exactly one rule: `tests/fixtures/valid/cards/alpha.mdx` and all files in `tests/fixtures/broken/cards/` (object `related`, `<Meter>` cells, the `###` pair, `<Pitfall>`, `<Source>`, directory-style wild names). Existing tests that load fixtures stay green.
- [X] T033 [US5] Add one new broken fixture per new rule code in `tests/fixtures/broken/cards/` (nine files). Extend `tests/integration/validate-cli.test.ts` to expect each new code, plus every Phase 1 code, in a single run with exit 1 (SC-008, quickstart §2). Write the expectation first and see it fail before the fixtures exist.
- [X] T034 [P] [US5] Write failing tests in `tests/unit/related.test.ts`: `resolveRelated` takes `{ id, why }[]` and returns each item with its `why`; written → `href`, `title`, `status`, `available: true`; planned → `title`, `available: false`, no status.
- [X] T035 [US5] Update `src/lib/cards/related.ts` to make T034 pass, and update `src/components/RelatedCards.astro` to the new shape (render `why`; final markup comes in T045).
- [X] T036 [P] [US5] Create the authored components with their final markup and ARIA per contracts/ui-contract.md § Card sections: `src/components/Meter.astro` (`n` prop, uses `meterString`, `role="img"`, `aria-label="N of 6"`), `src/components/Pitfall.astro` (`title` prop, native `<details><summary>` with `WARN`, title and chevron; default slot is the body), `src/components/Source.astro` (`kind`, `href` props; `<a>` with kind label, slot title, `↗` `aria-hidden`). Props per data-model.md `TradeoffRow.approach` (the meter level `n`), `Pitfall.title`, `Source.kind` and `Source.href`.
- [X] T037 [US5] In `src/pages/cards/[id].astro` pass `components={{ Meter, Pitfall, Source, RelatedCards }}` to `<Content>`.
- [X] T038 [US5] Migrate `src/content/cards/saga.mdx` to format v2 with the prose unchanged: `related` with a `why` each (outbox-cdc "Publish events reliably from each step", idempotency "Makes retries and redelivery safe", durable-execution "Sagas written as plain code"); `### Use it when` / `### Avoid it when`; `<Meter>` levels from the mockup (consistency 2/6, availability 5/6, simplicity 2/6, observability 3/6, cost 3/6 for saga; 6, 2, 4, 4, 2 for 2PC); In the wild names `temporal`, `aws-step-functions`, `camunda-zeebe`, `masstransit`; five `<Pitfall>` blocks from the existing bold leads; three `<Source>` lines (`paper`, `pattern`, `guide`). `npm run validate` and `npm run build` pass. The TL;DR stays one paragraph.
- [X] T039 [P] [US5] Docs: add a pointer to `specs/002-design-system-card-layout/contracts/card-format.md` at the top of `specs/001-walking-skeleton/contracts/card-format.md`, and add the nine new rows to the rule-code table in `specs/001-walking-skeleton/contracts/validator-cli.md`.

**Checkpoint**: `npm test`, `npm run validate` and `npm run build` are green; the Saga card is format v2; every new rule has a failing fixture.

---

## Phase 4: User Story 1 - Read a card in the approved visual identity (Priority: P1) 🎯 MVP

**Goal**: the Saga page looks like the mockup for every in-scope element, inside the plain base layout (the shell comes in US2).

**Independent Test**: quickstart §6, a side-by-side walk of the page against `docs/mockups/saga-card.html`, ticking FR-009 to FR-020; only the documented deviations remain (FR-031).

- [X] T040 [US1] Create `src/styles/card.css`, imported by the card page: port the in-scope rules from the mockup (breadcrumb, typed title with `--len` and `steps()`, meta row, radar badges, `h2#tldr` visually hidden with `h2#tldr + p` as the panel and `content: "// tl;dr" / ""`, `##` marker, `scroll-margin-top`, the diff via `h3[data-kind]` and `h2#when ~ h3 + ul > li::before`, table frame, meters and hint, the `ls` block under `h2#wild`, pitfalls, related grid with spotlight, Go deeper rows, pager, the staggered rise). Do **not** port the palette, simulator, progress panel, TOC shortcut keys or nav rules (FR-031). Every animation and transition in it is covered by the single reduced-motion block from T024.
- [X] T041 [P] [US1] Create `src/components/SectionHeading.astro` (mapped to `h2`): renders the `##` marker and the title with the id from `TEMPLATE_SECTIONS` (T004); for *In the wild* also renders the `❯ ls ~/in-the-wild/<card id>  # volatile · verified <reviewed>` command line, reading the card via `getEntry('cards', Astro.params.id)` as `RelatedCards` does.
- [X] T042 [P] [US1] Create `src/components/Subheading.astro` (mapped to `h3`): sets `data-kind="use"` for "Use it when" and `"avoid"` for "Avoid it when", otherwise a plain `h3`.
- [X] T043 [P] [US1] Create `src/components/TableFrame.astro` (mapped to `table`): the horizontally scrolling frame around the table (FR-029, edge cases). For the Trade-offs table only, also render the hint line `// more █ = better for you` after the table (FR-015); other tables get the frame alone.
- [X] T044 [US1] Finish the class hooks and states in `Meter.astro`, `Pitfall.astro` and `Source.astro` to match `card.css` (meter colours for the card's side versus the alternative, open/closed state not conveyed by colour alone, external-link cue).
- [X] T045 [US1] Finish `src/components/RelatedCards.astro` per FR-018: a grid of cards with title, `why`, and for written cards the radar badge, link and `cd ../<id>` hint; for unwritten cards the title, `why` and a visually hidden "not yet available", with no badge, no link and no hint.
- [X] T046 [P] [US1] Create `src/components/Pager.astro` per FR-020 using `buildPath` and `neighbors` (T011): previous/next across domains; an unwritten neighbour is text with "not yet available"; an absent side is omitted; `nav` with an `aria-label`.
- [X] T047 [P] [US1] Write failing tests in `tests/unit/health-gate.test.ts`: the card check's H1 assertion passes for `<h1><span class="typed">Saga</span></h1>` and still fails when the H1 is missing or has another title.
- [X] T048 [US1] Loosen the H1 regex in `scripts/health-gate.ts` to tolerate inline elements inside the heading (contracts/build-budget.md § Health gate). T047 passes.
- [X] T049 [US1] Compose `src/pages/cards/[id].astro` in the base layout: prompt breadcrumb `~/catalog/<NN>-<domain slug> ❯ cat <id>.md` (FR-009), `<h1><span class="typed" style="--len:N">Title</span></h1>` with the typing class only when `isTypable(title)` (FR-010), the meta row (FR-011), `<Content components={{ Meter, Pitfall, Source, RelatedCards, h2: SectionHeading, h3: Subheading, table: TableFrame }} />`, then `<Pager />`. Keep `<main id="main">` and a single `<h1>`.
- [X] T050 [US1] Run quickstart §6 in the browser against the mockup (use the Claude in Chrome tools). Fix every defect found; list the documented deviations and any glyph-alignment finding (research.md R2, R16) in a note under this task. Run `npm run build && npm run check:build`. Also check SC-006 (quickstart §9, layout shift ≤ 0.1 and text in under 2 s on throttled Slow 4G) and record the numbers.
  - **T050 findings (2026-11-25, Chrome, 1265 px wide, `astro preview`):** every in-scope element matches the mockup: prompt, typed title with caret (`steps(var(--len))` works, so the R9 fallback is not needed), meta, TL;DR panel, diff block, Trade-offs table with meters and hint, `ls` listing, five pitfalls (closed; open state and chevron turn checked), related grid, go deeper, pager. Self-hosted Geist Mono and Inter load (3 font faces), 0 third-party origins. **Documented deviations (FR-031):** no `~6 min` in the meta (no such field), no progress panel, no simulation block (Phase 5), no spotlight pointer tracking yet (the `--mx/--my` hook is unset, so the glow centres; needs `shell.ts`), no shell (tree, TOC, status line: US2). The 3 related cards and both pager neighbours are planned, so they show as text with "not yet available". **SC-006:** layout shift 0, first contentful paint 52 ms and load 41 ms locally. A Slow 4G throttle is not available through the browser tools, so the "< 2 s throttled" figure is not measured; the 113 KB transferred page makes it unlikely to fail, and it should be re-checked on the deployed site. **Glyph alignment (R2/R16):** `❯` and the meter blocks render aligned in Geist Mono.

**Checkpoint**: the Saga page matches the mockup's in-scope elements; budgets still pass.

---

## Phase 5: User Story 2 - Orient and move around inside the shell (Priority: P1)

**Goal**: the five-region frame, live TOC and scroll position, and card-to-card moves that keep the tree in place.

**Independent Test**: quickstart §7 with a scratch second card.

- [X] T051 [P] [US2] Create `src/components/Tree.astro`: `<nav id="tree" aria-label="Catalog" transition:persist="tree">` with one native `<details>` per domain from `buildTree` (T013): summary `<NN> <slug>` plus its meter, cards inside as links (written) or text with a visually hidden "not yet available" (unwritten), `aria-current="page"` and `◀` on the current card, `open` on the current domain (FR-003, FR-004).
- [X] T052 [P] [US2] Create `src/components/Toc.astro`: `<aside aria-label="On this page">` with the eight entries from `tocEntries()` (T004), as in the mockup but without the shortcut-keys block (FR-005, FR-031).
- [X] T053 [P] [US2] Create `src/components/StatusLine.astro` per contracts/ui-contract.md § Status line: `READ`, `<NN> <slug>`, `<id>.md`, `● <status>`, `domain <read>/<total>`, a position field with a stable id for the script; `aria-hidden="true"`. Fields per data-model.md `StatusLine.mode`, `StatusLine.domain`, `StatusLine.file`, `StatusLine.radar` and `StatusLine.progress`.
- [X] T054 [P] [US2] Create `src/components/TopBar.astro`: the `<header>` with the brand link to `/` and the search trigger as a button with `aria-disabled="true"` (focusable, announced as unavailable, activation does nothing; not the `disabled` attribute) labelled "search" with no shortcut hint (FR-002, clarification 5). No navigation links (FR-031).
- [X] T055 [US2] Create `src/layouts/Shell.astro` composing `TopBar`, `Tree`, `<main id="main">` slot, `Toc` and `StatusLine` in the mockup's three-column grid (260px / reading column / 210px; bottom padding so content clears the status line). Layout CSS lives in the component.
- [X] T056 [US2] Create `src/scripts/shell.ts` (DOM glue only; decisions come from `src/lib/layout/`): on each `astro:page-load`, (a) update the status line position with `scrollLabel` on scroll, (b) highlight the TOC entry from `currentSection`, (c) re-mark the current card and open its domain with `treeCurrent` without touching the reader's other open domains (and scroll the current row into view with `block: 'nearest'` only when it is off-screen), (d) move focus to the new `h1` (`tabindex="-1"`). Remove listeners from the previous page. Text and attributes only, no HTML strings (constitution, safe rendering). Load it from `Shell.astro`.
- [X] T057 [US2] Switch `src/pages/cards/[id].astro` to `Shell`, passing the card, its domain and the written ids. Run `npm run build && npm run check:build`: the JS budget (12 KB gzip) holds with the router plus `shell.ts`. Remove the page-level `<main id="main">` from T049 so only the shell's `main` remains.
- [X] T058 [US2] Run quickstart §7 in the browser: make the scratch second card, check persistence of the tree's scroll and open domains, the status line staying on screen, scroll reset, focus on the new title, Back/Forward, `top`/`N%`/`bot`, and TOC highlight. Delete the scratch card.
  - **T058 findings (2026-11-25):** with a scratch `idempotency` card (deleted, never committed), a tree click, a Related entry and Back all swap without a full load (same `#tree` node, `window` state kept). Open domains survive, focus lands on the new `h1`, scroll resets to 0, the status line shows the new file, domain and radar status, `top` and `bot` show at the ends, Back restores Saga. **The tree's `scrollTop` reset to 0 on navigation** (a persisted node is moved in the DOM). The T059 contingency fixed it: scroll 77 before, 77 after. Limitation seen: on a short page the last TOC entries cannot reach the top, so the reading line is 200 px rather than 120 px to still highlight the clicked entry. Long ids (`event-driven-architecture`) are clipped at the tree's edge, as in the mockup.
- [X] T059 [US2] Only if T058 shows the tree's scroll position resetting: save `scrollTop` on `astro:before-swap` and restore it on `astro:after-swap` in `src/scripts/shell.ts` (research.md R5 contingency), then repeat the check. If it does not reset, mark this task done with "not needed".
  - Needed and done: save `scrollTop` on `astro:before-swap`, restore it on `astro:after-swap`.

**Checkpoint**: the shell renders on Saga; moving between cards keeps the tree and status line in place.

---

## Phase 6: User Story 3 - Read comfortably on a phone (Priority: P2)

**Goal**: one full-width column, no sideways scroll, and the tree reachable behind a menu button.

**Independent Test**: quickstart §8 at 320, 390, 768 and 1000 px.

- [X] T060 [US3] Add the responsive rules per contracts/ui-contract.md § Responsive behaviour: table of contents hidden at ≤ 1200 px; tree hidden and the menu button shown at ≤ 880 px; one full-width column with `env(safe-area-inset-*)` padding; shortened status line (hide the secondary fields); pager and related stack; tables and `pre` scroll inside their frames; tap targets ≥ 44 CSS px.
- [X] T061 [US3] Add the menu button to `TopBar.astro` (`aria-expanded`, `aria-controls="tree"`, hidden above the phone breakpoint) and the overlay presentation for `#tree` at the phone breakpoint (full-height panel, close control, backdrop) in `Tree.astro` and `Shell.astro` styles.
- [X] T062 [US3] Wire the menu in `src/scripts/shell.ts` using `nextMenuState` and `nextFocusIndex` (T019): open on the button, close on the close control, Escape, backdrop tap, choosing a card and `astro:before-swap`; `inert` on `header`, `main` and the table of contents while open; no page scroll behind; Tab wraps; focus returns to the button on close; `aria-expanded` kept in sync (research.md R8).
- [X] T063 [US3] Run quickstart §8 in the browser (emulated phone widths) and fix defects.
  - **T063 findings (2026-11-25):** the browser window cannot be resized below the screen's 50% bound, so the widths were tested in a same-origin `<iframe>` of 320, 390, 768, 1000 and 1300 px (media queries evaluate against the frame). No sideways page scroll at 320 (`scrollWidth` 320); the Trade-offs table scrolls inside its frame. TOC hidden at ≤ 1200, tree and menu button swap at 880 (menu button shown, tree hidden at ≤ 880). The menu: opens with focus on the close control, `aria-expanded` kept in sync, `inert` on header, main and TOC, page scroll locked, Tab and Shift+Tab wrap at the ends, Escape, backdrop and the close control each close it and return focus to the menu button. Tap targets: menu button 44×44, brand 44 high, search 44 high, tree rows 44 high. Status line keeps mode, file and position. **Bug found and fixed:** the open tree was drawn under the top bar because `.shell` creates a stacking context; it is `z-index: auto` at phone width. Not tested: a real touch device, a notch with non-zero `safe-area-inset` (the CSS uses `env()`; it resolves to 0 in a desktop browser).

**Checkpoint**: the Saga page is usable at 320 px and the phone menu meets FR-029.

---

## Phase 7: User Story 4 - Operate everything by keyboard, with calm motion (Priority: P2)

**Goal**: a keyboard-only walk works end to end, reduced motion removes every animation, and the build proves the static structure.

**Independent Test**: quickstart §9.

- [X] T064 [US4] Add the skip link as the first element of `Shell.astro` (`<a class="skip-link" href="#main">Skip to content</a>`, visible on focus, styled in `global.css`), confirm `<main id="main">` receives focus on activation, and review every interactive element for a visible `:focus-visible` ring and a logical Tab order (FR-026).
- [X] T065 [P] [US4] Write failing tests in `tests/unit/check-build.test.ts` for the structure checks in contracts/build-budget.md § Structure checks: a page fails for no `<h1>` or two, a first `<a>` that is not `href="#main"`, missing `id="main"`, a `<nav>` or `<aside>` without `aria-label`, CSS without the `[hidden]` rule, CSS without a `prefers-reduced-motion: reduce` block that sets `animation` and `transition` to `none`; the index page is exempt from the skip link and landmark checks only.
- [X] T066 [US4] Implement the structure checks in `scripts/check-build.ts` to make T065 pass. `npm run build && npm run check:build` is green on the real `dist/`.
- [X] T067 [US4] Reduced-motion audit: search `src/` for every `animation`, `transition`, `scroll-behavior` and `@keyframes`, confirm each is covered by the single block in `global.css`, and that the typed title, caret, rise, hover lift, spotlight, chevron turn and live pulse all stop. Fix any gap (FR-027).
  - **T067 audit (2026-11-25):** every `animation`, `transition` and `scroll-behavior` in `src/` (card.css: rise, type, blink, table-row hover, pitfall chevron, spotlight, `.cd`, source arrow, pager; shell.css: brand caret, tree and TOC hover; global.css: smooth scroll) is silenced by the one `*, *::before, *::after` block at the end of `global.css`. With animation off, the `both` fill shows the typed title complete and the staggered blocks fully visible. No gap found, nothing to fix.
- [X] T068 [US4] Run quickstart §9 in the browser: keyboard-only walk, emulated `prefers-reduced-motion: reduce`, JavaScript disabled, and `npm test -- contrast`. Fix defects. Also cover the search-trigger, layout-shift, zoom/large-text and root-index-theme checks added to quickstart §8–§9, and the `tldr-shape` check.
  - **T068 findings (2026-11-25, Chrome):** *Keyboard:* the first Tab stop is the skip link (visible), Enter moves focus to `#main`; tab order is skip link, brand, search, tree, then the article, as the contract says (34 stops on Saga); Enter opens and Space closes a pitfall; the focus ring is the 1 px accent outline. *Search trigger:* focusable `<button aria-disabled="true">`, activating it changes nothing. *Scripts blocked:* tested in a `sandbox="allow-same-origin"` iframe (no scripts): all 9 sections render, the current card is marked server-side (`aria-current`, `◀`), the tree's domains still open, the TOC highlight and live position are absent, the title is complete. *Zoom:* 200% at 320 px is 160 CSS px; it overflowed to 247 px at first (related grid minimum, use/avoid and pager `1fr` tracks, the wrapped top bar) and is fixed: `scrollWidth` 145 at 160 px, 319 at 320 px, 375 at 390 px. *Root index:* dark theme (`rgb(7,8,10)`), Inter, structure unchanged. *Reduced motion:* the browser tools cannot emulate the media feature, so it is covered by the T067 audit, the `check:build` structure check and by reading the compiled rule (`animation` and `transition` reset inside `prefers-reduced-motion: reduce`); a human run of §9 with devtools emulation is still worthwhile. *Not measured:* Slow 4G throttle (see T050). **Found, not fixed:** font sizes are in `px` (as the mockup), so a larger *default text size* in the browser does not enlarge the text; only zoom does. Say if you want `rem`. **Changed:** the phone menu button now shows only once scripts have run (`html[data-js]`), because without scripts it would be a dead control.

**Checkpoint**: keyboard, reduced-motion and scripts-blocked runs pass; the build proves the structure.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: production delivery details, real measurements and docs.

- [X] T069 Update `nginx/default.conf` per research.md R12 and contracts/build-budget.md § nginx: `gzip on`, level 6, `gzip_vary`, `gzip_min_length 1024`, `gzip_types` for CSS, JS, JSON and SVG; a `location /_astro/` block with `Cache-Control: public, max-age=31536000, immutable` and the repeated `X-Robots-Tag "noindex, nofollow" always`.
- [X] T070 [P] Write failing tests in `tests/unit/health-gate.test.ts` for the new `font` request (research.md R13): 200 with `X-Robots-Tag` containing `noindex` and `Cache-Control` containing `immutable` passes; a missing header, a missing `immutable`, or a non-200 fails with a message naming the font URL; and a pure `findFontHref(html)` returns the first `<link rel="preload" as="font">` href or `null`.
- [X] T071 Implement the font request in `scripts/health-gate.ts` to make T070 pass: add the `font` kind, read the href from the `/` response each round, fail with "no font preload found" when absent, keep the same timeouts, retries and no-redirect rules. Update the printed per-round summary.
- [X] T072 Run quickstart §10: build the image, run it on a free host port (8080 is busy locally), confirm `noindex` on `/`, a gzipped card page, and on a font file both `noindex` and `immutable`. Stop the container.
  - **T072 findings (2026-11-25):** image built with `GIT_SHA`, run as `sfg-p2` on port 8089 (8080 is taken by another project; the old `sfg` container on 8088 was not touched), stopped afterwards. `/` has `X-Robots-Tag: noindex, nofollow`; the card page is gzipped (`Content-Encoding: gzip`, `Vary`); the font file answers `200`, `font/woff2`, `Cache-Control: public, max-age=31536000, immutable` and `X-Robots-Tag: noindex, nofollow`; the hashed CSS is gzipped, immutable and noindexed. The new health gate passed all four requests (version, `/`, card, font).
- [X] T073 Run `node scripts/check-build.ts dist --report`, record the real JS, CSS, font, HTML and total sizes in a note under this task, and compare them with plan.md § Performance budget. If a limit is wrong, change the constant in `scripts/check-build.ts` and the plan table together with a one-line reason (constitution VI).
  - **T073 real sizes (gzip level 6, `node scripts/check-build.ts dist --report`):** Saga page: JS 7066 B, CSS 5609 B, fonts 101860 B, HTML 41635 B raw, page 122875 B. Index: JS 5624, CSS 1777, fonts 101860, HTML 4816, page 111111. Limits: 12288, 8192, 112640, 51200, 153600. Every number is inside its limit (JS used 58%, CSS 68%, fonts 90%, HTML 81%, page 80%), so **no limit changed**. The JS estimate in plan.md was the router alone (5.7 KB); with `shell.ts` it is 7.1 KB. Headroom is smallest for fonts (10%) and HTML (19%); the HTML grows with the tree (83 ids) and with card length, so a long card is the first thing that will hit a limit.
- [X] T074 [P] Update `docs/DESIGN.md`: §6 Styling row (plain CSS tokens, Tailwind not used) and §8 (close the Tailwind question; note fonts are self-hosted via Astro's Fonts API).
- [X] T075 Run the whole [quickstart](quickstart.md) top to bottom (§1–§10) plus `npm run lint && npm test && npm run validate && npm run build && npm run check:build`. Record any finding that needs a spec or plan change under this task. Opening the PR, merging and deploying are outward actions that need Carlos's explicit confirmation, step by step.
  - **T075 run (2026-11-25):** §1 `npm test` 363 green; §2 `npm run validate` valid and the broken fixtures exit 1 with each of the nine new codes (and every Phase 1 code) in one run; §3 lint 0 errors and build prints `Copying fonts (3 files)`; §4 `check:build` passes and a scratch `dist/` with a 20 KB script exits 1 with "JavaScript is 25652 bytes (budget 12288)" (the scratch copy was deleted); §5–§10 done in T050, T058, T063, T068, T072 and T073. **Findings that need a spec or plan change:** (1) plan.md still named the two `@fontsource-variable/*` packages: fixed in this phase. (2) SC-006's "under 2 s on throttled Slow 4G" is not measured: re-check on the deployed site. (3) Font sizes are `px`, so a larger default text size in the browser is not honoured, only zoom: decide whether to move to `rem` (a spec question, FR on large text says "layout reflows", which holds). (4) Reduced motion was not run with devtools emulation. None blocks `/speckit-converge`. Opening the PR, merging and deploying were not done and need Carlos's explicit confirmation, step by step.
  - **Update 2026-11-26 (px vs rem, decided by Carlos):** all `font` and `font-size` declarations moved from `px` to `rem`, plus the status-line height and the tree/TOC column widths so larger text does not clip them. `tests/unit/font-units.test.ts` (red first: 4 failures) keeps `px` out of font declarations. Checked in Chrome with the root size simulated at 32 px (200%): body text 15 to 30 px, status line 28 to 56 px, no horizontal overflow at 1265, 390 or (24 px) 320 wide.
- [X] T076 End of session: update `docs/PHASES.md` (Phase 2 status and the `specs/002-design-system-card-layout` link) and `docs/TOPICS.md`, then give Carlos the ready-to-paste prompt for the next session.
  - Done 2026-11-26: PHASES.md and TOPICS.md updated; next-session prompt given to Carlos in chat.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** → none.
- **Foundational (Phase 2)** → Setup. Blocks every story. T022–T024 keep CI green once fonts and the router arrive.
- **US5 (Phase 3)** → Foundational. Blocks US1: the Saga card cannot render without format v2 and its components.
- **US1 (Phase 4)** → US5.
- **US2 (Phase 5)** → US1 (the shell wraps a rendering card).
- **US3 (Phase 6)** → US2 (the overlay is the tree and the top bar).
- **US4 (Phase 7)** → US2 for the skip link and landmarks; T067 audits everything built before it. T065–T066 can start once the shell exists.
- **Polish (Phase 8)** → all stories. T069–T071 may start after Phase 2; T072 needs both.

### Inside a phase

- A `Write failing tests` task precedes the implementation it names; run it and see it fail first.
- `[P]` test tasks for different modules can be written together.
- Component tasks that touch different files are `[P]`; `Shell.astro` (T055) waits for its four parts.

### Parallel opportunities

- Foundational test tasks T003, T005, T007, T010, T012, T014, T016, T018, T020, T022 touch different files and can be written in parallel (their implementations follow each).
- US5: T025, T027, T028, T030, T034, T036 and T039 are mutually independent.
- US1: T041, T042, T043, T046, T047 are independent.
- US2: T051–T054 are independent.

## Parallel Example: Foundational tests

```text
Task: "Write failing tests in tests/unit/meter.test.ts"      # T005
Task: "Write failing tests in tests/unit/path.test.ts"       # T010
Task: "Write failing tests in tests/unit/scroll.test.ts"     # T014
Task: "Write failing tests in tests/unit/menu.test.ts"       # T018
```

## Implementation Strategy

### MVP first (the card looks right)

1. Phases 1–2: fonts, tokens, pure modules, budgets, base layout.
2. Phase 3 (US5) then Phase 4 (US1).
3. **Stop and validate**: quickstart §6. The Saga page in the approved identity is the product; the shell is the frame around it.

### Incremental delivery

1. Add US2 (shell and persistence), validate §7.
2. Add US3 (phone), validate §8.
3. Add US4 (keyboard, motion, structure checks), validate §9.
4. Polish: nginx, health gate, real numbers, docs. Deploy only when Carlos asks.

### Notes

- Commit after each task or logical group, Conventional Commits, one concern each (for example `feat(layout): add meter and domain meter`).
- Never commit the scratch second card from T058.
- Constrained fields are defined only in data-model.md; the tasks above cite them rather than repeating the rules.

---

## Phase 9: Convergence

**Purpose**: gaps found by `/speckit-converge` (first pass, 2026-11-25). Test first where the task has logic: T077 before T078.

- [X] T077 Extend `tests/unit/contrast.test.ts` so it fails on the real gaps, per SC-007 and the T007 test list (partial): assert the status-line text colour with `--fg-faint` (the current test skips that pair), the diff text colours used in `src/styles/card.css` (`#b9e6cf` and `#f1c0c2` on their tints, `--ok`/`--bad` signs, the `--info` hunk header on its tint), and any text token that `card.css` or `shell.css` draws with `opacity` below 1 (composite the opacity over its surface first). It should fail on the tree's domain meter. Run it and see it fail.
  - Red first: the new status-line, diff and faded-text checks failed on `.tree .bar` (3.04:1) and nothing else. Helper pitfall found on the way: CSS comments must be stripped before reading selectors. A rule with `opacity` below 1 now has to be listed in the test, so a new one cannot skip the check.
- [X] T078 Make the tree's domain meter reach 4.5:1 per FR-025 / SC-007 (partial): in `src/styles/shell.css`, `.tree .bar` is `--fg-faint` at `opacity: 0.7`, which composites to about 3.0:1 on `--bg`. Remove the opacity (the colour already passes at 5.1:1) or lighten the colour, keep the meter below the domain name in emphasis by colour role rather than by fading, and make T077 green.
  - `.tree .bar` no longer fades; `--fg-faint` is 5.07:1 on `--bg`.
- [X] T079 Track the pointer for the Related spotlight per FR-031 / T040 (partial): the Related cards style a radial glow from `--mx`/`--my`, which nothing sets, so the glow stays centred. In `src/scripts/shell.ts` set those two properties on `.rel` from `pointermove` (a delegated listener, written as custom properties only, no HTML strings); it must not run under reduced motion beyond what the single reduced-motion rule already silences, and it must not add JS over the 12 KB budget (check `check:build`).
  - Checked in Chrome: a `pointermove` on `.rel` sets `--mx: 40px` and `--my: 20px`. JS 7141 B gzip, inside the 12 KB budget.
- [X] T080 Give the Go deeper external-link cue a text form for assistive technology per FR-019 and constitution V (partial): `src/components/Source.astro` marks `↗` `aria-hidden`, so a screen-reader user gets no cue that the link leaves the site. Add visually hidden text (for example "opens an external site") inside the link using the existing `.sr-only` class, keep the arrow decorative, and keep `source-malformed` and the fixtures unchanged.
  - Visually hidden text is a 1×1 px `.sr-only` span after the arrow; 3 sources carry it.
