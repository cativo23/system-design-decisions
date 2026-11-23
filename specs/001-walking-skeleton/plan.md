# Implementation Plan: Walking Skeleton

**Branch**: `001-walking-skeleton` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-walking-skeleton/spec.md`

## Summary

Ship the thinnest end-to-end path: an authored MDX card goes through automated checks, then a
static build, a container image and a manual deploy, and ends up as a live, noindexed page at
`https://architecture.cativo.dev/cards/saga/`.

- **Site:** Astro 7, scaffolded with `npm create astro@latest`, with MDX added by
  `npx astro add mdx`. It renders an unstyled index at `/` and one page per card.
- **Checks:** a standalone, test-first Node validator enforces the metadata, the template
  sections, the cost row and related ids (against `docs/TOPICS.md`). It reports every failure in
  one run, plus a staleness report.
- **CI and deploy:** GitHub Actions runs lint, tests, validate, build and the build budget on
  every PR and push to `main`. A `workflow_dispatch` deploy reruns those checks, pushes the image
  to Docker Hub, rolls it out on polaris2 behind Traefik, and passes only when the health gate in
  [contracts/http-contract.md](contracts/http-contract.md#health-gate) does.

## ⚠ Decisions for the owner (deviations from the Phase 1 plan prompt)

| # | Prompt said | Plan does | Why | To revert |
|---|---|---|---|---|
| 1 | Add React with `npx astro add` | **Defer React** to the first phase with an island (3 or 5) | FR-022 has no interactivity, so React would be an unused dependency (constitution VIII, which outranks PHASES.md) | Add `npx astro add react` to the setup task |
| 2 | `nginx:alpine` | **`nginx/nginx-unprivileged:alpine`**, port 8080 | Master process isn't root (least privilege) at zero cost | Change the image and `listen 80` |
| 3 | "curl health gate" | **Node `scripts/health-gate.ts`** (built-in `fetch`) | The assertion logic becomes a pure, test-first function (constitution VII); curl+grep in YAML is untestable | Replace with a curl step that loses the tests |
| 4 | Scaffold at repo root | `create astro` into `astro-scaffold/`, then move to root | **Verified:** `create astro .` in a non-empty dir with `--yes` silently creates a random subfolder | n/a (it's how the official CLI behaves) |

One addition beyond the spec's letter, also for the owner to confirm: the validator rejects any
**unknown `##` heading** (`section-unknown`), so the nine-section template stays fixed. `###` and
deeper headings stay free.

## Technical Context

**Language/Version**: TypeScript (erasable syntax only) on Node 24 LTS (`.nvmrc`). Scripts run
via Node's native type stripping.

**Primary Dependencies**: `astro` 7.4.x, `@astrojs/mdx` 8.x (with `@astrojs/markdown-satteri`),
`yaml` 2.x. Dev: `vitest` 5.x, `eslint` + `@eslint/js` + `typescript-eslint` +
`eslint-plugin-astro`, `@astrojs/check` + `typescript`.

**Storage**: Files in git: `src/content/cards/*.mdx` and `docs/TOPICS.md`. No runtime storage.

**Testing**: Vitest via `getViteConfig()` (official Astro testing guide). Unit tests cover pure
modules, and one integration test covers the validator CLI's exit codes.

**Target Platform**: A static site served by nginx (unprivileged, Alpine) in Docker on polaris2,
behind Traefik (`space-server_web`, `letsencryptresolver`, `security-headers@file`). Built and
deployed by GitHub Actions.

**Project Type**: Static website plus build-time validation scripts.

**Performance Goals**: SC-001: the Saga page fully loaded in < 2 s on broadband. SC-004: dispatch
to verified live in < 10 min.

**Constraints**: No backend, no paid services, no client JS in this phase, noindex on every
response.

**Scale/Scope**: 1 written card, 83 ids in the register, 2 page routes. The validator must stay
fast for 80+ cards, which is trivial for a line scanner.

### Performance budget (constitution VI)

Enforced per HTML page in `dist/` by `npm run check:build` (CI fails when exceeded). Details in
[research.md R13](research.md#r13-performance-budget-constitution-vi).

| Budget | Limit |
|---|---|
| JavaScript (inline or external `<script>`) | **0 bytes** |
| CSS (same-origin `<link rel=stylesheet>` + inline `<style>`) | **≤ 2 KB** |
| HTML document | **≤ 50 KB** |
| Third-party origins referenced by scripts, styles, fonts or images | **0** |

gzip is off, so built bytes equal transferred bytes. Phase 2 must restate these budgets when it
adds styles and fonts.

### Health gate: what counts as "responds"

The full definition is in [contracts/http-contract.md § Health gate](contracts/http-contract.md#health-gate).
The deploy succeeds only when, **from the GitHub runner over the public internet**, one round of
three requests passes:

1. `GET /version.txt` → `200`, and the body equals the deployed short SHA, which proves the new
   container is serving.
2. `GET /` → `200`, `X-Robots-Tag` contains `noindex`, a robots meta tag with `noindex`, and a
   link to `/cards/saga/`.
3. `GET /cards/saga/` → `200`, `X-Robots-Tag` contains `noindex`, a robots meta tag with
   `noindex`, and the H1 `Saga`.

All three require a valid TLS certificate, no redirects followed, and a 10 s per-request timeout.
A round runs every 10 s for up to **180 s**. Otherwise the deploy fails, printing each URL's last
problems.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How this plan complies |
|---|---|---|
| I. Content integrity | ✅ | The Saga card follows the nine-section template with a cost row, radar status and `reviewed`. Vendor names appear only in In the wild and Go deeper (the mockup text already obeys this). The volatility and sourcing judgement is deferred to the Phase 6 checklist, as the spec's Assumptions say. |
| II. Validation over convention | ✅ | Required metadata, sections, order, cost row, related ids and TOPICS membership are machine-checked in CI. Staleness is a warning report. |
| III. Static-first | ✅ | `output: 'static'`, nginx serves `dist/`, there's no server runtime, and the budget enforces 0 JS. Self-hosted on polaris2. |
| IV. Sync-ready | ✅ | The permanent `id` comes from frontmatter via `generateId` and is independent of title and file name. Progress is out of scope. |
| V. Accessible and calm | ✅ | Plain semantic HTML: one H1, H2 sections, real links. There's no animation and no interactive element. |
| VI. Performance budget | ✅ | Concrete budgets above, checked in CI by `check:build`. |
| VII. Test-first | ✅ | Every logic module (schema, parsers, rules, staleness, report, `resolveRelated`, `checkPage`, `checkResponse`) is written red → green. Markup is exempt. |
| VIII. Simplicity | ✅ | React deferred, no Prettier, one CI job, a line scanner instead of an AST, no config files beyond what tools need. |
| IX. Official guides | ✅ with 1 documented deviation | `create astro`, `astro add mdx`, the official Vitest setup and the official nginx image. Scaffolding in a subfolder is explained in R1. |
| X. Spec-driven workflow | ✅ | On branch `001-walking-skeleton`, with Conventional Commits and a PR to `main`. |
| Constraint: secrets | ✅ | Deploy credentials live only in GitHub secrets. The public image means no registry token on the server. |
| Constraint: safe rendering | ✅ | No runtime JS. Astro escapes interpolated text by default, and no `set:html` is used. |
| Quality gates | ✅ | CI runs lint, tests, validate and build, so the merge gate holds. Deploy verifies the site responds, and the gate is defined exactly. |

**Post-design re-check (after Phase 1 artifacts)**: no new violations. Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-walking-skeleton/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16 + prerequisites
├── data-model.md        # Phase 1: Card, Domain, TopicEntry, CheckFailure, StaleEntry, Deployment
├── quickstart.md        # Phase 1: runnable validation scenarios
├── contracts/
│   ├── card-format.md   # Frontmatter + body section contract
│   ├── topics-format.md # TOPICS.md grammar the parser relies on
│   ├── validator-cli.md # CLI options, output, exit codes, rule codes
│   └── http-contract.md # Routes, headers, health gate, build-output checks
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
astro.config.mjs              # site: https://architecture.cativo.dev, integrations: [mdx()]
package.json                  # scripts: dev, build, preview, lint, test, validate, check:build
.nvmrc                        # 24
tsconfig.json                 # from the scaffold (astro/tsconfigs/strict)
eslint.config.js
vitest.config.ts              # getViteConfig()
Dockerfile                    # node:24-alpine build → nginx/nginx-unprivileged:alpine
.dockerignore
nginx/default.conf            # server-level X-Robots-Tag always, absolute_redirect off, listen 8080
compose.prod.yml              # Traefik labels, space-server_web, healthcheck
.github/workflows/
├── ci.yml                    # push/PR to main + workflow_call
└── deploy.yml                # workflow_dispatch → checks → publish → release → verify

src/
├── content.config.ts         # cards collection: glob + generateId(data.id) + shared schema
├── content/cards/saga.mdx
├── lib/
│   ├── domains.ts            # 13 slugs, numbers, display names
│   ├── topics.ts             # parseTopics(markdown)
│   └── cards/
│       ├── schema.ts         # Zod metadata schema (shared with Astro)
│       ├── parse-card.ts     # frontmatter split + YAML + section scan
│       ├── rules.ts          # validateCards(): per-card + cross-card rules
│       ├── staleness.ts      # ageInMonths, staleCards
│       ├── report.ts         # formatReport (stdout + Markdown summary)
│       └── related.ts        # resolveRelated() for the page
├── layouts/Base.astro        # <meta name="robots" content="noindex, nofollow">
├── components/RelatedCards.astro
└── pages/
    ├── index.astro           # unstyled index of cards
    └── cards/[id].astro      # card page

scripts/
├── validate-cards.ts         # CLI over src/lib/cards + topics
├── check-build.ts            # budget + noindex meta over dist/ (pure checkPage inside)
└── health-gate.ts            # post-deploy gate (pure checkResponse inside)

tests/
├── unit/                     # one file per lib module + checkPage + checkResponse
├── integration/validate-cli.test.ts
└── fixtures/
    ├── valid/{cards/,TOPICS.md}
    └── broken/{cards/,TOPICS.md}
```

**Structure Decision**: a single project at the repo root (Astro's default layout). Pure logic
lives in `src/lib/` so that the pages, the scripts and the tests import the same code. `scripts/`
holds only thin CLIs (I/O, args, exit codes). `check-build.ts` and `health-gate.ts` keep their
small pure cores inside the script file and export them for tests, because nothing else uses them.

## Implementation order (for /speckit-tasks)

1. **Setup:** scaffold (R1), `astro add mdx`, `.nvmrc`, `site`, ESLint, `astro check`, Vitest, and
   an empty CI that runs lint, test and build. Delete the scaffold's Astro favicons.
2. **Foundational (TDD):** `domains.ts`, `schema.ts`, `topics.ts`.
3. **US2 (TDD):** `parse-card.ts`, `rules.ts`, `report.ts`, the validator CLI, fixtures and the
   integration test. Wire `validate` into CI. This is the "CI provably fails on a broken card"
   proof.
4. **US3 (TDD):** `staleness.ts`, report output, `GITHUB_STEP_SUMMARY`.
5. **US1:**
   - `related.ts` (TDD), Base layout, index page, card page, `RelatedCards`, `saga.mdx`
   - `check-build.ts` (TDD), Dockerfile, nginx config, compose
   - `health-gate.ts` (TDD), deploy workflow
   - prerequisites: GitHub repo, secrets, `prod` environment (owner-confirmed outward actions)
   - first deploy
6. **Polish:** quickstart run-through, TOPICS.md `saga` → `[x]` once live, docs status.

US2 comes before US1's deploy on purpose. Nothing may be published until the checks that guard
publishing exist (FR-018).

## Risks

- **Undocumented MDX `components` behaviour for custom names** (R6). It's verified on 7.4.13, and
  the fallback is an explicit import per card.
- **First Let's Encrypt issuance** might take longer than 180 s. In that case, rerunning the
  deploy redeploys the same version (edge case), and the certificate is cached afterwards.
- **No GitHub remote yet.** Repo creation and secret setup are prerequisites, and they're
  outward-facing, so the owner confirms them at that task.

## Complexity Tracking

No constitution violations to justify.
