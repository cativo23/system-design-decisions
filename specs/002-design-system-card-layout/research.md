# Research: Design System & Card Layout

Sources are official docs (docs.astro.build, nginx.org) plus spikes run on 2026-11-25 in throwaway
copies of the repo (Astro 7.4.13, Node 24.15). A result is recorded as **verified** only when it
was observed directly; everything else is marked **not verified** and has a fallback.

## R1. Styling: plain CSS tokens, no Tailwind

**Decision**: plain CSS. The mockup's custom properties become `src/styles/tokens.css`; shared
base rules go in `src/styles/global.css`; component styles stay in the Astro component's own
`<style>`; card-body rules are scoped with the section ids in `src/styles/card.css` (R3).

**Rationale**:
- The mockup is already tokenized CSS: 17,057 bytes minified, 4,690 gzipped, and that includes
  the palette and simulator rules this phase leaves out. Porting is mostly a move, not a rewrite.
- The card body is MDX output. Markdown elements carry no class attributes, so utility classes
  cannot reach them without `@apply` or a typography plugin, which would put a second styling
  system next to the first. Plain CSS reaches them directly with `h2#pitfalls + …` (R3).
- Tailwind v4 means a new dependency and build plugin for no reader benefit (constitution VIII).
  DESIGN §6 already names "CSS custom-property tokens from the mockup" as the default.

**Alternatives**: Tailwind v4 via `npx astro add tailwind` (rejected above). CSS Modules
(rejected: Astro's scoped styles already give scoping).

**Revisit when**: a phase adds a component-heavy UI (Phase 5's simulator, if it ends up as a
React island with many variants).

## R2. Fonts: self-hosted through Astro's Fonts API

**Decision**: self-host Geist Mono and Inter with Astro's built-in `fonts` configuration (the
official guide, "Using custom fonts"). woff2 only; Geist Mono variable `400 600`, subsets
`latin` + `symbols2`; Inter variable `400 600`, subset `latin`. Fallbacks `ui-monospace,
monospace` and `system-ui, sans-serif`. Render `<Font cssVariable=… preload />` in the base
layout. The provider is `fontProviders.npm()` reading `@fontsource-variable/geist-mono` and
`@fontsource-variable/inter` from `node_modules` (pinned by the lockfile), with
`fontProviders.fontsource()` as the fallback.

**Rationale**:
- Google Fonts would add a third-party origin on every page view, breaking Phase 1's
  "0 third-party origins" budget and sending readers' IPs to a third party. Self-hosting needs
  no service and the files cache for a year.
- **Verified**: with `fontProviders.fontsource()` the build copies the files to
  `dist/_astro/fonts/`, emits `@font-face` with `unicode-range` per subset, adds
  `<link rel="preload">`, and generates size-adjusted fallbacks (`size-adjust`,
  `ascent-override`) so the swap does not shift the layout (FR-030).
- **Verified, and the reason for `symbols2`**: Geist Mono's `latin` subset has none of the
  box-drawing and block glyphs the design relies on (`├ │ ─ █ ░ ╔`). They live in `symbols2`
  (U+2500–259F). Without it the tree and the ASCII meters fall back to a system font and the
  columns drift.
- **Verified gap**: Geist Mono has no glyph at all for `❯ ▰ ▱ ✓ ○ ● ◀ ▶ ▼ ▲ ◌ ↺ ↗ ✕`. These
  render in the fallback monospace. Each tree row and meter uses the same count of them, so
  columns stay aligned; the quickstart checks this by eye.
- Measured sizes (woff2): Inter latin 72,920 B; Geist Mono latin 23,128 B; `symbols2` 5,812 B;
  total 101,860 B.
- The mockup asks Inter for an `opsz` axis (14..32). The Fontsource variable file has `wght`
  only. Inter is used at 15–17 px for reading, where optical sizing is imperceptible, so the axis
  is dropped.

**Not verified**: `fontProviders.npm()` against these two packages (the docs describe it and
the spike used `fontsource()`). The first implementation task tries it; on failure, switch to
`fontsource()`, which needs network at build time (the Docker build already needs it for
`npm ci`). Either way the runtime has no third-party origin.

**Alternatives**: Google Fonts (rejected above); the `local` provider with committed binaries
(rejected: 100 KB of binary in git when the lockfile can pin them).

## R3. Rendering the structured sections: MDX component mapping, no plugin

**Decision**: render the card body with `<Content components={…} />` (the Phase 1 pattern,
R6 there) and add three kinds of mapping. No markdown plugin, no `set:html`.

