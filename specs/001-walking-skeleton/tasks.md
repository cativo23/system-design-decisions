---
description: "Task list for the Walking Skeleton feature"
---

# Tasks: Walking Skeleton

**Input**: Design documents from `specs/001-walking-skeleton/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. Constitution VII (test-first, non-negotiable) applies to all logic. Every test
task MUST be written and **seen to fail** before its implementation task. Pure presentational
markup (layouts, pages, nginx/Docker config) is exempt.

**Organization**: phases follow the dependency order fixed in plan.md (§ Implementation order).
US2 (the checks) comes before US1's deploy because nothing may be published until the checks that
guard publishing exist (FR-018). US3 builds on US2's CLI.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, US3 from spec.md
- Paths are repo-relative (single project at the root, per plan.md § Project Structure)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: an officially scaffolded Astro project with lint, tests and a CI skeleton.

- [X] T001 Scaffold Astro per research.md R1. Run `npm create astro@latest astro-scaffold -- --template minimal --no-install --no-git --no-ai --yes`. Move `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/`, `public/` and `.vscode/` to the repo root. Merge `astro-scaffold/.gitignore` into `.gitignore`. Set `"name": "systems-field-guide"` in `package.json`. Delete `public/favicon.svg`, `public/favicon.ico`, the scaffold README and `astro-scaffold/`. Then run `npm install`.
- [X] T002 Add `.nvmrc` containing `24` (research.md R1)
- [X] T003 Run `npx astro add mdx --yes`. Set `site: 'https://architecture.cativo.dev'` in `astro.config.mjs`. Run `npm install yaml` (research.md R2, R4). React is deliberately **not** added (plan.md decision 1).
- [X] T004 [P] Install Vitest (`npm install -D vitest`). Create `vitest.config.ts` with `getViteConfig()` from `astro/config` as in the official Astro testing guide, including `tests/**/*.test.ts`. Add the script `"test": "vitest run"` to `package.json` (research.md R7).
- [X] T005 [P] Install lint tooling: `npm install -D eslint @eslint/js typescript-eslint eslint-plugin-astro @astrojs/check typescript`. Create the flat config in `eslint.config.js` (js recommended + typescript-eslint recommended + astro recommended; ignore `dist/` and `.astro/`). Add the script `"lint": "eslint . && astro check"` to `package.json` (research.md R8). Then check the scaffold's `tsconfig.json`: the scripts run under Node type stripping (research.md R4), so relative imports carry the `.ts` extension and type-only imports use `import type`. If `astro check` rejects `.ts` import extensions, add `"allowImportingTsExtensions": true` to `compilerOptions` (only if needed).
- [X] T006 Create `.github/workflows/ci.yml` per research.md R11: on `push` and `pull_request` to `main` plus `workflow_call`. Top-level `permissions: contents: read`. One job: checkout → `actions/setup-node` (`node-version-file: .nvmrc`, `cache: npm`) → `npm ci` → `npm run lint` → `npm test` → `npm run build`. The `validate` and `check:build` steps are added in T026 and T042.

**Checkpoint**: `npm run lint` and `npm run build` pass locally. `npm test` is wired but has no tests yet (Vitest exits 1 when it finds no test files); tests start in Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the domain list, the metadata schema, the topic register parser, the content collection and the real Saga card. Every story depends on these.

**⚠️ CRITICAL**: no user story work starts until this phase is complete.

- [X] T007 [P] Write failing tests in `tests/unit/domains.test.ts`: exactly 13 domains in learning-path order, each with the number, slug and display name from data-model.md § Domain. Lookup by slug returns the number and name, and lookup by number returns the slug.
- [X] T008 [P] Write failing tests in `tests/unit/schema.test.ts` for the shared metadata schema. Cover each constrained field:
  - data-model.md Card.id (slug pattern)
  - Card.title (non-blank)
  - Card.domain (one of the 13 slugs)
  - Card.order (integer ≥ 1)
  - Card.status (enum)
  - Card.reviewed (format `YYYY-MM` with month 01–12 only; the not-in-the-future rule is tested in T018)
  - Card.tags, Card.aliases, Card.related (required arrays that may be empty, with no blank or duplicate entries)

  Each issue must expose the field path and a message naming the allowed values or format.
- [X] T009 [P] Write failing tests in `tests/unit/topics.test.ts` for `parseTopics(markdown)` per contracts/topics-format.md:
  - extracting data-model.md TopicEntry.id, TopicEntry.title (cut at the first ` · ` or `. `), TopicEntry.domainNumber and TopicEntry.state (from `[ ]`, `[~]` or `[x]`)
  - every parse error (no topics, duplicate id, topic before any heading, heading number outside 01–13), reported as `topics-invalid` failures
  - parsing the real `docs/TOPICS.md` yields no failures and contains `saga` (title `Saga (2PC covered inside)`, domain 5), `outbox-cdc`, `idempotency` and `durable-execution`. Don't assert a total count, since the list changes over time.
- [X] T010 Implement `src/lib/domains.ts` until T007 passes
- [X] T011 Implement `src/lib/cards/schema.ts` (import `z` from `astro/zod`; erasable TypeScript only) until T008 passes. It enforces data-model.md Card.id, Card.title, Card.domain, Card.order, Card.status, Card.reviewed (format only), Card.tags, Card.aliases and Card.related. Depends on T010.
- [X] T012 [P] Implement `src/lib/topics.ts` until T009 passes. It returns data-model.md TopicEntry.id, TopicEntry.title, TopicEntry.domainNumber and TopicEntry.state.
- [X] T013 Create `src/content.config.ts` per research.md R3. Define the `cards` collection with `glob({ pattern: '*.mdx', base: './src/content/cards', generateId: ({ data }) => data.id })` and the schema from `src/lib/cards/schema.ts`. Depends on T011.
- [X] T014 Author `src/content/cards/saga.mdx` per research.md R16 and contracts/card-format.md. Port the approved text from `docs/mockups/saga-card.html`:
  - frontmatter `id: saga`, `domain: distributed-data`, `order: 3`, `status: adopt`, `reviewed: 2026-11`
  - tags `transactions`, `consistency`, `microservices`; aliases `distributed transactions`, `compensating transactions`
  - `related: [outbox-cdc, idempotency, durable-execution]`
  - the nine `##` sections in order: Use/Avoid as `###` lists; Trade-offs as a GFM table with a `cost` row; Related containing `<RelatedCards />`
  - no simulator and no diagram

  Depends on T013.

