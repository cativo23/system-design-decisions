# Data Model: Walking Skeleton

All entities live in files in the repository. Nothing is stored at runtime.

## Card

One decision card, authored as `src/content/cards/<id>.mdx`. Frontmatter holds the metadata,
and the MDX body holds the nine template sections. Full format: [contracts/card-format.md](contracts/card-format.md).

| Field | Type | Rules | Source requirement |
|---|---|---|---|
| `id` | string | Required. Lowercase slug `^[a-z0-9]+(-[a-z0-9]+)*$`. Unique across cards. Must appear in the master topic list. Never changes. It's the collection entry id and the URL segment. | FR-002, FR-003, FR-011a, FR-012 |
| `title` | string | Required, non-blank. | FR-002 |
| `domain` | Domain slug | Required, one of the 13 slugs below. | FR-004 |
| `order` | integer | Required, ≥ 1. | FR-007 |
| `status` | RadarStatus | Required, one of `adopt`, `trial`, `assess`, `hold`. | FR-005 |
| `reviewed` | string | Required. `YYYY-MM`, month 01–12, not after the run month. | FR-006 |
| `tags` | string[] | Required (may be `[]`). No blank or duplicate entries. | FR-002, edge cases |
| `aliases` | string[] | Required (may be `[]`). No blank or duplicate entries. | FR-002, edge cases |
| `related` | string[] | Required (may be `[]`). No blank or duplicate entries. Every entry is a known id (written or planned) and is not the card's own id. | FR-002, FR-011 |

**Body**: exactly the nine template sections as `##` headings, in order, each with content.
See [contracts/card-format.md](contracts/card-format.md#body).

**Derived**:
- `url` = `/cards/<id>/` (FR-020)
- `ageInMonths(runDate)` = `(runYear − reviewedYear) × 12 + (runMonth − reviewedMonth)`
- `isStale(runDate)` = `ageInMonths > 12` (exactly 12 is not stale)

## Domain

A fixed list of 13, in learning-path order. Defined once in `src/lib/domains.ts`.

| # | Slug | Display name |
|---|---|---|
| 1 | `foundations` | Foundations |
| 2 | `architecture-styles` | Architecture styles |
| 3 | `compute-runtime` | Compute & runtime |
| 4 | `communication-apis` | Communication & APIs |
| 5 | `distributed-data` | Distributed data & workflows |
| 6 | `storage` | Storage |
| 7 | `traffic` | Traffic |
| 8 | `data-platforms` | Data platforms |
| 9 | `reliability-operations` | Reliability & operations |
| 10 | `security-privacy-compliance` | Security, privacy & compliance |
| 11 | `ai-systems` | AI systems |
| 12 | `architects-craft` | Architect's craft |
| 13 | `reference-architectures` | Reference architectures |

The slug is what authors write. The display name is what readers see.

## RadarStatus

Enum: `adopt` · `trial` · `assess` · `hold`. Displayed uppercase on pages (`ADOPT`).

## TopicEntry (master topic list)

Parsed from `docs/TOPICS.md`. Grammar: [contracts/topics-format.md](contracts/topics-format.md).

| Field | Type | Notes |
|---|---|---|
| `id` | string | The backticked slug. Unique in the file. |
| `title` | string | The text after `: `, up to the first ` · ` or `. `, so markers like `**MVP**` are dropped. |
| `domainNumber` | 1–13 | From the enclosing `## NN · Name` heading. |
| `state` | `pending` · `drafting` · `published` | From the checkbox: `[ ]`, `[~]`, `[x]`. |

**Relationships**:
- Every Card's `id` MUST match a TopicEntry's `id` (FR-011a).
- A Card's `related` ids resolve to a **written** Card (rendered as a link) or to a TopicEntry with
  no written Card (rendered by its TopicEntry `title` as "not yet available", with no link) (FR-011b).

The checkbox `state` is informational. A card counts as written when its file exists, whatever the
checkbox says. Keeping the checkbox in sync is part of the session-close routine, not a check.

## CheckFailure

One broken rule, as reported by the validator.

| Field | Type | Notes |
|---|---|---|
| `file` | string | Repo-relative path of the card file (or `docs/TOPICS.md` / the cards directory for global rules). |
| `id` | string \| null | Card id, when it could be read. |
| `rule` | RuleCode | See the table in [contracts/validator-cli.md](contracts/validator-cli.md#rule-codes). |
| `detail` | string | The field, section or id involved, plus the allowed values or format where relevant. |

A run produces a **CheckReport**: every CheckFailure, collected across all cards before exiting
(FR-013). An empty report means the run passed.

## StaleEntry

| Field | Type |
|---|---|
| `file` | string |
| `id` | string |
| `reviewed` | `YYYY-MM` |
| `ageInMonths` | integer > 12 |

A **StalenessReport** lists all StaleEntries, sorted oldest first. When the list is empty it says
"No cards need review." It never affects the exit code (FR-015).

## Deployment (lifecycle)

One run of `deploy.yml`. It is not stored, but it has a defined state flow:

```
dispatched ──► checks (reused CI) ──fail──► FAILED("checks failed")
                    │ pass
                    ▼
               image built & pushed (latest, <short-sha>)
                    │
                    ▼
               polaris2: compose pull && up -d
                    │
                    ▼
               health gate ──timeout──► FAILED("site did not respond: <last problems>")
                    │ all assertions pass
                    ▼
                 SUCCEEDED
```

"Responds" is defined in [contracts/http-contract.md](contracts/http-contract.md#health-gate).
