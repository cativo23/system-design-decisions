# Research: Walking Skeleton

Sources are official docs (docs.astro.build, nginx.org, docs.github.com, vitest.dev), plus spikes
run on 2026-11-23 in a throwaway scaffold (Astro 7.4.13, Node 24.15). A spike result is recorded
here as **verified** only when it was observed directly.

## R1. Scaffolding Astro the official way

- **Decision:** Astro **7.4.x** (latest stable), scaffolded with
  `npm create astro@latest astro-scaffold -- --template minimal --no-install --no-git --no-ai --yes`.
  Then move the scaffold's files to the repo root, merge its `.gitignore` into ours, set
  `"name": "systems-field-guide"`, and delete `astro-scaffold/`. Runtime is **Node 24 LTS**,
  pinned in `.nvmrc`; Astro requires ≥ 22.23.4 and doesn't support odd majors.
- **Rationale:** `create astro` is the official path (principle IX). **Verified:** pointed at
  the non-empty repo root (`.`) with `--yes`, it silently creates a randomly named subfolder.
  Scaffolding into a named subfolder and moving the files is the honest, official-CLI way to get
  the same files at the root. This is the one documented deviation.
- **Alternatives:** hand-writing `package.json` and the config (rejected: not the official guide);
  keeping the site in a subfolder (rejected: it adds a path prefix to every script and to CI
  for no benefit).

## R2. Integrations: MDX now, React later

- **Decision:** `npx astro add mdx`. **Defer `npx astro add react` to the first phase that ships
  an island** (Phase 3 palette or Phase 5 simulator).
- **Rationale:** FR-022 excludes every interactive feature from this phase, so React would be
  an unused dependency. Constitution VIII (no speculative machinery) outranks the roadmap prompt
  (Governance: the constitution wins over PHASES.md). Adding it later is a single official
  command with no rework. **Verified:** `astro add mdx` updates only `astro.config.mjs` and
  `package.json`. In Astro 7 it also adds `@astrojs/markdown-satteri`, the new default
  Markdown processor.
- **Alternatives:** add React now as the prompt says. That costs nothing at runtime (no client
  JS without islands), but it's an unused dependency that needs upgrades. ⚠ **Owner decision**:
  flagged in plan.md.

## R3. Content collection and schema

- **Decision:** `src/content.config.ts` defines a `cards` collection with
  `glob({ pattern: '*.mdx', base: './src/content/cards', generateId: ({ data }) => data.id })`.
  The Zod schema (`z` from `astro/zod`, Zod 4) lives in `src/lib/cards/schema.ts` and is imported
  by both `content.config.ts` and the validator, so there's one definition of "valid metadata".
- **Rationale:** `generateId` makes the frontmatter `id` the entry id and the URL, independent of
  the file name and title (FR-003, constitution IV). **Verified:** with that `generateId`, the
  page is emitted at `/cards/saga/`. `astro/zod` imports fine from a plain Node script. Unquoted
  `reviewed: 2026-11` parses as a string.
- **Why the schema alone isn't enough (verified):** with two invalid entries, `astro build` exits
  `1` but reports **only the first** (`cards → b data does not match collection schema`), so FR-013
  ("all failures in one run") can't rely on it. It also can't see sections, the cost row,
  cross-card ids or TOPICS.md. The schema in Astro is a second line of defence; the standalone
  validator (R4) is authoritative and runs **before** the build in CI.
