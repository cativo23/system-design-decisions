# Quickstart: Walking Skeleton validation

Runnable scenarios that prove the feature end to end. Contracts:
[validator-cli](contracts/validator-cli.md), [http-contract](contracts/http-contract.md),
[card-format](contracts/card-format.md).

## Prerequisites

- Node 24 (`nvm use`), Docker, and `gh` authenticated.
- For deploy only: a GitHub repo with secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`,
  `POLARIS_USER`, `POLARIS_SSH_KEY`, vars `POLARIS_HOST`, `POLARIS_PORT`, and a `prod`
  environment. `architecture.cativo.dev` already resolves to polaris2 through the wildcard record.

```sh
npm ci
```

## 1. Checks pass on the real content (US2, US3)

```sh
npm run lint && npm test && npm run validate
```

Expected: everything exits 0. `validate` prints `✓ 1 card(s) valid`, then
`Staleness report (run date YYYY-MM): no cards need review.`

## 2. A broken card is blocked, and every defect is reported (US2, SC-002, SC-003)

```sh
node scripts/validate-cards.ts --cards tests/fixtures/broken/cards --topics tests/fixtures/broken/TOPICS.md --today 2026-11-23
echo "exit=$?"
```

Expected: `exit=1`, with one `✗ <file> (<id>) <rule>: …` line for **each** seeded defect (at least
one per rule code in the contract), all in the same run. Each line names the file, the id and the
rule.

Manual spot check on the real card. Delete the `## Pitfalls` section from `saga.mdx`, then run
`npm run validate`. Expected: exit 1, with
`✗ src/content/cards/saga.mdx (saga) section-missing: "Pitfalls" …`. Revert with
`git checkout src/content/cards/saga.mdx`.

## 3. Stale cards warn without failing (US3, SC-005)

```sh
node scripts/validate-cards.ts --today 2028-01-15
echo "exit=$?"
```

Expected: `exit=0`. The staleness report lists `saga  reviewed 2026-11  14 months old`.

## 4. Build output respects budget and noindex (VI, FR-021)

```sh
npm run build && npm run check:build
```

Expected: exit 0. `dist/index.html` and `dist/cards/saga/index.html` exist, each with 0 JS, at most
2 KB of CSS, at most 50 KB of HTML, and the robots `noindex` meta tag.

## 5. The container serves what production will (US1, FR-021)

```sh
docker build --build-arg GIT_SHA=$(git rev-parse --short=7 HEAD) -t sfg:local .
docker run --rm -d -p 8080:8080 --name sfg sfg:local
curl -sI http://localhost:8080/cards/saga/ | grep -i x-robots-tag   # → X-Robots-Tag: noindex, nofollow
curl -sI http://localhost:8080/nope | grep -iE '^HTTP|x-robots-tag'   # → 404 and the header (always)
curl -sI http://localhost:8080/cards/saga | grep -i '^location'       # → relative /cards/saga/
node scripts/health-gate.ts --origin http://localhost:8080 --expect-version $(git rev-parse --short=7 HEAD)
docker stop sfg
```

Expected: the gate prints `✓ site responds (version <sha>)`. Locally the TLS check doesn't apply
because the origin is HTTP.

Open `http://localhost:8080/`. You should see the index with Saga's title, domain
("Distributed data & workflows") and status (ADOPT), linked. On the card page you should see the
title, metadata, the nine sections in order, and Related listing three entries marked
"(not yet available)", none of them links.

## 6. Deploy to production (US1, FR-017–FR-019, SC-004)

```sh
gh workflow run deploy.yml --ref main
gh run watch
```

Expected: the jobs `checks` → `publish` → `release` → `verify` succeed in under 10 minutes, and
`verify` prints `✓ site responds (version <sha>)` with request timings.

Negative paths:
- Dispatching on a branch whose checks fail: `checks` fails, and `publish`, `release` and
  `verify` are skipped, so nothing is pushed (US1 scenario 5).
- The site is unreachable after release: `verify` fails with
  `✗ site did not respond within 180s` plus the per-URL problems (US1 scenario 4).
- Dispatching twice in a row: both runs succeed and serve the same version (edge case).

## 7. Reader check (SC-001)

In a browser, open `https://architecture.cativo.dev/cards/saga/` with DevTools → Network,
cache disabled. Expected: "Load" under 2 s, one document request, and no JS or CSS requests.
Response headers include `x-robots-tag: noindex, nofollow`.
