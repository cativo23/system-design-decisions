# Data Model: Discovery

All shapes are derived at build time from `docs/TOPICS.md` and `src/content/cards/*.mdx`
(FR-016). Nothing is stored at runtime. Types live in `src/lib/discovery/`; this file is the
contract for them. Rules from the spec are cited by id.

## Inputs (existing, unchanged)

- **TopicEntry** (`src/lib/topics.ts`): `id`, `title`, `domainNumber`, `state` (`pending` | `drafting` | `published`). List order is path order (R6).
- **Card data** (`src/lib/cards/schema.ts`): `id`, `title`, `domain` (slug), `order`, `status` (`adopt` | `trial` | `assess` | `hold`), `reviewed` (`YYYY-MM`), `tags`, `aliases`, `related`.
- **Domain** (`src/lib/domains.ts`): `number` 1–13, `slug`, `name`.

A card is **published** when it exists in the cards collection. `state` in the topic list is not
trusted for this (Saga is `[~]` in the list and live as a sample); the existing tree and pager
already use "exists in the collection", and so does this feature.

## CatalogEntry

One planned topic, published or not.

| Field | Type | Rule |
|---|---|---|
| `id` | string | permanent card id (topic id) |
| `title` | string | the card's `title` if published, else the topic list title |
| `domain` | Domain | from the topic's heading |
| `position` | number | 1-based position within its domain in the topic list |
| `published` | boolean | card exists in the collection |
| `status` | radar status or `null` | `null` when not published (FR-009: no radar badge) |
| `reviewed` | `YYYY-MM` or `null` | `null` when not published |
| `href` | string or `null` | `/cards/<id>/` when published, else `null` |

## DomainSummary

| Field | Type | Rule |
|---|---|---|
| `domain` | Domain | |
| `entries` | CatalogEntry[] | in `position` order |
| `published` | number | count of published entries |
| `total` | number | count of entries (FR-008) |
| `meter` | string | `domainMeter(published, total)`, the existing text bar (FR-014); text is `published / total` |

**Invariants** (SC-005, SC-006): every topic appears in exactly one DomainSummary; the learning
path is the concatenation of all DomainSummary entries in domain then position order, so each
topic appears once there; counts equal the topic list.

A domain with zero published cards renders `0 / N` and stays linked (story 2, scenario 4).

## SearchEntry (the JSON file)

Published cards only. Shape in [contracts/search-index.md](contracts/search-index.md).

| Field | Type | Source |
|---|---|---|
| `id` | string | card `id` |
| `title` | string | card `title` |
| `aliases` | string[] | card `aliases` |
| `tags` | string[] | card `tags` |
| `domain` | string | domain **name** (what the reader sees) |
| `status` | radar status | card `status` |
| `href` | string | `/cards/<id>/` |

Entries are sorted by path order so the file is deterministic (same input, same bytes).

## RadarGroup

`{ status, cards }[]` always four elements in the order `adopt`, `trial`, `assess`, `hold`
(FR-011). Each card carries `id`, `title`, `href`, domain name and `reviewed`. Cards inside a
group are in path order. A group with no cards is present with an empty `cards` array.

## FreshnessItem

`{ id, title, href, status, reviewed }`. List = published cards sorted by `reviewed` descending
(string comparison of `YYYY-MM` is chronological), then `title` ascending, cut to 5 (FR-015).
Fewer than 5 published cards: all of them. No history, no placeholder.

## PageKind and StatusFields

`PageKind` = `card` | `home` | `catalog` | `domain` | `path` | `radar`.

`StatusFields` = `{ mode: string; domain?: string; file?: string; status?: string; progress?: string }`.
Pure `statusFields(kind, context)` returns:

| Kind | mode | domain | file | status | progress |
|---|---|---|---|---|---|
| `card` | `READ` | `NN slug` | `<id>.md` | radar status | `domain read/total` |
| `domain` | `catalog` | `NN slug` | omitted | omitted | omitted |
| `home`, `catalog`, `path`, `radar` | the kind | omitted | omitted | omitted | omitted |

The scroll position is rendered for every kind by `shell.ts`, as today.

## PaletteState

`closed` → (open) → `loading` (index not ready) | `ready`; `loading` → `ready` | `error`;
any state → (close) → `closed`. In `ready`, `cursor` is an index into the current results or
`-1` when there are none. Pure `nextPaletteState(state, event)` and `moveCursor(cursor, count,
direction)` (wraps); Enter with `cursor = -1` does nothing.

## Validation rule added

`order-matches-topics` (cross-card, in `src/lib/cards/rules.ts`): for each published card,
frontmatter `order` equals the card's 1-based position within its domain in the topic list.
Failure message names the card, the two numbers and the topic-list line.