- **Alternatives:** a custom loader that validates everything (rejected: errors still surface one
  at a time and it's harder to unit-test); validating only in Astro (rejected for the reason above).

## R4. Validator implementation

- **Decision:** pure TypeScript modules in `src/lib/cards/` and `src/lib/topics.ts`, plus thin
  CLIs in `scripts/`, run directly with **Node 24's built-in type stripping**
  (`node scripts/validate-cards.ts`, with no build step and no `tsx`). Frontmatter is split by
  its `---` fences and parsed with the **`yaml`** package. Sections come from a fence-aware line
  scan for `## ` headings. The cost row is a GFM table row in Trade-offs whose first cell
  normalises to `cost`.
- **Rationale:** the rules only need H2 headings and table rows, and a ~40-line scanner is easier
  to test and to read than an AST pipeline. Astro 7 renders Markdown with Sätteri, not unified,
  so remark isn't a free transitive dependency any more. Type stripping requires erasable-only
  syntax (no enums or namespaces), which the code follows. **Verified** on Node 24.15.
- **Alternatives:** `remark-parse` + `mdast` (rejected: a new dependency tree for two node
  kinds); `gray-matter` (rejected: `yaml` plus a fence split does the same with one smaller
  dependency); running the validator inside Vitest (rejected: CI needs a clear standalone check
  with its own exit code and report).

## R5. Master topic list as the id register

- **Decision:** `src/lib/topics.ts` parses `docs/TOPICS.md` with the grammar in
  [contracts/topics-format.md](contracts/topics-format.md). Both the validator (FR-011, FR-011a)
  and the site (titles for not-yet-available related cards, FR-011b) use it. The site reads the
  file at build time from the repo root.
- **Rationale:** the clarification makes TOPICS.md the single register. Parsing it, instead of
  keeping a duplicate JSON list, keeps one source of truth. The parser fails loudly on zero ids
  or a duplicate id, so a format drift can't pass silently.
- **Alternatives:** a generated `topics.json` (rejected: two sources); moving the register into
  the content collection (rejected: TOPICS.md is the human tracker and the session-close routine
  edits it).

## R6. Rendering related cards inside the Related section

- **Decision:** the card's `## Related` section contains `<RelatedCards />`. The page passes the
  component through `<Content components={{ RelatedCards }} />`, so authors don't import anything.
  The component reads the current card from `Astro.params.id`. The link-or-"not yet available"
  decision is a pure function, `resolveRelated(ids, writtenCards, topics)`, written test-first.
  The component only renders its result.
- **Rationale:** the ids live only in frontmatter, with no second list in the body to drift out of
  sync, and the list renders inside the Related section in template order. **Verified:** the docs
  only describe `components` for HTML element names, but the spike showed that a custom name
  used without an import renders, and that `Astro.params.id` inside it equals `saga`.
- **Risk:** the custom-name behaviour isn't documented, so a future Astro release could change it.
  The fallback is an explicit `import` line in each card, which is a mechanical change.
- **Alternatives:** an explicit import in every MDX file (kept as the fallback); rendering the list
  after the body (rejected: it would land after Go deeper, out of template order).

## R7. Tests

- **Decision:** **Vitest 5**, configured with `getViteConfig()` from `astro/config` as in the
  official testing guide. Unit tests cover the pure modules (schema, card parser, section rules,
  topics parser, cross-card rules, staleness, report formatting, `resolveRelated`, `checkPage`,
  `checkResponse`). Defects come from a valid fixture card that each test mutates (one defect per
  test), which demonstrates every SC-002 defect type. One integration test spawns the validator CLI
  on `tests/fixtures/` and asserts exit codes 0, 1 and 2.
- **Rationale:** TDD for all logic (constitution VII). Pure functions with injected `today` make
  date rules deterministic.
- **Alternatives:** `node:test` (rejected: the Astro guide documents Vitest, and Vitest gives
  better diffs).

## R8. Lint

- **Decision:** `npm run lint` = `eslint .` (flat config: `@eslint/js` recommended,
  `typescript-eslint` recommended, `eslint-plugin-astro` recommended) **and** `astro check`
  (adds `@astrojs/check` + `typescript`).
- **Rationale:** the constitution's quality gate requires lint. Astro docs list ESLint through
  the community `eslint-plugin-astro` and recommend `astro check` for type diagnostics (exit 1 on
  error). No Prettier in this phase (YAGNI).
- **Alternatives:** Biome (rejected: `.astro` support is only partial).

## R9. Container image

- **Decision:** a multi-stage `Dockerfile`: `node:24-alpine` build stage (`npm ci`,
  `npm run build`, write `dist/version.txt` from build arg `GIT_SHA`) →
  **`nginx/nginx-unprivileged:alpine`** runtime, listening on **8080**, with our
  `nginx/default.conf` and a `HEALTHCHECK` using BusyBox `wget`.
- **Rationale:** it's the same shape as the existing static site on polaris2 (nightwire-docs).
  The unprivileged variant is maintained by NGINX on Docker Hub as `nginx/nginx-unprivileged`
  (the old `nginxinc/…` name is unmaintained). It runs the master process as non-root, which
  follows the least-privilege rule at zero cost, since Traefik reaches it on any port.
  **Verified:** BusyBox `wget` exists in `nginx:alpine` (nginx 1.29.4); the unprivileged image
  uses the same Alpine base.
- **Alternatives:** `nginx:alpine` as the prompt says (master runs as root, port 80). ⚠ **Owner
  decision**: flagged in plan.md. Either way the config is identical apart from the `listen` port.

## R10. nginx configuration

- **Decision:** one `server` block: `root /usr/share/nginx/html`, `index index.html`,
  `absolute_redirect off`, and `add_header X-Robots-Tag "noindex, nofollow" always;` at server
  level. **No `location` block declares `add_header`.** gzip stays off.
- **Rationale:**
  - nginx drops inherited `add_header` directives in any block that declares its own, and the
    existing nightwire config has exactly that shape, so keeping headers at a single level avoids
    the trap.
  - `always` adds the header on 404 and 5xx too.
  - `absolute_redirect off` keeps the `/cards/saga` → `/cards/saga/` redirect relative, so it
    doesn't leak `http://…:8080` from behind Traefik.
  - gzip off makes the budget (R13) equal to bytes on the wire. With a ~20 KB page it isn't
    needed, and it's revisited in Phase 2 when CSS and fonts arrive.
- **Alternatives:** setting X-Robots-Tag with a Traefik headers middleware label (rejected: it
  wouldn't be versioned with the site, and it couldn't be checked locally with `docker run`).
  The existing `security-headers@file` middleware doesn't set X-Robots-Tag (checked in the
  space-server repo), so there's no duplicate.

