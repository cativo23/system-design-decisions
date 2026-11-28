# Quickstart: validating Discovery

Runnable scenarios that prove the feature end to end. Contracts and shapes are linked, not
repeated. Run from the repo root on branch `003-discovery-search-paths`.

## Prerequisites

- Node 24 (`.nvmrc`), `npm ci` done. No new package is installed by this feature.
- A browser with devtools (or Claude in Chrome) for §5–§9.
- Docker for §10. Port 8080 is busy on Carlos's machine: use another host port and a distinct
  container name (for example `-p 8089:8080 --name sfg-3`).

## 1. Logic is green

```sh
npm test
```

Expect every suite green, including the new ones in [research.md R9](research.md#r9-test-strategy):
`match`, `catalog`, `search-index`, `radar`, `freshness`, `keys`, `palette-state`,
`status-fields`, the `order-matches-topics` rule and the extended `check-build` and
`health-gate`. Each new behaviour was seen failing first (constitution VII).

## 2. Content validates, the order rule bites

```sh
npm run validate
```

Expect `✓ 1 card(s) valid`. Then change `order` in `src/content/cards/saga.mdx` to `4`, rerun
and expect a failure naming `order-matches-topics`; revert.

## 3. Build, budgets and index

```sh
npm run build && npm run check:build && npm run check:build -- --report
```

Expect all pages within the budgets in [contracts/build-budget.md](contracts/build-budget.md),
`dist/search-index.json` present (one entry today) and within 12 KB gzipped, and the home no
longer exempt. Record the `--report` numbers in research.md R8.

## 4. Pages render from one source

```sh
npm run preview
```

Open `/`, `/catalog/`, `/catalog/distributed-data/`, `/path/`, `/radar/`. Check: 13 tiles with
`published / total` matching `docs/TOPICS.md`; Saga linked with its radar badge, every other
entry dimmed "not yet available" with no link; four radar groups with three of them showing the
empty text; the freshness strip lists Saga with its status. Each topic appears once on the path
(SC-005). Status line shows `home`, `catalog`, `path`, `radar` and, on the domain page, the
domain only.

## 5. Palette by keyboard alone (SC-001, scenarios 1–6)

On any page: `Ctrl+K` (and `/` outside a field) opens it with the field focused. Type
`distributed transactions`, `consistency` and `sga`: Saga is listed with domain and status each
time. `↓`/`↑` then `Enter` opens the card; `Esc` closes it and focus returns where it was.
`xyzzy` shows the "No cards match" line. Time yourself: from any page to an opened card by keyboard alone takes under 5 seconds (SC-001), and results appear with no visible lag after each keystroke (SC-003). Open and close the palette ten times quickly with `Ctrl+K` and `Esc`: it never ends half open. Type `/` inside a text field elsewhere (use the
console to add one): no palette. Regex characters (`(`, `[a-`) do not break it.

## 6. Shell stays put (FR-022, SC-012)

Scroll the tree and open two domains. Open a card from the palette, then go to `/catalog/`,
`/path/` and back: the tree keeps scroll and open domains, the status line stays on screen, and
`Ctrl+K`, `/`, `j` and `k` still work after every move. After navigating, open the palette again and search: it must be the new page's dialog, with no duplicated results or double focus.

## 7. `j` and `k` (SC-013)

On the Saga card, at the very top (above the first heading), `j` goes to the first section. Then press `j` through every section and `k` back; at the ends nothing breaks.
Scroll by hand to the middle of a section, press `j`: the next section follows the one the TOC
highlights. With the palette open or the cursor in a text field, `j`/`k` type normally. On
`/catalog/` they do nothing.

## 8. Offline (SC-004)

Load a page, wait for idle (about a second), set devtools Network to **Offline**, open the
palette and search: results still appear. Also open the palette immediately on a cold load with
the network already offline: expect the error line, not a blank dialog.

## 9. Phone, no script, motion (SC-007, SC-008, SC-010)

At 320 px: no horizontal scroll on `/`, `/path/`, `/radar/`; the primary links are inside the
phone menu. With scripts blocked (devtools "Disable JavaScript"): the five pages read fine,
every link works, the palette trigger is not shown. With reduced motion on: no animation on the
new pages.

## 10. Container and health gate

```sh
docker build -t sfg:local . && docker run --rm -d -p 8089:8080 --name sfg-3 sfg:local
node scripts/health-gate.ts --origin http://localhost:8089
docker stop sfg-3
```

Expect the new `/search-index.json` request to pass along with the existing ones. Do not stop
containers you did not start.