**Checkpoint**: `npm test` is green and `npm run build` succeeds with the Saga entry loaded.

---

## Phase 3: User Story 2: A broken card cannot be published (Priority: P2)

**Goal**: an automated check that fails on every template defect, names the card, the rule and the detail, reports everything in one run, and runs on every PR and push to `main`.

**Independent Test**: `node scripts/validate-cards.ts --cards tests/fixtures/broken/cards --topics tests/fixtures/broken/TOPICS.md --today 2026-11-23` exits 1 and prints one line per seeded defect. The same command on `tests/fixtures/valid/` exits 0 (quickstart.md §2).

### Tests for User Story 2 ⚠️ (write first, see them fail)

- [ ] T015 [P] [US2] Create the fixtures:
  - `tests/fixtures/valid/TOPICS.md` (a few topics across two domains, including one planned-but-unwritten id)
  - `tests/fixtures/valid/cards/` (one complete valid card whose `related` includes the planned-but-unwritten id)
  - `tests/fixtures/broken/TOPICS.md`
  - `tests/fixtures/broken/cards/`: one card file per rule code in contracts/validator-cli.md § Rule codes, except `no-cards` and `topics-invalid`, which have dedicated unit tests. Each file is named after its rule, e.g. `section-order.mdx`.
- [ ] T016 [P] [US2] Write failing tests in `tests/unit/parse-card.test.ts` for `parseCard(file, source)`:
  - splitting the frontmatter on its `---` fences
  - YAML syntax errors and missing frontmatter → `frontmatter-invalid`
  - the `##` heading scan ignores headings inside ``` and `~~~` fences
  - a section with only blank lines or only a `###` heading counts as empty
  - `###` headings are allowed
  - Trade-offs cost row detection: first cell `cost`, case-insensitive, ignoring `**`, `_` and backticks; the header row doesn't count