## R11. CI workflow

- **Decision:** `.github/workflows/ci.yml` triggers on `push` to `main`, `pull_request` to
  `main`, and `workflow_call`. There's one job: checkout → setup-node (from `.nvmrc`, npm cache) →
  `npm ci` → `npm run lint` → `npm test` → `npm run validate` → `npm run build` →
  `npm run check:build`.
- **Rationale:** FR-016 needs the result to show on the PR, and GitHub shows workflow checks there
  natively. One sequential job is simpler than four parallel jobs for a repo this size. Validate
  runs before build so authors get the complete report (R3), not Astro's first error.
  `workflow_call` lets deploy reuse the exact same checks.
- **Alternatives:** separate jobs per step (rejected: setup is repeated four times for a ~1-minute
  pipeline).

## R12. Deploy workflow

- **Decision:** `.github/workflows/deploy.yml`, `on: workflow_dispatch`, `environment: prod`,
  `concurrency: deploy` (no cancel-in-progress, so a deploy is never killed mid-way). Jobs:
  1. `checks`: `uses: ./.github/workflows/ci.yml`. This reruns the full CI on the dispatched SHA.
  2. `publish` (`needs: checks`, `if: github.ref == 'refs/heads/main'`): buildx → push
     `<user>/system-design-decisions:latest` and `:<short-sha>`, with build arg `GIT_SHA=<short-sha>`.
  3. `release` (`needs: publish`): scp `compose.prod.yml` to
     `/home/cativo23/deploy/system-design-decisions`, then ssh `docker compose -f compose.prod.yml pull && docker compose -f compose.prod.yml up -d --remove-orphans && docker image prune -f`.
  4. `verify` (`needs: release`): checkout, setup-node, `node scripts/health-gate.ts --origin https://architecture.cativo.dev --expect-version <short-sha>`.
- **Rationale:**
  - FR-018: the deploy reruns the checks on the exact commit. If they fail, nothing is built
    or pushed, and the failed job says why (US1 scenario 5).
  - The `main` guard stops anyone from dispatching a feature branch to production.
  - A re-dispatch of the same SHA rebuilds the same tags and redeploys without error (edge case).
  - Running the gate on the runner, not over ssh, tests the public path.
  - The Docker Hub image is **public** (the site is public), so polaris2 pulls without a login,
    and the registry token never reaches the server. This differs from wizdaa, which logs in
    on the server.
  - Secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `POLARIS_USER`, `POLARIS_SSH_KEY`.
    Vars: `POLARIS_HOST`, `POLARIS_PORT`. Same names as wizdaa.
  - Actions: `actions/*` and `docker/*` pinned to major tags; third-party `appleboy/scp-action`
    and `appleboy/ssh-action` pinned to a full commit SHA, so a supply-chain change can't run with
    the deploy key.
- **Alternatives:** `workflow_run` after CI (rejected: it can't be dispatched manually per FR-017);
  trusting an earlier CI run's status via the API (rejected: more code, and a rerun is cheap,
  ~1 min).

