# Contract: Routes, Shortcuts, Palette and Shell

Extends [002 ui-contract.md](../../002-design-system-card-layout/contracts/ui-contract.md).
Rationale: [research.md R2, R5, R7](../research.md).

## Routes (all static, all `noindex`, all inside the shell)

| Path | Page kind | Content | Spec |
|---|---|---|---|
| `/` | `home` | hero, two entry points, 13 domain tiles, freshness strip (replaces the Phase 1 index) | FR-013..015 |
| `/catalog/` | `catalog` | all 13 domains with `published / total` | FR-008 |
| `/catalog/<domain-slug>/` | `domain` | that domain's entries in path order | FR-009 |
| `/path/` | `path` | every domain and entry in path order, start point at the first published card | FR-010 |
| `/radar/` | `radar` | four groups adopt, trial, assess, hold, always present | FR-011 |
| `/search-index.json` | n/a | the index ([search-index.md](search-index.md)) | FR-007 |
| `/cards/<id>/` | `card` | unchanged, gains `j`/`k` and the palette | FR-012 |

Trailing slashes as today. Every page has exactly one `<h1>`, the skip link, landmarks, the
`[hidden]` rule and the reduced-motion block (the Phase 2 structure checks), **including the
home** (the old exemption is removed).

## Entry rows (domain and path pages, home tiles, catalog)

- Published: a link to the card with its radar badge (`ADOPT`, `TRIAL`, `ASSESS`, `HOLD`) using
  the existing badge styles.
- Not published: plain text, no link, no radar badge, dimmed, with a visually hidden
  "not yet available" (the same pattern the tree uses).
- No toggle to hide unwritten entries and no MVP/later label (FR-009).
- The path page's start point is a link "Start with <first published card title>"; if no card
  is published the point is plain text saying none is available yet.

## Top bar

- Search trigger: a real `<button>` (the `aria-disabled` and "not available yet" label are
  removed), accessible name "Search", showing the hint `/` and `⌘K`/`Ctrl+K` as `<kbd>`.
  Activating it opens the palette (FR-001). With scripts blocked it is `hidden` (R7).
- `nav aria-label="Primary"` with links `catalog`, `path`, `radar`; at ≤ 880 px the same links
  are the first block of the phone menu.

## Shortcuts (bound once on `document`, never re-bound per page)

| Keys | Where | Does |
|---|---|---|
| `⌘K` / `Ctrl+K` | anywhere, even in a text field | opens the palette; `preventDefault` |
| `/` | when focus is not in an editable field (`input`, `textarea`, `select`, `contenteditable`) and no modifier is held | opens the palette; `preventDefault` |
| `j` | card page, palette closed, focus not in an editable field, no modifier | scroll to the next section after the one highlighted in the table of contents |
| `k` | same | scroll to the previous section |
| any other modifier combination | | left to the browser |

`j`/`k` use the section the TOC currently highlights, so they work after manual scrolling
(FR-012, SC-013). At the first/last section they do nothing; above the first heading `j` goes to the first section and `k` does nothing. On pages that are not a card they
do nothing. Scrolling uses `scrollIntoView` with `behavior: 'auto'` when reduced motion is set
and `'smooth'` otherwise. A shortcut hint (`j / k  sections`, `/  search`) is shown in the
status line's right side on wide screens and hidden on phones (`hide-sm`).

## Palette (`<dialog id="palette">`, opened with `showModal()`)

```
<dialog id="palette" aria-labelledby="palette-title">
  <h2 id="palette-title" class="sr-only">Search cards</h2>
  <input type="search" role="combobox" aria-expanded aria-controls="palette-results"
         aria-activedescendant aria-label="Search titles, aliases and tags" autocomplete="off">
  <ul id="palette-results" role="listbox"> <li role="option" id="palette-opt-N" aria-selected> … </ul>
  <p id="palette-status" role="status"> loading / empty / error / hint </p>
</dialog>
```

- **Focus**: the input is focused on open; Tab stays inside (modal dialog); Esc and a click on
  the backdrop close it; on close focus returns to the element that had it before (FR-005).
- **Results**: up to 8 rows; each shows title, domain name and the radar badge (FR-004), all as
  text nodes. ArrowDown/ArrowUp move the cursor (wrapping), Enter follows the highlighted row's
  link, a click does the same. The highlighted row has `aria-selected="true"` and is the
  input's `aria-activedescendant`.
- **States** (the `role="status"` line): hint on empty query; "Loading…" while the index is
  not ready; "No cards match “<query>”." (text node) when nothing matches (scenario 6); the
  error line when the index failed.
- **Navigation**: following a result uses the router like any link; the dialog closes on
  `astro:before-swap`; the shell, the tree scroll position and the open domains are untouched
  (FR-022, SC-012). Afterwards the shortcuts still work because their listeners are on
  `document`.
- **Styling**: plain tokens; backdrop uses `::backdrop`; the open transition is a short
  opacity fade that `prefers-reduced-motion: reduce` removes (FR-018). `[hidden]` is not used to
  hide the dialog (it is closed natively), so the `!important` rule is unaffected.
- **Contrast**: all new text uses existing tokens that already pass 4.5:1; the contrast unit
  test is extended with the new foreground/background pairs (FR-019).

## Status line (clarified)

Fields per page kind are in [data-model.md § PageKind and StatusFields](../data-model.md#pagekind-and-statusfields).
The line stays on every shell page; it is `aria-hidden` as today (the same facts are in the page).

## Without scripts (SC-010)

Home, catalog, domain, path and radar are plain HTML and every link works. The palette trigger
and the home's search button are hidden (no `html[data-js]`), the tree's `<details>` still open,
and the home keeps its other entry point (the learning path).