- [ ] T017 [P] [US2] Write failing tests in `tests/unit/rules.test.ts` for the per-card rules of `validateCards(cards, topics, today)`. Each test mutates the valid fixture once:
  - `metadata-missing` for every required field in data-model.md § Card
  - `metadata-invalid` for data-model.md Card.id, Card.domain, Card.status, Card.reviewed (malformed), Card.order, and blank or duplicate entries in Card.tags, Card.aliases, Card.related
  - `section-missing` for each of the nine sections, then `section-empty`, `section-order`, `section-duplicate`, `section-unknown`
  - `cost-row-missing`
  - a card with invalid frontmatter is still checked for body rules

  Assert that each failure carries data-model.md CheckFailure.file, CheckFailure.id, CheckFailure.rule and CheckFailure.detail, and that the detail names the field, section or allowed values.
- [ ] T018 [P] [US2] Write failing tests in `tests/unit/cross-card-rules.test.ts` for the cross-card rules and the date rule of `validateCards`:
  - `related-unknown` (an id in neither the cards nor the topics)
  - a related id that's planned but unwritten **passes**
  - `related-self`
  - `id-duplicate`, naming every file that shares the id
  - `id-not-in-topics`
  - `no-cards` on an empty list
  - Card.reviewed in the future relative to the injected `today` → `metadata-invalid`
  - the current month is valid
  - several cards with several defects → all defects returned in one call (FR-013)
- [ ] T019 [P] [US2] Write failing tests in `tests/unit/report.test.ts` for the failure part of `formatReport`:
  - the line format `✗ <file> (<id>) <rule>: <detail>`, with `(?)` when the id is unknown
  - stable ordering by file, then rule
  - the summary lines `N failure(s) in M card(s)` and `✓ K card(s) valid`
  - the Markdown variant for the step summary
- [ ] T020 [P] [US2] Write failing tests in `tests/integration/validate-cli.test.ts` that spawn `node scripts/validate-cards.ts` with `--today 2026-11-23`:
  - the valid fixtures → exit 0
  - the broken fixtures → exit 1, with every rule code from T015 in stdout in a single run
  - a missing `--topics` file → exit 2
  - an unknown option → exit 2

  This is the "CI provably fails on a broken card" proof.

### Implementation for User Story 2

- [ ] T021 [US2] Implement `src/lib/cards/parse-card.ts` until T016 passes
- [ ] T022 [US2] Implement the per-card rules in `src/lib/cards/rules.ts` (using the schema from T011, plus the section and cost-row results from T021) until T017 passes. Every failure is a data-model.md CheckFailure (CheckFailure.file, CheckFailure.id, CheckFailure.rule, CheckFailure.detail).
- [ ] T023 [US2] Add the cross-card rules and the future-month rule to `src/lib/cards/rules.ts`, using `parseTopics` from T012, until T018 passes. They check data-model.md Card.id (unique, in TopicEntry.id), Card.related (known, not self) and Card.reviewed (not after the run month).
- [ ] T024 [US2] Implement the failure formatting in `src/lib/cards/report.ts` until T019 passes. Each line renders data-model.md CheckFailure.file, CheckFailure.id, CheckFailure.rule and CheckFailure.detail.
- [ ] T025 [US2] Implement the CLI `scripts/validate-cards.ts` per contracts/validator-cli.md. Use `node:util` `parseArgs` in strict mode with `--cards`, `--topics` and `--today` and the documented defaults. Read `*.mdx` non-recursively. Exit 0, 1 or 2. Add the script `"validate": "node scripts/validate-cards.ts"`. Done when T020 passes and `npm run validate` passes on the real Saga card.
- [ ] T026 [US2] Add a `npm run validate` step to `.github/workflows/ci.yml` between `npm test` and `npm run build` (research.md R11)

