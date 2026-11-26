# Contract: Card Format v2

Amends [001 card-format.md](../../001-walking-skeleton/contracts/card-format.md). Everything
there still applies (frontmatter fields, the nine sections in order, the cost row, `<RelatedCards
/>` in Related) except where this file changes it. The implementation updates the 001 file with
a pointer here.

Authors never import components; the page supplies `Meter`, `Pitfall`, `Source` and
`RelatedCards` (the mechanism Phase 1 R6 verified).

## Frontmatter: `related` becomes objects

```yaml
related:
  - id: outbox-cdc
    why: Publish events reliably from each step
  - id: idempotency
    why: Makes retries and redelivery safe
```

- `id`: known id (written card or topic in `TOPICS.md`), not the card's own, no duplicates.
- `why`: required, non-blank, one line. Shown beside the related card.
- `[]` is still allowed.

## Body rules by section

### TL;DR
Exactly one paragraph (DESIGN: 2–3 sentences). The layout styles that paragraph as the panel.

### Use it when / Avoid it when
Exactly two `###` headings, in this order, each followed by at least one bullet:

```md
### Use it when
- A business operation spans services that each own their data

### Avoid it when
- All the data lives in one database: use a local transaction
```

### Trade-offs
A GFM table with exactly three columns: dimension, the card's approach, the main alternative.
Every data row's two value cells **start with** a meter, then the text:

```md
| dimension | saga | 2PC |
|---|---|---|
| consistency | <Meter n={2} /> Eventual, with no isolation between steps | <Meter n={6} /> Atomic, but blocks if the coordinator fails |
| cost | <Meter n={3} /> A workflow engine or broker | <Meter n={2} /> Few modern datastores support it |
```

- `n` is an integer 0–6; more filled steps is better for the reader. For `cost`, more filled
  means cheaper or lighter.
- The `cost` row stays mandatory (Phase 1).

### In the wild
Bullets of the form `- **name** description`. `name` is in directory form (lowercase letters,
digits, `.` and `-`) because it renders as `name/` in the listing:

```md
- **aws-step-functions** managed orchestration with catch and compensate states
```

The "volatile · verified" note is generated from the card's `reviewed` month; authors do not
write it.

### Pitfalls
One or more blocks. Title in the attribute, explanation as the body (markdown allowed, blank
lines around it):

```md
<Pitfall title="Steps that aren't idempotent">
A message delivered twice charges the customer twice. **Every step needs an idempotency key.**
</Pitfall>
```

Nothing else may appear in the section except blank lines.

### Related
Unchanged: `<RelatedCards />`, which now also shows each entry's `why`.

### Go deeper
One or more bullets, each a `Source`:

```md
- <Source kind="paper" href="https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf">Garcia-Molina & Salem, "Sagas" (1987)</Source>
```

`kind` is a lowercase word (`paper`, `pattern`, `guide`, `docs`, `talk`, …); the set is open.
`href` starts with `https://`.

## New rule codes

Added to `RuleCode` and to [validator-cli.md § Rule codes](../../001-walking-skeleton/contracts/validator-cli.md#rule-codes).
Each is covered by a failing fixture in `tests/fixtures/broken/cards/` (SC-008). All are
reported in one run with the card file and id (Phase 1 FR-013).

| Rule | Fails when | `detail` names |
|---|---|---|
| `tldr-shape` | the TL;DR section is not exactly one paragraph (zero or more than one block of text separated by blank lines) | the number of paragraphs found |
| `related-why-missing` | a `related` entry has no `why`, or it is blank | the related id |
| `use-avoid-shape` | the section is not exactly `### Use it when` then `### Avoid it when`, each with ≥ 1 bullet | what is missing or out of order |
| `tradeoffs-shape` | the table does not have exactly 3 columns | the column count found |
| `meter-missing` | a data cell does not start with `<Meter n={…} />` | the row and the column |
| `meter-range` | `n` is not an integer from 0 to 6 | the row, the column, the value found |
| `wild-entry-malformed` | a bullet lacks a directory-form bold name or a description, or the section has no bullet | the line |
| `pitfall-malformed` | a `<Pitfall>` lacks a non-blank `title` or a body, the section has none, or has other content | the title or line |
| `source-malformed` | a bullet is not a `<Source kind href>` with non-blank kind and title and an `https://` href, or the section has none | the line |

`related` objects that fail the schema (not an object, non-slug `id`, duplicate id) are reported
as `metadata-invalid` as before; the existing `related-unknown` and `related-self` rules read
`related[].id`.

## Rendering contract (what each element becomes)

See [ui-contract.md § Card sections](ui-contract.md#card-sections). The format guarantees the
parts; the components and section-scoped CSS decide the look.
