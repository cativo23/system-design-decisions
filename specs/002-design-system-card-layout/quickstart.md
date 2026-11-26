# Quickstart: validating Design System & Card Layout

Runnable scenarios that prove the feature end to end. Contracts and shapes are linked, not
repeated. Run from the repo root on branch `002-design-system-card-layout`.

## Prerequisites

- Node 24 (`.nvmrc`), `npm ci` done.
- The two font packages are installed (added by the setup task).
- A Chromium browser with the Claude in Chrome extension, or any browser with devtools, for §6–§9.
- Docker, for §10. Port 8080 is busy on Carlos's machine: use another host port and a distinct
  container name.

## 1. Logic is green

```sh
npm test
```

Expect every suite green, including the new ones: `path`, `tree`, `meter`, `scroll`, `toc`,
`menu`, `typed-title`, `contrast`, the new card rules, `check-build` and `health-gate`.
Each new rule has a failing fixture (SC-008).

## 2. The Saga card passes the checks, broken ones do not

```sh
npm run validate
```

Expect `✓ 1 card(s) valid` and the staleness report. Then prove each new rule fails
([contracts/card-format.md § New rule codes](contracts/card-format.md#new-rule-codes)):

```sh
node scripts/validate-cards.ts --cards tests/fixtures/broken/cards --topics tests/fixtures/broken/TOPICS.md
```

Expect exit 1 and, among the failures, each of `related-why-missing`, `use-avoid-shape`,
`tradeoffs-shape`, `meter-missing`, `meter-range`, `wild-entry-malformed`, `pitfall-malformed`,
`source-malformed` and `tldr-shape`, plus every Phase 1 code, all in one run.

## 3. Lint, types and build

```sh
npm run lint && npm run build
```

Expect no errors. The build log shows `Copying fonts (3 files)`.

## 4. Budgets and structure

```sh
npm run check:build
```

Expect `✓ 2 page(s) within budget and noindexed`. Print the real numbers once and record them in
`tasks.md` (R11 says to re-measure):

```sh
node scripts/check-build.ts dist --report
```

(`--report` prints each page's JS, CSS, font, HTML and total sizes. It is a usage aid, not a
gate.) To prove the gate bites, add a 15 KB script to a scratch copy of the layout and confirm
exit 1 naming the JS budget.

## 5. Preview the page

```sh
npm run preview
```

Open `/cards/saga/` at the printed address.

## 6. Fidelity to the mockup (US1, SC-001)

At 1440 px wide, open `docs/mockups/saga-card.html` in one window and the Saga page in the
other. Walk both top to bottom and tick each element of
[spec FR-009–FR-020](spec.md#functional-requirements):

- breadcrumb and typed title with caret · radar badge, `reviewed 2026-11`, tags
- TL;DR panel · `##` headings · diff Use/Avoid with `+`/`-`
- trade-offs table with meters and the hint · `ls` block marked volatile with the verified date
- WARN pitfalls, collapsed · Related · Go deeper · pager

Expected, documented differences (FR-031): no command palette, no nav links, no shortcut hints,
no progress panel, no simulation, no reading time; the search trigger is shown unavailable with no
`⌘K` hint; at phone width a menu button appears (added, FR-031); the Related grid and the pager show their
unwritten cards without a radar badge and without a link; the domain number is 05 (not 04);
`--fg-faint` is a little lighter. Anything else is a defect.

Check the glyph alignment note ([R2](research.md#r2-fonts-self-hosted-through-astros-fonts-api)):
the tree's `├──` columns and `▱▱▱▱` meters line up row to row, and the meters' `█░` cells line up
in the table.

## 7. The shell and persistence (US2, SC-002)

1. In a scratch copy, make a second written card: copy `src/content/cards/saga.mdx` to
   `src/content/cards/idempotency.mdx`, set `id: idempotency`, `title: Idempotency`, and use only
   ids that exist in `TOPICS.md`. Restart `npm run dev`. **Delete the file when done; never
   commit it.**
2. On Saga, open two other domains in the tree and scroll the tree down. Scroll the page to the
   middle and note the status line (`N%`).
3. Click `idempotency` in the tree (and again via a Related entry, and via the pager).
   Expect: no white flash; the tree keeps its scroll and open domains; the status line stays on
   screen with the new file, domain progress and radar status; the page starts at the top and
   focus is on the new title; Back and Forward restore the previous card.
4. If the tree's scroll resets, add the save/restore on `astro:before-swap` / `astro:after-swap`
   ([R5 contingency](research.md#r5-navigation-and-persistence-clientrouter-persist-the-tree-only)).
5. Scroll to the end: the status line shows `bot`; scroll to the top: `top`. Click each TOC
   entry: the section heading lands below the top bar and its TOC entry is highlighted.

## 8. Phone width (US3, SC-005)

In devtools, set widths 320, 390 and 768, then:

- no horizontal page scroll; text readable without zoom; the last lines clear the status line
- the Trade-offs table scrolls inside its frame
- at 390: the menu button opens the tree overlay; close with the close control, Escape and a tap
  outside; choosing a card closes it; while open the page behind does not scroll; Tab wraps inside
  it; focus returns to the button
- at 1000: the table of contents is gone and the tree remains
- at 320 with the browser zoomed to 200%, and again with a larger default text size: the layout
  reflows and nothing is clipped or unreachable
- the root index (`/`) uses the dark theme and the new fonts, with its structure unchanged

## 9. Keyboard, reduced motion, scripts blocked (US4, SC-003, SC-004, SC-009)

- **Keyboard only**: Tab from the top. The first stop is the skip link; Enter lands on the title.
  Every other stop shows a focus ring; open and close each pitfall with Enter and Space; follow a
  Go deeper link and a pager entry.
- **Reduced motion**: devtools → Rendering → emulate `prefers-reduced-motion: reduce`, reload.
  The title is complete at once, the caret is steady, nothing fades, slides or lifts, and
  moving between cards is instant.
- **Scripts blocked**: devtools → disable JavaScript, reload. The card is fully readable, links
  are ordinary loads, the tree's domains still open and close; the typed title, TOC highlight
  and scroll position are absent.
- **Search trigger**: Tab reaches it, the screen reader announces it as unavailable, and
  activating it does nothing.
- **Layout shift**: devtools → Network: Slow 4G, reload; the Performance panel (or the Layout
  Shift Regions overlay) shows shift ≤ 0.1 and the card text appears in under 2 s (SC-006).
- **Contrast**: `npm test -- contrast` is green (R10).
- **TL;DR**: a card whose TL;DR has two paragraphs fails `npm run validate` with `tldr-shape`.

## 10. Production image

```sh
docker build -t sfg-phase2 --build-arg GIT_SHA=local .
docker run --rm -d --name sfg-phase2 -p 8081:8080 sfg-phase2
curl -sI localhost:8081/ | grep -i x-robots-tag
curl -s -H 'Accept-Encoding: gzip' -o /dev/null -w '%{size_download}\n' localhost:8081/cards/saga/
FONT=$(curl -s localhost:8081/ | grep -o '/_astro/fonts/[^"]*\.woff2' | head -1)
curl -sI "localhost:8081$FONT" | grep -iE 'x-robots-tag|cache-control'
docker stop sfg-phase2
```

Expect `noindex` on `/`; a gzipped card page of a few KB; on the font, `noindex` **and**
`Cache-Control: … immutable` (the `/_astro/` location kept the header, R12).

## 11. After the next deploy

Run the deploy action (owner-triggered, outward: ask first). The health gate now makes four
requests per round and must pass; then open
`https://architecture.cativo.dev/cards/saga/` and repeat §6 once on production.