**Checkpoint**: quickstart.md §1 and §2 pass. US2 is complete and independently testable.

---

## Phase 4: User Story 3: Stale cards are reported without blocking (Priority: P3)

**Goal**: every validator run prints a staleness report, and adds it to the GitHub step summary, without affecting the exit code.

**Independent Test**: `node scripts/validate-cards.ts --today 2028-01-15` exits 0 and lists `saga  reviewed 2026-11  14 months old` (quickstart.md §3).

### Tests for User Story 3 ⚠️ (write first, see them fail)

- [ ] T027 [P] [US3] Write failing tests in `tests/unit/staleness.test.ts`:
  - `ageInMonths` in whole calendar months, per data-model.md § Card (Derived)
  - exactly 12 months is not stale; 13 is stale
  - `staleCards` returns data-model.md StaleEntry.file, StaleEntry.id, StaleEntry.reviewed and StaleEntry.ageInMonths, sorted oldest first
- [ ] T028 [US3] Add failing tests to `tests/unit/report.test.ts`:
  - the staleness section header `Staleness report (run date YYYY-MM):`
  - one line per stale card
  - `no cards need review.` when there are none
  - the Markdown variant
- [ ] T029 [US3] Add failing cases to `tests/integration/validate-cli.test.ts`:
  - the valid fixtures with `--today 2028-01-15` → exit 0, and stdout lists the stale card with its age
  - with `GITHUB_STEP_SUMMARY` pointing at a temp file, the file receives the Markdown report

### Implementation for User Story 3

- [ ] T030 [US3] Implement `src/lib/cards/staleness.ts` until T027 passes. It computes data-model.md Card.reviewed age per § Card (Derived) and returns StaleEntry.file, StaleEntry.id, StaleEntry.reviewed and StaleEntry.ageInMonths.
- [ ] T031 [US3] Extend `src/lib/cards/report.ts` with the staleness section until T028 passes
- [ ] T032 [US3] Extend `scripts/validate-cards.ts` to always print the staleness report, and to append the Markdown report to `$GITHUB_STEP_SUMMARY` when it's set (research.md R15), until T029 passes. Stale cards never change the exit code (FR-015).

**Checkpoint**: quickstart.md §3 passes, and US2 tests stay green.

---

## Phase 5: User Story 1: Read the Saga card at the production address (Priority: P1) 🎯 MVP

**Goal**: Saga is live and noindexed at `https://architecture.cativo.dev/cards/saga/`, with the index at `/`, published by a manual deploy that passes only through the health gate.

**Independent Test**: dispatch `deploy.yml` on `main`. `verify` prints `✓ site responds (version <sha>)`, and the card page in a browser shows the title, metadata and nine sections in order (quickstart.md §5–§7).

### Tests for User Story 1 ⚠️ (write first, see them fail)

- [ ] T033 [P] [US1] Write failing tests in `tests/unit/related.test.ts` for `resolveRelated(ids, writtenCards, topics)`:
  - an id of a written card → `{ id, href: '/cards/<id>/', title, status, available: true }`, using data-model.md Card.title and Card.status
  - a planned but unwritten id → `{ id, title, available: false }` with no href, using data-model.md TopicEntry.title
  - input order is preserved
  - an empty list returns `[]`
- [ ] T034 [P] [US1] Write failing tests in `tests/unit/check-build.test.ts` for `checkPage(html, assetSizes)`, exported from `scripts/check-build.ts`, per plan.md § Performance budget and contracts/http-contract.md § Build-output checks:
  - any inline or external `<script>` → fail
  - same-origin CSS (linked + inline) over 2048 bytes → fail
  - HTML over 51200 bytes → fail
  - a missing `<meta name="robots">` containing `noindex` → fail
  - a script, stylesheet, font or image referencing another origin → fail
  - a clean page → `[]`
