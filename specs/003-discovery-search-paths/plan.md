# Implementation Plan: Discovery (search, catalog, learning path, radar, home)

**Branch**: `003-discovery-search-paths` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-discovery-search-paths/spec.md` (clarified on
2026-11-26 and 2026-11-27, seven questions) and the owner's plan prompt (Pagefind, a palette
island loaded with `client:idle`, official guides, self-hosted, no backend, reuse the shell).

## Summary

Let readers find any card in seconds and follow a path, on the Phase 2 static site, with no new
runtime dependency.

- **Search:** at build time one small JSON file is generated from the same content as the cards
  (title, aliases, tags, domain, radar status, URL). A small, tested, in-house matcher ranks
  results and tolerates typos. The palette is a native `<dialog>` driven by plain TypeScript.
- **Pages:** home (`/`), catalog (`/catalog/`), one page per domain (`/catalog/<domain>/`),
  learning path (`/path/`), radar (`/radar/`). All are static, all render inside the existing
  shell, all are built from one pure "catalog" module over `docs/TOPICS.md` plus the cards.
- **Keyboard:** `⌘K` / `Ctrl+K` / `/` open the palette; `j` / `k` move between sections of a card.
  The decisions are pure functions; `shell.ts` stays DOM glue.
- **Budgets:** the JS budget stays at 12 KB gzipped (the palette fits: Saga page 11.1 KB measured);
  a search-index budget is added; everything else is unchanged.

## ⚠ Decisions for the owner (deviations from the plan prompt and open choices)

| # | Prompt / default | Plan does | Why | To revert |
|---|---|---|---|---|
| 1 | "Pagefind for search" (DESIGN §6, PHASES Phase 3 note) | **No Pagefind.** A build-time JSON index plus an in-house fuzzy matcher. **Approved by Carlos on 2026-11-27.** | Measured in a scratch project: Pagefind finds `saga`, `sag`, `transac` and the alias `distributed transaction`, but **0 results** for `sga`, `distribtued`, `consitency`; FR-003 and SC-002 require typo tolerance. It also ships about 47 KB JS plus about 55 KB wasm (raw) to search titles, aliases and tags only ([R1](research.md#r1-search-engine-no-pagefind)) | `npx astro add` is not needed; add `pagefind` as a build step and a typo layer, and drop SC-002's typo cases |
| 2 | "Palette is an Astro island loaded with `client:idle`" | A **native `<dialog>`** in the shell plus a script **loaded when the browser is idle** (`requestIdleCallback`, with the first open also loading it). Not a framework island | React was deferred in Phase 1 (approved), `client:idle` only exists for framework components, and `<dialog>` gives the focus trap, Esc and background inerting for free ([R2](research.md#r2-the-palette-dialog-script-and-idle-loading)) | Add `@astrojs/react` and port `palette.ts` to a component |
| 3 | JS budget 12 KB (Phase 2) | **Kept at 12 KB** gzipped per page, now counting the palette chunk; new **search index ≤ 12 KB gzipped**. (The plan first raised it to 18 KB on an estimate; measured it was not needed.) | The checker did not count the palette chunk until its import regex learned backticks (fixed with a test); counted, the Saga page is 11.1 KB. Numbers in [R8](research.md#r8-performance-budget-constitution-vi) | Raise the constant if the next feature needs it, with its reason here |
| 4 | Spec lists the new pages but no way to reach catalog, path and radar from a card page | **Three links in the top bar** (`catalog`, `path`, `radar`), placed in the phone menu at ≤ 880 px ([R5](research.md#r5-reaching-the-new-pages-top-bar-links)) | Without them FR-008..FR-011 pages are unreachable except from the home | Drop the links; pages stay reachable only via home and the palette |
| 5 | Two orderings exist: `order` in each card and position in `docs/TOPICS.md` | **Path order is the position in `docs/TOPICS.md`** (what the tree and pager already use). A new cross-card **validator rule** fails the build if a published card's `order` disagrees with its position | One source of truth for path order (FR-016, SC-005); constitution II wants it enforced, not remembered ([R6](research.md#r6-one-source-of-truth-for-path-order)) | Skip the rule and treat `order` as informational |
| 6 | Root page exempt from skip-link and landmark checks "until Phase 3" (Phase 2 build-budget contract) | **Exemption removed**: the home now has the shell, so it must pass every check | The exemption said Phase 3 would end it | Keep the exemption |
| 7 | Constitution III: client JS limited to interactive islands | Same reading as Phase 2 (ratified 2026-11-25): behaviour that needs script is allowed when budgeted and degrading without script. The palette and `j`/`k` follow it. **No amendment** | Pages stay fully readable with scripts blocked (SC-010) | n/a |

## Technical Context

**Language/Version**: TypeScript (erasable syntax only) on Node 24 LTS, as before. Astro 7.4.x.
Client code is plain TypeScript bundled by Astro (no React, no island).

**Primary Dependencies**: existing only: `astro`, `@astrojs/mdx`, `yaml`. **No new package.**
The JSON file is an official Astro static endpoint (`src/pages/*.json.ts`, `APIRoute`); the
dialog is the HTML `<dialog>` element.

**Storage**: files in git (`src/content/cards/*.mdx`, `docs/TOPICS.md`). Build output adds
`dist/search-index.json`. No runtime storage (reader progress is Phase 4).

**Testing**: Vitest for the pure modules in `src/lib/discovery/` and for the extended
`checkPage` / `checkResponse`; `check:build` over `dist/`; a manual browser run per
[quickstart.md](quickstart.md) for keyboard, focus, offline and phone width.

**Target Platform**: static site in `nginx-unprivileged` on polaris2 behind Traefik, as Phases
1–2. Current evergreen Chrome, Firefox and Safari (`<dialog>` and `requestIdleCallback` have a
fallback, see R2).

**Project Type**: static web site (single project).

**Performance Goals**: palette results within 100 ms of each keystroke (SC-003); palette open
with the field focused in one frame once loaded.

**Constraints**: per-page and index budgets in [contracts/build-budget.md](contracts/build-budget.md);
0 third-party origins; works offline after load (SC-004); text inserted only with text APIs
(constitution, safe rendering); reduced motion disables new animation.

**Scale/Scope**: 83 planned topics in 13 domains, 1 published card now, 41 MVP cards in
Phase 7. Index sized for 85 cards.

## Constitution Check

*GATE: passes before Phase 0; re-checked after Phase 1 design (below).*

| Principle | Status | Note |
|---|---|---|
| I Content integrity | ✅ | No change to cards or template. Pages show radar status and reviewed month (FR-011, FR-015) |
| II Validation over convention | ✅ | New rule `order-matches-topics` (decision 5); build checks extended (decision 6) |
| III Static-first | ✅ | Every page rendered at build; search works from the static build; JS limited to the palette and key handling, budgeted (decision 7) |
| IV Sync-ready | ✅ | Cards keyed by permanent `id` in the index; progress untouched |
| V Accessible and calm | ✅ | Keyboard-only palette, focus return, visible focus, reduced motion, `[hidden]` rule kept ([contracts/ui-contract.md](contracts/ui-contract.md)) |
| VI Performance budget | ✅ | Concrete numbers and the check are in [contracts/build-budget.md](contracts/build-budget.md); one budget raised with its reason (decision 3) |
| VII Test-first | ✅ | Matcher, catalog, radar, freshness, key and palette-state logic are pure and built red → green; the DOM glue is exempt as in Phase 2 |
| VIII Simplicity | ✅ | No search engine dependency, no framework, no service worker (R3). Added in complexity tracking: none |
| IX Official guides | ⚠ justified | Search deviates from DESIGN §6 (decision 1) with a measured reason; Astro endpoint and `<dialog>` follow the official docs |
| X Spec-driven | ✅ | Steps followed in order; reviewed spec before plan |

**Post-design re-check**: unchanged. Nothing in Phase 1 design added a dependency, a service
worker or an abstraction beyond the pure modules listed below.

## Project Structure

### Documentation (this feature)

```text
specs/003-discovery-search-paths/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── search-index.md      # shape of dist/search-index.json and the matcher's rules
│   ├── ui-contract.md       # routes, shortcuts, dialog accessibility, status line, shell
│   └── build-budget.md      # budgets, structure checks and health gate amendments
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── lib/discovery/                 # new, pure, all tested first
│   ├── catalog.ts                 # topics + cards → domains with entries, counts, path order
│   ├── search-index.ts            # cards → SearchEntry[] (and the size guard)
│   ├── match.ts                   # normalize, edit distance, rank
│   ├── radar.ts                   # published cards → four fixed groups
│   ├── freshness.ts               # top 5 by reviewed month, then title
│   ├── keys.ts                    # shouldOpenPalette, adjacentSection (j/k)
│   ├── palette-state.ts           # open/closed/loading state machine, result cursor
│   └── status-fields.ts           # status line fields per page kind
├── lib/cards/rules.ts             # + order-matches-topics (cross-card rule)
├── pages/
│   ├── index.astro                # replaced: home
│   ├── catalog/index.astro        # new
│   ├── catalog/[domain].astro     # new, one per domain (13)
│   ├── path.astro                 # new
│   ├── radar.astro                # new
│   └── search-index.json.ts       # new static endpoint
├── layouts/Shell.astro            # card prop optional; page kind drives TOC and status line
├── components/
│   ├── SearchDialog.astro         # new: the <dialog> markup, in every Shell page
│   ├── TopBar.astro               # search trigger live; three nav links
│   ├── StatusLine.astro           # optional file/status/domain fields
│   ├── DomainTile.astro           # new: used by home and catalog
│   └── EntryList.astro            # new: published/"not yet available" rows (domain, path)
├── scripts/shell.ts               # + shortcuts, j/k, idle loader
├── scripts/palette.ts             # new chunk: dialog behaviour, fetch, render (text APIs)
└── styles/discovery.css           # new: palette, home, lists (plain CSS tokens)

scripts/check-build.ts             # budgets, index budget, home no longer exempt
scripts/health-gate.ts             # + search-index request
tests/unit/                        # one test file per new lib module, plus extended ones
```

**Structure Decision**: the single existing project. Logic goes in pure modules under
`src/lib/discovery/`; pages and components stay thin; the palette script is the only new
client code besides the key handling added to `shell.ts`.

## Performance budget

Per HTML page, gzip level 6 (nginx's level), same measurement as Phase 2 (`check:build`).

| Budget | Phase 2 | Phase 3 | Why |
|---|---|---|---|
| JavaScript (inline + same-origin scripts + imported chunks, **dynamic imports included**) | ≤ 12 KB | **≤ 12 KB** (unchanged) | Saga page was 7.1 KB, now 11.1 KB with the palette, matcher and `j`/`k`; 0.9 KB of headroom left ([R8](research.md#r8-performance-budget-constitution-vi)) |
| CSS | ≤ 8 KB | ≤ 8 KB | Saga page was 5.6 KB, now 7.1 KB with the palette, home, lists, radar and navigation; 0.9 KB of headroom left |
| Fonts | ≤ 110 KB | ≤ 110 KB | No new font |
| HTML, raw | ≤ 50 KB | ≤ 50 KB | Longest new page is the learning path (83 rows) plus the tree: 44.4 KB measured |
| Whole page, gzipped | ≤ 150 KB | ≤ 150 KB | Saga page 123 KB + palette JS fits |
| Third-party origins | 0 | 0 | unchanged |
| **`search-index.json`, gzipped** | n/a | **≤ 12 KB** at 85 entries | New; checked in `check:build`; entry size is tested too |

How checked: `npm run check:build` fails the build when a page or the index is over a limit
(SC-011). `--report` records the real numbers, which are written into research.md after
implementation, as Phase 2 did.

## Complexity Tracking

No constitution violation to justify. The one deviation (Pagefind, decision 1) is a plan-level
choice with a measured reason, not a violation: principle IX asks for official guides *where a
technology is used*, and no search engine technology is used.
