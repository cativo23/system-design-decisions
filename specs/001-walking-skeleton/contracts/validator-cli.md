# Contract: Card Validator CLI

`npm run validate` runs `node scripts/validate-cards.ts`. It is the authoritative check behind
FR-008 to FR-015. CI runs it, and the deploy workflow reuses CI.

## Invocation

```
node scripts/validate-cards.ts [--cards <dir>] [--topics <file>] [--today <YYYY-MM-DD>]
```

| Option | Default | Purpose |
|---|---|---|
| `--cards` | `src/content/cards` | Directory of `*.mdx` card files (not recursive). |
| `--topics` | `docs/TOPICS.md` | Master topic list. |
| `--today` | the current date (UTC) | Run date for the staleness and future-month rules. Exists so tests and fixtures are deterministic. |

Arguments are parsed with `node:util` `parseArgs` in strict mode, so an unknown option is a usage error.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No failures. Stale cards may still be listed. |
| `1` | One or more CheckFailures, all of them printed. |
| `2` | Usage error, or an input that can't be read at all (missing directory or TOPICS file). |

## Output (stdout)

Failures come first, one per line, grouped by file and in stable order:

```
✗ src/content/cards/saga.mdx (saga) section-missing: "Pitfalls" is required (template order: TL;DR, Problem it solves, …)
✗ src/content/cards/saga.mdx (saga) metadata-invalid: status "maybe" is not one of adopt, trial, assess, hold
✗ src/content/cards/other.mdx (saga) id-duplicate: id "saga" is also used by src/content/cards/saga.mdx
```

Then a summary line: `N failure(s) in M card(s)` or `✓ K card(s) valid`.

Then the staleness report:

```
Staleness report (run date 2026-11):
  saga  reviewed 2025-09  14 months old  src/content/cards/saga.mdx
```

or `Staleness report (run date 2026-11): no cards need review.`

When `GITHUB_STEP_SUMMARY` is set (in GitHub Actions), the same failures and staleness report are
also appended there as Markdown, so they're visible on the run page (FR-016, US3).

## Rule codes

Each code is covered by at least one failing automated example (SC-002).

| Rule | Fails when | `detail` names |
|---|---|---|
| `frontmatter-invalid` | The frontmatter block is missing or isn't valid YAML | the parser message |
| `metadata-missing` | A required field is absent | the field |
| `metadata-invalid` | A field has the wrong type or value: bad id slug, unknown domain or status, malformed or future `reviewed`, `order` < 1, blank or duplicate list entry | the field, the bad value, the allowed values or format |
| `section-missing` | One of the nine required `##` sections is absent | the section, plus the template order |
| `section-empty` | A required section has no content before the next `##` heading | the section |
| `section-order` | The required sections appear out of template order | the expected and actual order |
| `section-duplicate` | A required section heading appears more than once | the section |
| `section-unknown` | A `##` heading isn't one of the nine (`###` and deeper are free) | the heading text |
| `cost-row-missing` | The Trade-offs section has no table row whose first cell is `cost` | n/a |
| `related-unknown` | A `related` id is neither a written card nor a topic in TOPICS.md | the id |
| `related-self` | A card lists its own id in `related` | the id |
| `related-why-missing` | A `related` entry has a blank `why` (v2) | the related id |
| `tldr-shape` | TL;DR is not exactly one paragraph (v2) | the paragraph count |
| `use-avoid-shape` | The section is not `### Use it when` then `### Avoid it when`, each with a bullet (v2) | what is missing or out of order |
| `tradeoffs-shape` | The Trade-offs table does not have exactly 3 columns (v2) | the column count |
| `meter-missing` | A Trade-offs value cell does not start with `<Meter n={…} />` (v2) | the row and column |
| `meter-range` | A meter `n` is not an integer from 0 to 6 (v2) | the row, column and value |
| `wild-entry-malformed` | An In the wild bullet lacks a directory-form bold name or a description (v2) | the line |
| `pitfall-malformed` | A `<Pitfall>` lacks a title or body, none exists, or other content appears (v2) | the title or line |
| `source-malformed` | A Go deeper bullet is not a valid `<Source kind href>` with an `https://` href (v2) | the line |
| `id-duplicate` | Two or more card files declare the same `id` | the id and every other file using it |
| `id-not-in-topics` | A card's `id` isn't in TOPICS.md | the id |
| `no-cards` | The cards directory has no `*.mdx` files | the directory |
| `topics-invalid` | TOPICS.md breaks its [parse rules](topics-format.md#parse-errors-fail-the-validator-rule-topics-invalid) | the line and the reason |

A card whose frontmatter is invalid is still checked for body rules, so a single run reports
everything (FR-013).

## Module boundary (for tests)

The CLI is a thin shell around pure functions, which are what the unit tests exercise:

- `parseTopics(markdown, file) → { topics, failures }` (`file` names the source in `CheckFailure.file`)
- `parseCard(file, source) → { data, sections, failures }`
- `validateCards(cards, topics, today, cardsDir) → CheckFailure[]` (`cardsDir` names the directory in the `no-cards` failure)
- `staleCards(cards, today) → StaleEntry[]`
- `formatReport({ failures, cardCount, stale, runMonth }) → string`, plus `formatMarkdownReport` with the same input for the step summary

The CLI is in charge of reading files, printing, and choosing the exit code. A small integration
test runs it against `tests/fixtures/` to check exit codes 0, 1 and 2.