- [ ] T035 [P] [US1] Write failing tests in `tests/unit/health-gate.test.ts` for `checkResponse(kind, { status, headers, body }, expectedVersion)`, exported from `scripts/health-gate.ts`, per contracts/http-contract.md § Health gate:
  - `version`: status ≠ 200, a 3xx, or a trimmed body ≠ the expected SHA → problem
  - `index`: a missing `X-Robots-Tag`, a header without `noindex` (case-insensitive), a missing robots meta, or a missing link to `/cards/saga/` → problem
  - `card`: the same header and meta checks, plus a missing `Saga` H1 → problem
  - everything correct → `[]`
  - each problem names the URL path and what's wrong

### Implementation for User Story 1

- [ ] T036 [US1] Implement `src/lib/cards/related.ts` until T033 passes. It resolves data-model.md Card.related against Card.id/Card.title/Card.status of written cards and TopicEntry.title of planned ones.
- [ ] T037 [P] [US1] Create `src/layouts/Base.astro`: `<html lang="en">`, charset, viewport, `<title>`, and `<meta name="robots" content="noindex, nofollow">` (FR-021). No styles and no scripts.
- [ ] T038 [US1] Create `src/pages/index.astro` (FR-020a):
  - list every card from the `cards` collection, ordered by domain number (via `src/lib/domains.ts`) and then data-model.md Card.order
  - each entry shows Card.title linked to `/cards/<id>/`, the domain display name, and Card.status in uppercase
- [ ] T039 [US1] Create `src/components/RelatedCards.astro`. It reads the current card from `Astro.params.id` (research.md R6), loads written cards with `getCollection('cards')`, reads and parses `docs/TOPICS.md` at build time with `parseTopics`, and renders `resolveRelated` as a list:
  - written cards: a link plus the status
  - unwritten cards: the title plus `(not yet available)`, with no link (FR-011b)

  Plain HTML only.
- [ ] T040 [US1] Create `src/pages/cards/[id].astro` (FR-020):
  - `getStaticPaths` over the `cards` collection
  - an `<h1>` with data-model.md Card.title
  - a metadata list with the domain display name, Card.status (uppercase), Card.reviewed and Card.tags
  - `<Content components={{ RelatedCards }} />`

  Done when `npm run build` emits `dist/cards/saga/index.html` with the nine sections in order and three "(not yet available)" entries.
- [ ] T041 [US1] Implement `scripts/check-build.ts`: a pure `checkPage` until T034 passes, plus a CLI that walks `dist/**/*.html`, resolves same-origin CSS sizes from `dist/`, prints the problems and exits 1 on any. Add the script `"check:build": "node scripts/check-build.ts dist"` to `package.json`.
- [ ] T042 [US1] Add a `npm run check:build` step after `npm run build` in `.github/workflows/ci.yml`
- [ ] T043 [P] [US1] Create `nginx/default.conf` per research.md R10 and contracts/http-contract.md:
  - `listen 8080`, `root /usr/share/nginx/html`, `index index.html`, `absolute_redirect off`
  - server-level `add_header X-Robots-Tag "noindex, nofollow" always;`
  - **no** `location` block with `add_header`
- [ ] T044 [P] [US1] Create `Dockerfile` and `.dockerignore` per research.md R9:
  - stage `build` on `node:24-alpine`: `npm ci`, `npm run build`, `ARG GIT_SHA`, then write `dist/version.txt` = `$GIT_SHA` + newline
  - stage `runtime` on `nginx/nginx-unprivileged:alpine`: copy `dist/` and `nginx/default.conf`, `EXPOSE 8080`, and a `HEALTHCHECK` using `wget -qO- http://127.0.0.1:8080/`
  - `.dockerignore` excludes `node_modules`, `dist`, `.astro`, `.git`, `specs` and `tests`
