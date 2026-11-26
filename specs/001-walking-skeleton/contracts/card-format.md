# Contract: Card File Format

> **Amended by Phase 2:** [card format v2](../../002-design-system-card-layout/contracts/card-format.md)
> changes `related` to `{ id, why }` objects and adds body rules (meters, `<Pitfall>`, `<Source>`, and more).
> Where the two differ, v2 wins.

A card is one MDX file in `src/content/cards/`, ideally named `<id>.mdx`. The entry id comes
from the frontmatter `id`, not from the file name.

## Frontmatter

```yaml
---
id: saga
title: Saga
domain: distributed-data
order: 3
status: adopt
reviewed: 2026-11
tags: [transactions, consistency, microservices]
aliases: [distributed transactions, compensating transactions]
related: [outbox-cdc, idempotency, durable-execution]
---
```

Field rules: [data-model.md § Card](../data-model.md#card). Quote `reviewed` (`"2026-11"`) if a
YAML tool rewrites it. The schema accepts a string only, and an unquoted `2026-11` is already a
string in YAML 1.2.

## Body

The body has exactly these level-2 headings, written exactly like this, in this order, each
followed by content:

```
## TL;DR
## Problem it solves
## How it works
## Use it when / Avoid it when
## Trade-offs
## In the wild
## Pitfalls
## Related
## Go deeper
```

- "Content" means at least one non-whitespace line before the next `##` heading. A blank section,
  or one holding only a deeper heading, is empty.
- Headings inside fenced code blocks (```` ``` ```` or `~~~`) are ignored.
- `###` and deeper headings are free within a section (for example `### Use it when` and
  `### Avoid it when`).
- No other `##` headings are allowed (`section-unknown`).
- The H1 is not written in the body. The page renders `title` as the H1.

### Trade-offs

It MUST contain a GFM table comparing against the main alternative, with a row whose first cell
is `cost`. Matching is case-insensitive and ignores surrounding `**`, `_` or backticks.

```md
| dimension | saga | 2PC |
|---|---|---|
| consistency | Eventual, with no isolation between steps | Atomic, but blocks if the coordinator fails |
| cost | A workflow engine or broker, plus engineering time | Few modern datastores or brokers support it |
```

### Related

The section holds the `<RelatedCards />` element, which the page supplies (authors don't import
it). It renders the frontmatter `related` ids in order:

- a written card → a link to `/cards/<id>/` labelled with that card's `title` and radar status
- a planned, unwritten card → its TOPICS.md title followed by "(not yet available)", with no link

Authors may add a line of prose before it. The ids live only in the frontmatter, so there is no
second list in the body to keep in sync.