## R13. Performance budget (constitution VI)

- **Decision:** `scripts/check-build.ts` enforces these per-page limits on every `dist/**/*.html`
  in CI:

  | Budget | Limit | Expected for Saga |
  |---|---|---|
  | JavaScript (any `<script>`, inline or external) | **0 bytes** | 0 |
  | CSS (linked same-origin stylesheets + inline `<style>`) | **≤ 2 KB** | 0 |
  | HTML document | **≤ 50 KB** | ~15–20 KB |
  | Third-party origins (any `src`/`href` on a script, stylesheet, font or image pointing off-site) | **0** | 0 |

  Bytes are measured as built. Since gzip is off (R10), that equals bytes transferred.
- **SC-001 (< 2 s full load):** with 0 JS, 0 CSS and one ~20 KB document, the load is one request
  plus TLS. The health gate prints each request's time as evidence, and the quickstart includes a
  one-off browser DevTools check.
- **Rationale:** concrete, machine-checked numbers that fail CI when exceeded. They're
  deliberately tight because the phase is unstyled. Phase 2 must restate them (CSS and fonts will
  arrive), as principle VI requires.
- **Alternatives:** Lighthouse CI (rejected: a heavy headless-Chrome dependency for a page with no
  JS); budget by gzip size (rejected: gzip is off, so raw size is what's actually transferred).

## R14. Health gate: what "responds" means

- **Decision:** defined exactly in
  [contracts/http-contract.md § Health gate](contracts/http-contract.md#health-gate). In short:
  three requests (`/version.txt`, `/`, `/cards/saga/`) must all pass in one round. Each needs a
  valid TLS certificate, `200` with no redirect, `X-Robots-Tag: noindex`, the robots meta tag,
  and the expected content. `/version.txt` must equal the deployed SHA. Rounds run every 10 s
  for up to 180 s, with a 10 s timeout per request.
- **Rationale:**
  - A bare `curl -sf /` would pass while the *previous* container still serves, or with
    noindex missing. The version check proves this deploy is live.
  - The noindex assertion is required by FR-021.
  - 180 s covers a first-time Let's Encrypt issuance and still fits SC-004 (< 10 min end to end).
  - It's implemented in Node (`scripts/health-gate.ts`, built-in `fetch`) instead of a curl
    one-liner, so the assertion logic is a pure, test-first function (constitution VII). This is
    a deliberate deviation from the prompt's "curl". ⚠ Flagged in plan.md.
- **Alternatives:** `curl` with `grep` in YAML (rejected: untestable, and header checks in shell
  are brittle); checking from inside polaris2 (rejected: it skips public DNS and TLS).

## R15. Staleness report visibility

- **Decision:** the validator always prints the staleness report, and appends it to
  `$GITHUB_STEP_SUMMARY` when that variable is set.
- **Rationale:** US3 says "the owner receives a report". The run summary page is where the owner
  looks, and it needs no extra service.

## R16. Saga card content

- **Decision:** port the approved mockup text into `src/content/cards/saga.mdx`:
  - `domain: distributed-data`, `order: 3` (after idempotency and outbox-cdc in TOPICS.md),
    `status: adopt`, `reviewed: 2026-11`
  - `related: [outbox-cdc, idempotency, durable-execution]`
  - Use/Avoid as `###` sub-lists, Trade-offs as a GFM table with a `cost` row, In the wild as a
    list, Pitfalls as a list, Related as `<RelatedCards />`, Go deeper as links.
  - **No simulator and no diagram**: FR-022 excludes them, and Phase 5 adds them. How it works
    keeps its prose.
- **Rationale:** the content is already approved, and it's the real card that travels the whole
  path. All three related ids are planned but unwritten, so the page exercises the "not yet
  available" path (FR-011b).

## Prerequisites found during research

- **No git remote exists.** CI and deploy need a GitHub repository. Creating it (name and
  visibility) is an outward action that the owner confirms during implementation.
- **DNS:** `architecture.cativo.dev` already resolves to polaris2 through the `*.cativo.dev`
  wildcard (checked), so no DNS change is needed.
- **Repo secrets and vars** (R12) and the `prod` environment must be configured before the first
  deploy.
- **Branch protection** on `main` that requires the CI check is **required**, so a red PR can't
  merge (FR-016, constitution § Quality gates). It's a GitHub setting, not code. On the free plan
  it's only available for public repositories.
