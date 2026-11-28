# Phases & Roadmap

> Read [DESIGN.md](DESIGN.md) first. Card tracker: [TOPICS.md](TOPICS.md).

## Status

| Phase | Name | Status | spec-kit feature |
|---|---|---|---|
| 0 | Project init + constitution | ✅ done | n/a (one-off) |
| 1 | Walking skeleton | ✅ done: `/speckit-converge` reported Converged (T001–T055 done). Saga is live at architecture.cativo.dev (noindex) via deploy.yml, in repo `cativo23/system-design-decisions` (`main` protected). 187 tests green. The quickstart run found one bug (blank health-gate failure lines), now fixed | `specs/001-walking-skeleton` |
| 2 | Design system & card layout | ✅ done, merged (PR #3, `034701c`) and deployed to architecture.cativo.dev (noindex); the post-deploy health gate passed all four requests, font included. T001–T080 done; `/speckit-converge` found 4 gaps in its first pass (T077–T080, fixed) and nothing left after. 373 tests green. Card format v2 (meters, `why` on related, `<Pitfall>`, `<Source>`, 9 new validator rules), shell with persisted tree, phone menu, keyboard and reduced-motion work (checked by Carlos with devtools emulation), text in `rem`, real budgets measured (Saga page: JS 7.1 KB, CSS 5.6 KB, fonts 101.9 KB, page 123 KB). SC-006 measured live on broadband: first and largest contentful paint 660 ms, layout shift 0, one origin. Not measured: a throttled Slow 4G run (devtools preset), which the tools could not apply | `specs/002-design-system-card-layout` |
| 3 | Discovery (search, path, radar) | 🟨 implemented and converged on its branch (T001–T066 done, 564 tests, 18 pages and the search index within budget, health gate green against the container); PR open. Pending: T067 (Carlos's browser checks: cold-offline error line, reduced motion, JavaScript off, the "Loading…" line), merge and deploy. Search is a build-time JSON index with an in-house typo-tolerant matcher, not Pagefind (measured: no typo tolerance, DESIGN D14); the palette is a native `<dialog>` loaded when idle. JS 11.1 KB of 12 KB on the Saga page | `specs/003-discovery-search-paths` |
| 4 | Progress | ⬜ pending | |
| 5 | ASCII diagram & simulator kit | ⬜ pending | |
| 6 | Content pipeline | ⬜ pending | |
| 7 | Content MVP (41 cards) | ⬜ pending | |
| 8 | Freshness operations | ⬜ pending | |

Legend: ⬜ pending · 🟨 in progress · ✅ done. Fill in the `specs/NNN-…` folder once spec-kit creates it.

```
0 → 1 → 2 ─┬→ 3
           ├→ 4
           └→ 5 ─┐
      1 → 6 ─────┴→ 7 → 8
```
v1 ships when Phase 7 is done.

---

## How we work (non-negotiable)

### Spec-Driven Development with spec-kit
spec-kit is installed as `specify` 1.4.3 and runs as Claude skills (`.claude/skills/speckit-*`). The bundled **git extension** is installed: `/speckit-specify` creates the `NNN-…` feature branch. All its auto-commit hooks are off (`.specify/extensions/git/git-config.yml`), so every commit is deliberate. The constitution is v1.0.0 (`.specify/memory/constitution.md`).

- **The constitution is written once** (Phase 0) and updated only on purpose.
- **Each phase from 1 to 8 is one spec-kit feature.** Run these steps in order, one at a time, and review each artifact before moving on:
  1. `/speckit-specify <the phase's specify prompt>`: **what and why only, no tech**
  2. `/speckit-clarify`: resolve ambiguities before planning
  3. `/speckit-checklist`: optional, a quality gate for requirements
  4. `/speckit-plan <the phase's plan prompt>`: **tech lives here**
  5. `/speckit-tasks`
  6. `/speckit-analyze`: cross-check consistency between spec, plan and tasks
  7. `/speckit-implement`
  8. `/speckit-converge`: repeat implement and converge until it reports **Converged**
- Don't skip steps, and don't put technology into `/speckit-specify`.
- **TDD inside implement:** red → green → refactor for validators, the progress store, the simulator engine and components with logic.
- **Git:** one feature branch per phase (spec-kit names it `NNN-…`). Use conventional commits and open a PR to `main`.
- **Official guides first:** scaffold and configure every technology by following its official docs (Astro install, `astro add`, Pagefind, spec-kit). Don't use third-party templates.

### Content work (Phase 7)
- Cards are written with a **multi-agent Workflow** using the pipeline built in Phase 6 (draft → verify sources and freshness → template review). Launch it only when Carlos explicitly asks.

### End of every session
1. Update this file's **Status** table and [TOPICS.md](TOPICS.md).
2. Give Carlos the **ready-to-paste prompt for the next session**.

---

## Phase 0: Project init + constitution
**Goal:** a repo that is initialised the official way, with spec-kit wired in and the constitution written.

Steps:
1. `git init` in `systems-field-guide/` (the `docs/` folder already exists).
2. `specify init --here --integration claude`. Follow the spec-kit docs if it asks about the non-empty directory.
3. `/speckit-constitution` with:

```
Create the constitution for Systems Field Guide, a static web guide to industry software/system architecture (see docs/DESIGN.md). Principles:
1. Content integrity: every card follows the fixed decision-card template (TL;DR, Problem, How it works, Use/Avoid, Trade-offs with a cost row, In the wild, Pitfalls, Related, Go deeper); tool/vendor names appear only in In the wild and Go deeper; every card has a radar status and a last-reviewed date; claims cite sources. No interview-prep content.
2. Validation over convention: anything the template requires is enforced automatically at build/CI time, never by memory.
3. Static-first, no backend in v1: everything renders at build time; JavaScript only for interactive islands; no paid or managed services — production self-hosts on the owner's server.
4. Sync-ready by design: stable card ids, all progress access through a single storage interface, progress entries carry updatedAt.
5. Accessible and calm: keyboard-reachable everything, visible focus, prefers-reduced-motion fully respected, diagrams readable without animation.
6. Performance budget: content pages must stay light (define concrete budgets in plans).
7. Test-first: red-green-refactor for all logic (validators, stores, simulator engine, components with behaviour).
8. Simplicity: YAGNI, smallest viable solution, no speculative abstractions or config.
9. Official guides: every technology is installed and configured following its official documentation.
10. Workflow: spec-kit SDD per feature (specify → clarify → plan → tasks → analyze → implement → converge), conventional commits, one branch per feature.
```

**Done when:** `.specify/memory/constitution.md` exists, has been reviewed, and is committed.

---

## Phase 1: Walking skeleton
**`/speckit-specify` prompt:**
```
Walking skeleton for Systems Field Guide. A reader can open a published card page (the "Saga" card, unstyled) at the production URL.
Cards are authored as content files with structured metadata: permanent id, title, domain (one of 13), order within the domain, radar status (adopt/trial/assess/hold), last reviewed (YYYY-MM), tags, aliases, related card ids.
Publishing must FAIL when a card: is missing required metadata; lacks any required template section (TL;DR, Problem it solves, How it works, Use it when / Avoid it when, Trade-offs including a cost row, In the wild, Pitfalls, Related, Go deeper); or references a related id that does not exist.
Cards not reviewed in more than 12 months produce a warning report, not a failure.
Every merge to main runs the checks; a manual deploy action publishes to production and verifies the site responds.
Out of scope: visual design, search, progress, diagrams.
```
**`/speckit-plan` prompt:**
```
Astro (latest stable) scaffolded via the official install guide (npm create astro@latest), MDX and React added with `npx astro add`. Cards live in an Astro content collection with a Zod schema; template/section/related validators as Node scripts with Vitest tests (TDD). Docker multi-stage build → nginx:alpine serving the static dist. GitHub Actions: ci.yml (lint, test, validate, build) and deploy.yml (workflow_dispatch: buildx → Docker Hub tags latest + short-sha → SSH to polaris2 → docker compose pull && up -d → curl health gate). Traefik labels on the space-server_web network, certresolver letsencryptresolver, security-headers@file middleware — same pattern as wizdaa-takehome. No paid services.
Host: architecture.cativo.dev. Until public launch every response carries `X-Robots-Tag: noindex` (plus a robots meta tag) and the health gate asserts it. The related-id validator reads the master card list from docs/TOPICS.md (written cards link, planned-but-unwritten render as "not yet available").
```
**Done when:** Saga is live at the production URL and CI provably fails on a broken card (shown by a test).

---

## Phase 2: Design system & card layout
**`/speckit-plan` input:** the approved mockup `docs/mockups/saga-card.html`.

**`/speckit-specify` prompt:**
```
Give the guide its approved visual identity ("Linear × terminal", see docs/DESIGN.md §5 and docs/mockups/saga-card.html). Every card page has: top bar with brand and search trigger; left tree index of domains/cards with per-domain progress glyphs; reading column; right "on this page" TOC that highlights the current section; bottom tmux-style status line (mode, domain, file, radar status, domain progress, scroll %).
Card sections render as: prompt breadcrumb + typed title, radar badge + reviewed date + tags, TL;DR panel, diff-style Use/Avoid, trade-offs table with ASCII meters, `ls`-style In the wild marked volatile, expandable WARN pitfalls, related cards with radar badges and `cd` hints, Go deeper list, prev/next pager.
Moving between cards keeps the shell (tree, status line) in place without a full reload feel. Works at phone width. Fully keyboard reachable; prefers-reduced-motion disables all animation.
The Saga card must look like the mockup.
```
**Plan notes:** decide **Tailwind v4 vs plain CSS tokens** here. Use Astro View Transitions with `transition:persist`. Self-host the fonts or load them from Google Fonts.

---

## Phase 3: Discovery
**`/speckit-specify` prompt:**
```
Readers can find any card in seconds and follow a learning path.
- Command palette opened with ⌘K/Ctrl+K or "/", fuzzy-matching titles, aliases and tags, showing domain and radar status, keyboard navigable, Esc closes.
- Catalog page listing all domains; a page per domain listing its cards in path order.
- Learning path page: the recommended reading order across domains.
- Radar page: all cards grouped by adopt/trial/assess/hold.
- Keyboard: j/k jump between sections on a card.
- Home page at the root, in the approved style: a short hero (what the guide is, who it's for), two entry points (start the learning path; search), a grid of the 13 domains with card counts and progress meters, and a freshness strip (recently reviewed cards and radar changes). It replaces the minimal index from Phase 1.
Works offline from the static build (no search server).
```
**Plan notes:** no Pagefind (measured: no typo tolerance, see DESIGN D14): a build-time JSON index plus a tested in-house matcher. The palette is a native `<dialog>` with a script loaded when idle, not a React island (React is still deferred).

---

## Phase 4: Progress
**`/speckit-specify` prompt:**
```
A reader can mark each card as not yet / read / mastered. Progress persists in their browser across visits, shows on the card, in the tree index (per card and per-domain meters), in the status line, and on a progress page with totals per domain. Progress can be exported to a file and imported back (to move between devices manually). Progress is keyed by the card's permanent id, and each entry records when it last changed. If storage is unavailable, the site works normally without progress.
```
**Plan notes:** a `ProgressStore` interface with a `LocalProgressStore`, and entries stored as `{state, updatedAt}`. Write the tests first.

---

## Phase 5: ASCII diagram & simulator kit
**`/speckit-specify` prompt:**
```
Card authors can embed ASCII diagrams in a card, optionally as step-by-step simulations: a diagram plus a terminal-style event log, play/replay controls, optional view toggles (e.g. orchestration vs choreography) and scenario toggles (e.g. failure vs happy path). Simulations auto-play once when scrolled into view, can be re-run with the "r" key, and are fully readable without animation. Port the Saga simulation from the mockup as the first one. Document when to use ASCII versus an SVG diagram.
```
**Plan notes:** a React island with `client:visible`. The engine runs step scripts and builds the DOM with `textContent` only, never `innerHTML`. TDD the engine.

---

## Phase 6: Content pipeline
**`/speckit-specify` prompt:**
```
Make writing a high-quality card fast and consistent:
- An authoring guide: voice, the template rules, sourcing rules (primary sources preferred, every claim verifiable), freshness rules, volatility rule (tools only in In the wild/Go deeper), cost row, ASCII-first diagrams.
- A command that scaffolds a new card from its id in TOPICS.md with all required sections and metadata.
- A review checklist a card must pass before it is marked published.
- A repeatable multi-agent process (draft → verify sources & currency → template review) that produces cards in batches, plus how TOPICS.md is updated.
```

---

## Phase 7: Content MVP
Write the 41 MVP cards in four waves using the Phase 6 Workflow. Launch it only when Carlos asks.

| Wave | Domains |
|---|---|
| 1 | 01 Foundations, 02 Styles, 04 Communication |
| 2 | 05 Distributed data, 06 Storage, 07 Traffic |
| 3 | 08 Data platforms, 09 Reliability, 10 Security |
| 4 | 11 AI systems, 12 Craft |

**Done when:** all 41 cards pass validation and review, [TOPICS.md](TOPICS.md) shows them `[x]`, and they are deployed.

---

## Phase 8: Freshness operations
**`/speckit-specify` prompt:**
```
Keep the guide trustworthy over time: a report of cards past their review window (published as part of CI), a visible "needs review" marker on stale cards, and a changelog page of radar status changes (card, from → to, date, reason).
```

---

## Backlog
Not in v1. Keep them here so they aren't forgotten.

- **Sync** (cross-device progress): Astro Node adapter, SQLite on a Docker volume, better-auth with GitHub OAuth, all on polaris2. The DESIGN §6.1 rules already prepare for it.
- "X vs Y" comparison pages (e.g. modular monolith vs microservices, saga vs 2PC).
- A relationship map: a graph of how cards connect.
- Domain 13 reference architectures (feed, chat, payments, search, RAG assistant).
- The remaining 42 non-MVP cards.
- Public launch: SEO, OG images, RSS, a license, deciding on analytics.
- Quizzes or spaced repetition.
