# Data Model: Design System & Card Layout

Everything is derived at build time from files in the repository. Nothing is stored at runtime
and no reader state exists in this phase. Phase 1's entities (Card, Domain, TopicEntry,
CheckFailure, StaleEntry) stay as they were except where this file says "changed".

## Card (changed: `related`)

| Field | Was | Now | Source requirement |
|---|---|---|---|
| `related` | `string[]` of ids | **`{ id, why }[]`**. `id` is a known id (written or planned), not the card's own, and unique in the list. `why` is a non-blank one-line string. May be `[]`. | FR-021, FR-022 |

All other frontmatter fields are unchanged. The body gains the element rules in
[contracts/card-format.md](contracts/card-format.md).

## TemplateSection (new, constant)

The nine fixed sections, defined once in `src/lib/cards/template.ts` and imported by the
validator (for the required list) and by the layout (for ids and the table of contents).

| Field | Type | Example |
|---|---|---|
| `title` | string | `Use it when / Avoid it when` |
| `id` | string | `when` (the anchor; `tldr` for TL;DR) |
| `tocLabel` | string \| null | `use-avoid` (`null` for TL;DR: it is a panel, not a TOC entry) |

The ids and labels are the mockup's: `tldr`, `problem`, `how`, `when`, `tradeoffs`, `wild`,
`pitfalls`, `related`, `deeper`; labels `problem`, `how-it-works`, `use-avoid`, `trade-offs`,
`in-the-wild`, `pitfalls`, `related`, `go-deeper`.

## TradeoffRow, Pitfall, Source, WildEntry (validated shapes)

These are not stored; the validator recognises them in the body (contract) and the components
render them.

| Shape | Fields | Rules |
|---|---|---|
| TradeoffRow | `dimension`, `approach: {n, text}`, `alternative: {n, text}` | `n` is an integer 0–6 from `<Meter n={…} />` at the start of the cell; `text` non-blank; table has exactly 3 columns; one row's `dimension` is `cost` (Phase 1) |
| Pitfall | `title`, `body` | both non-blank; at least one per card |
| Source | `kind`, `href`, `title` | `kind` non-blank lowercase word; `href` an `https://` URL; `title` non-blank; at least one per card |
| WildEntry | `name`, `description` | `name` matches `^[a-z0-9][a-z0-9.-]*$`; `description` non-blank; at least one per card |

## PathEntry (new, derived)

One element of the learning-path sequence: every topic in `docs/TOPICS.md`, in file order.

| Field | Type | Notes |
|---|---|---|
| `id` | string | the card id |
| `title` | string | from TOPICS |
| `domainNumber` | 1–13 | from TOPICS |
| `written` | boolean | a card file with this id exists |
| `status` | RadarStatus \| null | only when `written`; `null` otherwise (clarification 1) |

`neighbors(path, id)` → `{ prev: PathEntry | null, next: PathEntry | null }`. The first entry
has no `prev`, the last has no `next` (FR-020).

## Tree (new, derived)

`buildTree(topics, writtenIds, currentId)` returns 13 `TreeDomain`:

| Field | Type | Notes |
|---|---|---|
| `number`, `slug`, `name` | | from `DOMAINS` |
| `open` | boolean | true for the current card's domain (default; the reader can change it) |
| `read`, `total` | number | `read` is 0 in this phase; `total` = topics in the domain |
| `meter` | string | `domainMeter(read, total)`, four segments, `▱▱▱▱` at 0 |
| `cards` | `TreeCard[]` | in path order |

`TreeCard`: `id`, `label` (the id, as in the mockup tree), `href` (written only), `current`,
`glyph` (`○` not yet; `·` read and `✓` mastered exist for Phase 4 but are unused here).

## StatusLine (new, derived per page)

| Field | Value |
|---|---|
| `mode` | `READ` |
| `domain` | `<NN> <slug>` of the card's domain |
| `file` | `<id>.md` |
| `radar` | the card's status, in words, with its color |
| `progress` | `read/total` for the domain, e.g. `0/6` |
| `position` | `scrollLabel(scrollY, max)`: `top`, `N%` or `bot`; live, set by the client script |

## TocEntry (new, constant per template)

The eight entries (`tocLabel`, `id`) from TemplateSection. `currentSection(tops, line)` returns
the id highlighted for the given section offsets.

## Meter (value object)

`meterString(n)` → `'█'.repeat(n) + '░'.repeat(6 − n)` for integer `n` in 0–6; anything else is
rejected before rendering by the validator. The accessible text is `"{n} of 6"`; the table hint
reads "more █ = better for you".

## State and lifecycle

Only the phone menu has state, and it is not stored: `closed → open` (button), `open → closed`
(close control, Escape, backdrop tap, a card chosen, a navigation swap). `nextMenuState` is the
pure transition table.

## Sync-ready rules (DESIGN §6.1)

Unchanged and untouched: the permanent `id` keys everything; no progress is read or written in
this phase, so the future single storage interface and `{ state, updatedAt }` entries are
unaffected. The tree's progress surfaces take `(read, total)` as inputs so Phase 4 supplies real
numbers without changing this phase's code.