- [ ] T045 [US1] Verify the container locally per quickstart.md §5 (build with `GIT_SHA`; check the headers on 200 and 404, the relative redirect, and `/version.txt`). Fix `nginx/default.conf` or `Dockerfile` until every expectation holds.
- [ ] T046 [P] [US1] Create `compose.prod.yml` modelled on the existing pattern (research.md R12):
  - service `app`, image `${DOCKERHUB_USERNAME:-cativo23}/systems-field-guide:latest`, `restart: unless-stopped`
  - a healthcheck with `wget` on port 8080, and small CPU and memory limits
  - network `space-server_web` (external)
  - Traefik labels: `traefik.enable=true`, a router rule ``Host(`architecture.cativo.dev`)``, `entrypoints=websecure`, `tls.certresolver=letsencryptresolver`, `middlewares=security-headers@file`, service port `8080`, `traefik.docker.network=space-server_web`
- [ ] T047 [US1] Implement `scripts/health-gate.ts` per contracts/http-contract.md § Health gate: a pure `checkResponse` until T035 passes, plus a CLI.
  - args (`parseArgs`, strict): `--origin`, `--expect-version`
  - requests: `fetch` with `redirect: 'manual'` and `AbortSignal.timeout(10_000)`
  - rounds every 10 s until all three requests pass or 180 s elapse
  - on success, print `✓ site responds (version <sha>)` with per-request ms; otherwise print `✗ site did not respond within 180s` and the last problems; exit 0 or 1
- [ ] T048 [US1] Create `.github/workflows/deploy.yml` per research.md R12:
  - `on: workflow_dispatch`, `concurrency: { group: deploy, cancel-in-progress: false }`, top-level `permissions: contents: read`
  - job `checks`: `uses: ./.github/workflows/ci.yml`
  - job `publish` (`needs: checks`, `if: github.ref == 'refs/heads/main'`, `environment: prod`): compute the short SHA (7 characters); `docker/setup-buildx-action`; `docker/login-action`; `docker/build-push-action` with `push: true`, the tags `latest` and `<short-sha>`, and `build-args: GIT_SHA=<short-sha>`
  - job `release` (`needs: publish`): `appleboy/scp-action` copies `compose.prod.yml` to `/home/cativo23/deploy/systems-field-guide`; `appleboy/ssh-action` runs `docker compose -f compose.prod.yml pull && docker compose -f compose.prod.yml up -d --remove-orphans && docker image prune -f`. Both appleboy actions are pinned to a full commit SHA, and there's no Docker login on the server.
  - job `verify` (`needs: [publish, release]`): checkout, setup-node, then `node scripts/health-gate.ts --origin https://architecture.cativo.dev --expect-version <short-sha>`
  - secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `POLARIS_USER`, `POLARIS_SSH_KEY`; vars `POLARIS_HOST`, `POLARIS_PORT`
- [ ] T049 [US1] ⚠ **Owner-confirmed outward action.** Create the GitHub repository (the owner chooses the name and visibility) and add it as `origin`. Push `001-walking-skeleton`. Configure the `prod` environment, the secrets and the vars listed in T048. Make the Docker Hub repository `systems-field-guide` public. **Required:** branch protection (or a ruleset) on `main` that requires the CI check to pass before merging, so a red PR can't merge (constitution § Quality gates). On GitHub's free plan this is only available for **public** repositories, so the visibility choice must allow it. Ask before each outward step.
- [ ] T050 [US1] Open a PR from `001-walking-skeleton` to `main` and confirm CI runs and passes on it (FR-016). Prove it fails on a broken card: either via the T020 integration test in CI, or with a throwaway commit that breaks `saga.mdx`, seen red, then reverted. The owner merges.
- [ ] T051 [US1] ⚠ **Owner-confirmed.** Dispatch `deploy.yml` on `main` (`gh workflow run deploy.yml --ref main`) and watch it. Confirm the jobs `checks` → `publish` → `release` → `verify` all succeed in under 10 minutes (SC-004), then run quickstart.md §6 (a second dispatch also succeeds) and §7 (browser check, under 2 s, SC-001).