1. **Standard tags remapped** to layout components: `h2` → `SectionHeading` (adds the `##`
   marker, the section's stable id, and for *In the wild* the `❯ ls …` command line), `h3` →
   `Subheading` (adds `data-kind="use"|"avoid"` for the diff headers), `table` → `TableFrame`
   (the scroll frame, FR-029).
2. **Small authored components** for the data markdown cannot carry: `<Meter n={…} />`,
   `<Pitfall title="…">`, `<Source kind="…" href="…">`, plus the existing `<RelatedCards />`.
3. **Section-scoped CSS** for everything that is only a restyle. The template is fixed, so the
   section ids are stable (`#when`, `#wild`, …) and CSS such as `h2#when ~ h3[data-kind="use"] + ul
   > li::before { content: "+" }` renders the diff, and `h2#tldr + p` renders the TL;DR panel,
   with the real lists and paragraphs left in the DOM for assistive technology.

**Rationale**:
- **Verified** on 7.4.13 (Sätteri pipeline): JSX inside a GFM table cell
  (`| cost | <Meter n={3} /> text |`), block JSX with markdown children
  (`<Pitfall title="…">…**bold**…</Pitfall>`), and remapping `h2` and `table` all render as
  expected. `TL;DR` gets the heading id `tldr`.
- Astro 7's default markdown engine is Sätteri, whose plugin API is new; `remarkPlugins` now
  needs the legacy `unified` path. Avoiding plugins avoids both.
- Each component is presentational with a typed prop, so the validator can check the data
  (R4) with the same line scanner as Phase 1.

**Alternatives**: a remark/rehype plugin that rewrites each section into components (rejected:
new unverified API, extra dependency); re-parsing the raw body at render time and ignoring the
MDX output (rejected: prose sections would then need a second markdown renderer).

**Accepted limits**: the TL;DR panel styles the one paragraph after its heading, so the
validator enforces exactly one paragraph (`tldr-shape`; DESIGN says 2–3 sentences). A table
elsewhere than in Trade-offs gets the scroll frame but no meters.

## R4. Card format v2 (what authors write)

Full grammar in [contracts/card-format.md](contracts/card-format.md). Summary:

| Layout element | Authored as | Why there |
|---|---|---|
| Trade-offs levels | `<Meter n={0..6} />` at the start of each approach/alternative cell | the data sits next to the text it describes |
| Related reasons | frontmatter `related: [{ id, why }]` | the ids are already in frontmatter; one list, no duplicate (FR-021) |
| Source kinds | `- <Source kind="paper" href="https://…">Title</Source>` | a kind label needs its own element to be styled |
| Pitfalls | `<Pitfall title="…">body</Pitfall>` blocks | title and body need separate elements for `<details>` |
| In the wild | `- **name** description`, name in directory form (`aws-step-functions`) | CSS alone can render `name/` and a two-column row from this |
| TL;DR | exactly one paragraph | the panel styling hangs off the single paragraph after the heading |
| Use / Avoid | exactly `### Use it when` then `### Avoid it when`, each with a list | the diff headers and signs hang off these two headings |

`related` changes from a list of ids to a list of `{ id, why }` objects. This is a breaking
change to Phase 1's frontmatter, which is why the Saga card, the schema, the related-id rule,
`RelatedCards`, the fixtures and the Phase 1 contract all change together (one task group).

## R5. Navigation and persistence: ClientRouter, persist the tree only

**Decision**: add Astro's `<ClientRouter />` (View Transitions, the official guide) to the base
layout. Mark the tree `transition:persist="tree"`. The top bar and the status line are rendered
by the server on every page and are **not** persisted.

**Rationale**:
- The only shell state worth preserving is the tree's scroll position and its open domains.
  The status line's fields (domain, file, radar status, progress) change on every navigation, so
  persisting it would need extra code to rewrite them; re-rendering it costs nothing because the
  swap replaces it with an identical-looking element in the same frame. The status line still
  "stays in place" for the reader, which is what FR-007 asks for. This deviates from the plan
  prompt's wording ("persist … status line") and is listed for the owner's confirmation.
- **Verified**: `<ClientRouter />` ships as one external script, 16,641 B raw / 5,716 B gzip.
- **Verified**: Astro's view-transition CSS already contains
  `@media (prefers-reduced-motion) { ::view-transition-* { animation: none !important } }`, so
  shell transitions are instant under reduced motion with no code of ours (FR-027).
- With scripts blocked, `<a>` links are ordinary page loads and the tree (native `<details>`)
  still works (FR-008).
- The router announces the new page title to screen readers. We add one small handler on
  `astro:page-load` that moves focus to the new card's `h1` (`tabindex="-1"`), the focus part of
  FR-007.

**Not verified**: whether a persisted element keeps its `scrollTop` when Astro moves it into the
new document. The quickstart checks it. **Contingency** (a task only if the check fails): save
`scrollTop` on `astro:before-swap`, restore it on `astro:after-swap`.

**Events used**: `astro:page-load` (initialise per page), `astro:before-swap` (close the phone
menu). Module scripts run once, so every per-page behaviour is initialised from `astro:page-load`.

## R6. Tree, path order, pager and domain totals

**Decision**: one pure module builds the whole tree from `docs/TOPICS.md` (already parsed by
`parseTopics`) plus the set of written ids. Path order is the order of topics in the file (domain
number, then position), which is the master register (constitution I, Phase 1 R5).

- Domain row: number, slug, `read/total` where `total` = topics in the domain and `read` = 0
  (FR-004).
- Card row: written → link; unwritten → text with a visually hidden "not yet available".
- Pager: previous/next in path order across domains; an unwritten neighbour is shown unlinked.
- Domain meter: four segments, `▱▱▱▱` at zero (`domainMeter(read, total)` is pure so Phase 4
  only passes real numbers).

The frontmatter `order` stays as Phase 1 defined it and is not read by the new code. It agrees
with the position in TOPICS today (Saga is `order: 3`, third in its domain); keeping the two in
step is not enforced here.

**Rendering size**: 13 domains + 83 cards ≈ 14 KB of HTML per page, inside the 50 KB HTML budget.

## R7. Client scripts: thin glue over tested pure functions

**Decision**: no React and no island in this phase (constitution VIII). `src/scripts/shell.ts`
is the only client script. It does DOM wiring only; every decision it makes comes from a pure
function in `src/lib/layout/`, written test-first:

| Function | Decides |
|---|---|
| `scrollLabel(scrollY, maxScroll)` | `top` / `N%` / `bot` (FR-006) |
| `currentSection(tops, line)` | which TOC entry is highlighted (FR-005) |
| `treeCurrent(pathname, tree)` | which card row is current and which domain opens |
| `nextMenuState(state, event)` | phone menu open/closed transitions (R8) |
| `nextFocusIndex(i, count, shift)` | Tab wrap inside the open menu |
| `isTypable(title)` | whether the title gets the typing animation (R9) |
| `contrastRatio(fg, bg)` | the contrast test over the tokens (R10) |

The glue itself (listeners, DOM updates) is presentational and is verified in the browser
(quickstart), as constitution VII allows.

## R8. Phone menu overlay

**Decision**: at the phone breakpoint the tree element becomes a full-height overlay opened by a
top-bar menu button (FR-029). Behaviour: `aria-expanded` on the button; close control, Escape,
a tap on the backdrop and choosing a card all close it; while open, the rest of the page
(`header`, `main`, the table of contents) is `inert` and the page behind does not scroll; Tab
wraps inside the overlay; focus returns to the button on close. Tap targets are at least 44 CSS
px.

**Rationale**: `inert` gives containment without a focus-trap library; the wrap handler is ten
lines. A native `<dialog>` was rejected because the tree is also the desktop sidebar and a
persisted element: it cannot be a modal in one layout and a sidebar in the other without moving
nodes.

**Limit**: the menu needs scripts. With scripts blocked, phone readers still reach cards through
related entries and the pager (FR-008 allows the extras to be absent).

## R9. Typed title and the load sequence

**Decision**: the typing animation and the staggered "rise" are CSS only. The title sets
`--len` (its character count) inline; width and `steps()` use it, so no per-title CSS. The
animation applies only when `isTypable(title)` (≤ 14 characters, which fits one line at the
largest title size); longer titles are shown whole and wrap (edge case in the spec).
`prefers-reduced-motion: reduce` removes every `animation` and `transition` and the smooth
scroll, through one rule at the end of the base CSS, plus Astro's own rule for view transitions
(R5).

**Not verified**: `steps(var(--len))`. Custom properties are substituted before parsing, so it
should hold; the quickstart checks it, and the fallback is `steps(14)` with `width` set per
title in an inline `style`.

## R10. Contrast: one token changes

**Decision**: `--fg-faint` goes from `#5d626b` to `#7d828c`; every other text token already
passes. Measured against the mockup's surfaces (4.5:1 needed):

| Token | on `#07080a` | `#0c0d10` | `#14161a` (hover) | `#0b0c0f` (status) |
|---|---|---|---|---|
| mockup `--fg-faint` `#5d626b` | 3.27 | 3.17 | 2.95 | 3.19 |
| new `--fg-faint` `#7d828c` | 5.19 | 5.04 | 4.70 | 5.07 |

`--fg-muted` (7.3+), `--info`, `--warn`, `--bad` (5.4+), `--ok`, `--run` all pass. The "not yet"
tree glyph used `--line-strong` (1.4:1); it moves to `--fg-faint`. Hairlines and the tree
connectors (`├──`) stay as they are (decorative, exempt by FR-025). A unit test reads
`tokens.css` and asserts every text token against every surface it is used on (SC-007).

## R11. Performance budget (constitution VI)

Per HTML page, enforced by `npm run check:build`. Text is measured **gzipped at level 6**
(R12 makes nginx serve it that way); fonts are woff2 as served. All limits are per page.

| Budget | Phase 1 | Phase 2 | Basis |
|---|---|---|---|
| JavaScript (same-origin, gzip) | 0 B | **≤ 12 KB** | measured router 5.7 KB + our script, est. ≤ 4 KB, + margin |
| CSS (inline + same-origin, gzip) | ≤ 2 KB | **≤ 8 KB** | mockup 4.7 KB incl. out-of-scope rules, + tokens, menu, responsive |
| Fonts (woff2 referenced by the page's CSS) | n/a | **≤ 110 KB** | measured 101.9 KB |
| HTML (raw) | ≤ 50 KB | **≤ 50 KB** (unchanged) | tree adds ≈ 14 KB |
| Whole page (HTML + CSS + JS + fonts, as transferred) | n/a | **≤ 150 KB** | sum of the above with margin |
| Third-party origins | 0 | **0** | fonts and router are self-hosted |

`check-build` changes: parse `@font-face` `url()`s and preload links to size fonts; size
same-origin scripts and stylesheets (inline and external) by gzip; fail when any limit is
exceeded; keep the noindex and off-origin checks; drop "no `<script>` at all". It also asserts
static structure in `dist/` that FR-026–FR-028 need: one `<h1>`, a skip link as the first link,
labelled landmarks, the `[hidden]` rule and the reduced-motion block present in the CSS.

**Re-measure** at the end of implement; if a limit is wrong, change it in the plan with a
reason (constitution VI) rather than silently raising it.

## R12. nginx: gzip and long-lived caching for hashed assets

**Decision**: add to `nginx/default.conf`: `gzip on; gzip_comp_level 6; gzip_vary on;
gzip_min_length 1024;` and `gzip_types` for CSS, JS, JSON and SVG (HTML is compressed by
default). Add `location /_astro/ { … }` with `Cache-Control: public, max-age=31536000,
immutable`.

**Known gotcha (Phase 1 R10)**: a `location` that declares its own `add_header` drops the
server-level `X-Robots-Tag`. The `/_astro/` block therefore repeats
`add_header X-Robots-Tag "noindex, nofollow" always;`, and the health gate asserts it (R13).

**Why**: fonts are about 100 KB and should be fetched once; hashed filenames make immutable
caching safe.

## R13. Health gate additions

The gate gains one request: the first font file linked from `/` (found in
`<link rel="preload" as="font">`) must return `200`, `X-Robots-Tag` containing `noindex`, and a
`Cache-Control` containing `immutable`. This proves the `/_astro/` location kept the noindex
header and the caching rule in production. Everything else in the gate is unchanged (FR-023).

## R14. Test strategy

| Layer | What | Tool |
|---|---|---|
| Unit (red → green) | the pure functions in R7, path/tree/pager builders, meter strings, the new card rules, `checkPage` budgets and structure checks, health-gate font check, token contrast | Vitest |
| Build output | one `<h1>`, skip link, landmarks, `[hidden]`, reduced-motion block, budgets | `check:build` over `dist/` in CI |
| Browser, manual | mockup fidelity, tree scroll persistence, menu overlay, keyboard walk, reduced motion, 320 px, JS blocked | Claude in Chrome per [quickstart.md](quickstart.md) |

No Playwright: an end-to-end runner is a new dependency and browser download in CI for checks
that run once per phase on one page (constitution VIII). Revisit if regressions appear.

## R15. The Saga card and the second card

The Saga card is rewritten to format v2 (meters, `why` on its three related cards, `<Source>`
and `<Pitfall>` markup, directory-style names in In the wild). Its prose is unchanged. Shell
persistence needs two written cards; the quickstart makes a scratch second card by copying the
Saga file to another planned id (for example `idempotency`) and deleting it afterwards. It is
never committed.

## R16. Not verified, with fallbacks

| Item | Fallback |
|---|---|
| `fontProviders.npm()` with the two Fontsource packages | `fontProviders.fontsource()` (verified) |
| Persisted tree keeps `scrollTop` | save/restore on the swap events (R5) |
| `steps(var(--len))` | per-title inline `width` and `steps(14)` (R9) |
| Astro 7 `compressHTML: 'jsx'` default keeps the tree's padded spaces | build the padded strings in one expression, or set `compressHTML: true` |
| Fallback monospace aligns `❯ ▰ ▱ ✓ ○` acceptably | draw them with CSS or swap for glyphs Geist Mono has |
