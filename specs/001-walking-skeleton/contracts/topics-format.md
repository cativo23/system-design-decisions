# Contract: Master Topic List (`docs/TOPICS.md`)

The validator and the site read `docs/TOPICS.md` as the register of every card id, written or
planned. This contract pins the subset of its Markdown that is machine-read. Everything else in
the file (intro, legend, totals) is ignored.

## Grammar

```
domain heading  := "## " NN " · " name            NN = 01..13 (two digits)
topic line      := "- [" mark "] `" id "`: " rest
mark            := " " | "~" | "x"                 pending | drafting | published
id              := [a-z0-9]+(-[a-z0-9]+)*
title           := rest, cut at the first " · " or ". " (whichever comes first), trimmed
```

A topic line belongs to the closest domain heading above it.

## Examples

| Line | id | title | state |
|---|---|---|---|
| ``- [ ] `idempotency`: Idempotency · **MVP**`` | `idempotency` | Idempotency | pending |
| ``- [~] `saga`: Saga (2PC covered inside) · **MVP**. Draft content lives in …`` | `saga` | Saga (2PC covered inside) | drafting |
| ``- [ ] `durable-execution`: Durable execution · **MVP**`` | `durable-execution` | Durable execution | pending |

## Parse errors (fail the validator; rule `topics-invalid`)

- No topic lines found.
- The same id appears twice.
- A topic line appears before any domain heading.
- A domain heading number is outside 01–13.

These guard against a silently broken register. If parsing broke, the result would otherwise
be "every related id is unknown".