**Checkpoint**: Saga is live at `https://architecture.cativo.dev/cards/saga/` with `X-Robots-Tag: noindex`. All three stories are complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T052 [P] Write a short `README.md` covering what the project is, `npm` scripts (dev, test, validate, build, check:build), how a deploy is triggered, and links to `docs/` and `specs/001-walking-skeleton/quickstart.md`
- [ ] T053 Run the whole of quickstart.md (§1–§7) and record any deviation as a fix or a converge item
- [ ] T054 Update `docs/TOPICS.md`: `saga` stays `[~]` (the constitution allows `[x]` only after the Phase 6 review checklist). Replace its note with "live as the walking-skeleton sample; `[x]` after the Phase 6 review". The totals line is unchanged.
- [ ] T055 Update `docs/PHASES.md`: set the Phase 1 status per the `/speckit-converge` result

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none. T001 → T002/T003 → T004, T005 in parallel → T006.
- **Foundational (Phase 2)**: after Setup. It blocks all stories. Tests T007, T008 and T009 run in parallel. T010 → T011 → T013 → T014. T012 runs in parallel with T010 and T011.
- **US2 (Phase 3)**: after Foundational. It blocks US3, and blocks US1's deploy tasks T048–T051.
- **US3 (Phase 4)**: after US2, since it extends `report.ts` and the CLI.
- **US1 (Phase 5)**: T033–T047 only need Foundational, so they can start in parallel with US2 and US3. T048–T051 need US2 to be complete, because deploy reuses CI, which must include `validate`.
- **Polish (Phase 6)**: after US1's T051.

### Within each story

- Tests before implementation. Each test is seen to fail first.
- Pure modules (`src/lib/**`, the pure cores in `scripts/*.ts`) come before pages and CLIs that use them.
- Container and config tasks (T043–T046) come before workflows (T048), which come before outward actions (T049–T051).

### Task-level dependencies worth noting

- T022 → T023 (same file `rules.ts`); T024 → T031 (same file `report.ts`); T025 → T032 (same CLI); T019 → T028 (same test file); T020 → T029 (same test file).
- T006 → T026 → T042 (same `ci.yml`).
- T036 → T039 → T040 (RelatedCards uses `resolveRelated`; the page uses RelatedCards).
- T041 → T042; T043 + T044 → T045; T047 → T048.

---

## Parallel Examples

### Foundational

```text
T007 tests/unit/domains.test.ts
T008 tests/unit/schema.test.ts
T009 tests/unit/topics.test.ts
```

### User Story 2 (tests first)

```text
T015 fixtures   T016 parse-card tests   T017 rules tests
T018 cross-card tests   T019 report tests   T020 CLI integration tests
```

### User Story 1 (tests and static config)

```text
T033 related tests   T034 check-build tests   T035 health-gate tests
T037 Base layout     T043 nginx config        T044 Dockerfile   T046 compose.prod.yml
```

---

## Implementation Strategy

### MVP

The MVP is **US1 live in production**, and it needs Setup, Foundational and US2 first. FR-018
forbids deploying anything that the checks haven't vetted. US3 is small and follows US2 directly,
but US1's site work (T033–T047) can run alongside it.

1. Setup → Foundational (checkpoint: tests green, build loads Saga)
2. US2 (checkpoint: quickstart §1–§2; CI fails on a broken card)
3. US3 (checkpoint: quickstart §3)
4. US1 local (T033–T047; checkpoint: quickstart §4–§5)
5. US1 production (T048–T051, with owner-confirmed outward actions)
6. Polish, then `/speckit-converge` until Converged

### Commits

Use Conventional Commits, one concern per commit. Suggested boundaries: scaffold; each pure
module with its tests; the validator CLI + CI wiring; staleness; the pages; the build budget; the
container; the deploy workflow.
