# Implementation Plan: Design System & Card Layout

**Branch**: `002-design-system-card-layout` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-design-system-card-layout/spec.md` (clarified on
2026-11-25, five questions)

## Summary

Give every card page the approved "Linear × terminal" look and its fixed frame, on the Phase 1
static site, with no new framework.

- **Look:** plain CSS tokens ported from `docs/mockups/saga-card.html` (no Tailwind). Fonts are
  self-hosted through Astro's Fonts API.
- **Card body:** still MDX, rendered with `components` mappings (`h2`, `h3`, `table`) plus four
  small components (`Meter`, `Pitfall`, `Source`, `RelatedCards`) and section-scoped CSS. No
  markdown plugin, no `set:html`.
- **Frame:** a shell layout (top bar, tree, table of contents, status line). Astro's
  `<ClientRouter />` makes card-to-card moves feel instant; the tree is `transition:persist`.
- **Data:** the card format grows (R4): meters in the trade-offs table, a `why` on each related
  card, `<Pitfall>` and `<Source>` blocks. The validator learns the new rules test-first.
- **Budgets:** Phase 1's "0 JS, ≤ 2 KB CSS" is replaced by measured limits, enforced in CI, with
  nginx now gzipping and caching hashed assets.

## ⚠ Decisions for the owner (choices and deviations from the plan prompt)

| # | Prompt / default | Plan does | Why | To revert |
|---|---|---|---|---|
| 1 | "Decide Tailwind v4 vs plain CSS" | **Plain CSS**, no Tailwind | MDX output carries no classes, so utilities can't reach it; mockup is already tokenized CSS; constitution VIII ([R1](research.md#r1-styling-plain-css-tokens-no-tailwind)) | `npx astro add tailwind` and port rules |
| 2 | "`transition:persist` for the shell (tree, status line)" | **Persist the tree only**; top bar and status line re-render per page | The status line's fields change every page; persisting it needs extra rewrite code for no visible gain; the swap is one frame ([R5](research.md#r5-navigation-and-persistence-clientrouter-persist-the-tree-only)) | Add `transition:persist` on the status line and a field-update handler |
| 3 | "Fonts self-hosted or Google" | **Self-hosted** via the Fonts API, `symbols2` subset included, Inter without its `opsz` axis | Keeps 0 third-party origins and no IP leak; Geist Mono's box-drawing glyphs live in `symbols2` ([R2](research.md#r2-fonts-self-hosted-through-astros-fonts-api)) | Swap the provider to `google()` and drop the 0-origin budget |
| 4 | Card format unchanged | **Card format v2** is a breaking change to `related` and adds `<Meter>`, `<Pitfall>`, `<Source>`, directory-style In-the-wild names | The layout needs this data and the constitution wants it validated, not remembered ([R4](research.md#r4-card-format-v2-what-authors-write)) | None cheap: the mockup can't be matched without it |
| 5 | Budgets "restated" | JS ≤ 12 KB, CSS ≤ 8 KB, fonts ≤ 110 KB, HTML ≤ 50 KB, page ≤ 150 KB, 0 third-party origins, all gzip except fonts | Measured, see Performance budget below | Edit the constants and this table |
| 6 | Phase 1 nginx: gzip off | **gzip on** (level 6) and 1-year `immutable` caching for `/_astro/` | Fonts are ~100 KB and should download once; budgets are in transferred bytes ([R12](research.md#r12-nginx-gzip-and-long-lived-caching-for-hashed-assets)) | Remove the two blocks and measure budgets raw |
| 7 | Health gate unchanged | A **fourth request** (a font file: 200, noindex, `immutable`) | Proves the `/_astro/` location kept `X-Robots-Tag` in production (R13) | Remove the font check |
| 8 | Mockup colours | `--fg-faint` `#5d626b` → `#7d828c` | 4.5:1 contrast (clarification 2); every other token already passes ([R10](research.md#r10-contrast-one-token-changes)) | Revert the token and drop the contrast test |
| 9 | Constitution III says client JS is "limited to interactive islands" | The plan reads III as covering **interactive behaviour that needs script** (router, live TOC and scroll position, phone menu), budgeted and degrading without script, not only framework islands. It does **not** amend the constitution. **Ratified by Carlos on 2026-11-25.** | The router and shell script are not islands, and DESIGN §6 (approved) lists View Transitions; III's wording does not say whether that is allowed | Ratified, so no amendment |

## Technical Context

**Language/Version**: TypeScript (erasable syntax only) on Node 24 LTS, as Phase 1. Astro
7.4.x. Client code is plain TypeScript bundled by Astro (no React, no island).

**Primary Dependencies**: existing: `astro`, `@astrojs/mdx`, `yaml`. No new package: the fonts
come from Astro's Fonts API with the `fontsource` provider (`fontProviders.npm()` was tried in
T002 and rejected, see R16), and `<ClientRouter />` is built in. No Tailwind, no React, no test
runner added.

**Storage**: Files in git only (`src/content/cards/*.mdx`, `docs/TOPICS.md`). No runtime
storage; reader progress does not exist yet.

**Testing**: Vitest (Phase 1 setup) for pure logic and `checkPage` / `checkResponse`; `check:build`
over `dist/` for budgets and structure; manual browser run per [quickstart.md](quickstart.md)
for visuals and behaviour (R14).

**Target Platform**: static site in `nginx-unprivileged` on polaris2 behind Traefik, as Phase 1,
with the nginx changes in [R12](research.md#r12-nginx-gzip-and-long-lived-caching-for-hashed-assets).
Browsers: current evergreen Chrome, Firefox, Safari (the router falls back to a plain swap
without the View Transitions API).

**Project Type**: static website plus build-time validation scripts (unchanged).

**Performance Goals**: SC-006: card text visible in < 2 s on broadband; no visible layout jump
when fonts arrive (size-adjusted fallbacks, R2).

**Constraints**: no backend, no paid or managed services, 0 third-party origins, noindex on every
response (FR-023), reduced motion honoured everywhere, works with scripts blocked (FR-008).

**Scale/Scope**: 1 written card, 83 ids in the register, 2 page routes. The tree lists all 83
on every page (≈ 14 KB of HTML).

### Performance budget (constitution VI)

Enforced per HTML page in `dist/` by `npm run check:build` (CI fails when exceeded). Measurements
and basis: [research.md R11](research.md#r11-performance-budget-constitution-vi); exact rules:
[contracts/build-budget.md](contracts/build-budget.md).

| Budget | Phase 1 | Phase 2 limit |
|---|---|---|
| JavaScript, same-origin, gzip | 0 B | **≤ 12 KB** (router measured 5.7 KB) |
| CSS, inline + same-origin, gzip | ≤ 2 KB | **≤ 8 KB** (mockup measured 4.7 KB, incl. out-of-scope rules) |
| Fonts, woff2 | n/a | **≤ 110 KB** (measured 101.9 KB) |
| HTML, raw | ≤ 50 KB | **≤ 50 KB** |
| Whole page, as transferred | n/a | **≤ 150 KB** |
| Third-party origins | 0 | **0** |

These are re-measured at the end of implement and recorded in `tasks.md`; a wrong limit is fixed
here with a reason, not silently.

### Health gate: what changes

[contracts/build-budget.md § Health gate](contracts/build-budget.md#health-gate-extends-001--health-gate):
a fourth request per round for a font file, and an H1 assertion that tolerates the typed-title
`<span>`. Everything else in Phase 1's gate stands.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How this plan complies |
|---|---|---|
| I. Content integrity | ✅ | The nine-section template and its order are untouched; the volatility rule is untouched (vendor names only in In the wild and Go deeper). The Saga card keeps its prose. |
| II. Validation over convention | ✅ | Every new authoring rule (levels, reasons, kinds, pitfall and wild entry shape, use/avoid shape) is a machine check with a failing fixture (FR-022, SC-008). Structure and budgets are checked in `dist/`. |
| III. Static-first | ✅ reading ratified by the owner (2026-11-25) | Everything renders at build time and static content is HTML and CSS. Client JS is the router and one behaviour script (TOC highlight, scroll position, phone menu): interactive behaviour that needs script, budgeted, and absent-safe (FR-008). III literally says "interactive islands", and these are not islands. This plan reads III as covering such behaviour (decision 9); no amendment is needed. See Complexity Tracking. |
| IV. Sync-ready | ✅ | Card `id` stays the key. No progress is read or written; the progress surfaces take `(read, total)` so Phase 4 plugs in through its store without changes here. |
| V. Accessible and calm | ✅ | Native `<details>`, skip link, visible focus, `:focus-visible`, keyboard-only flows, one reduced-motion rule plus Astro's own, `[hidden]` rule, 4.5:1 contrast test, meters with text equivalents, no colour-only meaning. Checks in `check:build` and the quickstart. |
| VI. Performance budget | ✅ | Concrete measured budgets above, checked in CI; Phase 1's are restated, not dropped. |
| VII. Test-first | ✅ | Pure modules (`path`, `tree`, `meter`, `scroll`, `toc`, `menu`, `typed-title`, `contrast`, the card rules, `checkPage`, `checkResponse`) go red → green. Markup and DOM glue are presentational (exempt) and verified in the browser. |
| VIII. Simplicity | ✅ | No Tailwind, no React, no plugin, no Playwright, no `set:html`, no new framework; one client script; status line not persisted. |
| IX. Official guides | ✅ with 1 note | Fonts API and `<ClientRouter />` per docs.astro.build; `npm` font provider is documented but unspiked (R16: `fontsource()` fallback is verified). |
| X. Spec-driven workflow | ✅ | Branch `002-design-system-card-layout`; Conventional Commits; PR to `main`; each step reviewed. |
| Constraint: secrets | ✅ | None added. |
| Constraint: safe rendering | ✅ | No runtime HTML injection: the client script writes text and attributes only; build-time output is Astro's escaped templates; no `set:html`. |
| Quality gates | ✅ | CI keeps lint, tests, validate, build, plus the stricter `check:build`; the deploy gate gains the font request. |

**Post-design re-check (after Phase 1 artifacts)**: no new violations. Two items recorded under
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-design-system-card-layout/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16, verified vs not verified
├── data-model.md        # Phase 1: Card change, TemplateSection, PathEntry, Tree, StatusLine, Meter
├── quickstart.md        # Phase 1: runnable validation scenarios
├── contracts/
│   ├── card-format.md   # Card format v2 and the new rule codes
│   ├── ui-contract.md   # Page anatomy, keyboard, responsive, motion, tokens
│   └── build-budget.md  # Budgets, structure checks, nginx, health-gate additions
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root; ★ new, ✎ changed)

```text
astro.config.mjs                  ✎ fonts: [...] (Geist Mono, Inter)
package.json                      ✎ + @fontsource-variable/geist-mono, /inter (dev)
nginx/default.conf                ✎ gzip, /_astro/ caching + repeated X-Robots-Tag
scripts/
├── check-build.ts                ✎ budgets (gzip, fonts, JS), structure checks, --report
└── health-gate.ts                ✎ font request, tolerant H1 check

src/
├── content.config.ts             unchanged
├── content/cards/saga.mdx        ✎ card format v2
├── styles/                       ★
│   ├── tokens.css                  mockup :root tokens (+ --fg-faint #7d828c)
│   ├── global.css                  base, [hidden], skip link, focus, reduced-motion rule
│   └── card.css                    section-scoped rules (#tldr, #when, #wild, …)
├── layouts/
│   ├── Base.astro                ✎ head: <Font>, <ClientRouter />, global styles, noindex
│   └── Shell.astro               ★ top bar, skip link, tree, main slot, TOC, status line
├── components/
│   ├── RelatedCards.astro        ✎ shows `why`, badge and `cd` hint
│   ├── TopBar.astro  Tree.astro  Toc.astro  StatusLine.astro  Pager.astro   ★
│   ├── SectionHeading.astro  Subheading.astro  TableFrame.astro            ★ (tag mappings)
│   └── Meter.astro  Pitfall.astro  Source.astro                             ★ (authored)
├── lib/
│   ├── cards/
│   │   ├── template.ts           ★ TEMPLATE_SECTIONS + ids + TOC labels (rules.ts imports it)
│   │   ├── layout-rules.ts       ★ use/avoid, trade-offs, pitfall, wild, source checks
│   │   ├── schema.ts             ✎ related: { id, why }[]
│   │   ├── rules.ts              ✎ calls layout-rules, reads related[].id
│   │   ├── related.ts            ✎ carries `why`
│   │   └── parse-card.ts         unchanged
│   ├── check-failure.ts          ✎ 9 new rule codes
│   └── layout/                   ★ pure, tested
│       ├── path.ts  tree.ts  meter.ts  scroll.ts  toc.ts
│       ├── menu.ts  typed-title.ts  contrast.ts
├── scripts/shell.ts              ★ DOM glue only
└── pages/
    ├── index.astro               ✎ Base layout picks up theme only
    └── cards/[id].astro          ✎ Shell, breadcrumb, h1, meta, <Content components={…}/>, pager

tests/
├── unit/                         ★ path, tree, meter, scroll, toc, menu, typed-title,
│                                   contrast, layout-rules; ✎ check-build, health-gate,
│                                   rules, schema, related
├── integration/validate-cli.test.ts  ✎ new codes
└── fixtures/
    ├── valid/cards/alpha.mdx     ✎ format v2
    └── broken/cards/             ★ one file per new rule; ✎ existing files to format v2
```

**Structure Decision**: unchanged single project. Pure logic lives in `src/lib/` so pages, scripts
and tests import the same code; `src/scripts/shell.ts` is the only browser-side file and
contains no decisions. `layout-rules.ts` is separate from `rules.ts` so the Phase 1 file does not
grow past one concern.

## Implementation order (for /speckit-tasks)

1. **Setup:** install the two font packages; add `fonts` to `astro.config.mjs` (try `npm`
   provider, fall back to `fontsource()`); add `styles/tokens.css` and `global.css`; Base layout
   with `<Font>` and `<ClientRouter />`; confirm `build` and the fonts output.
2. **Foundational (TDD):** `template.ts` (extract from `rules.ts`, behaviour unchanged),
   `meter.ts`, `contrast.ts` + the tokens test, `path.ts`, `tree.ts`, `scroll.ts`, `toc.ts`,
   `menu.ts`, `typed-title.ts`.
3. **US5, card format v2 (TDD):** schema change for `related`, `layout-rules.ts` rule by rule
   with a failing fixture each, `related.ts`, update existing fixtures and the Saga card, update
   the Phase 1 contract with a pointer. Wire into `validate` (already in CI).
4. **US1, card sections:** `card.css`, `SectionHeading`, `Subheading`, `TableFrame`, `Meter`,
   `Pitfall`, `Source`, `RelatedCards`, breadcrumb/title/meta/TL;DR in `[id].astro`. Browser
   check against the mockup (quickstart §6).
5. **US2, shell:** `Shell.astro`, `TopBar`, `Tree`, `Toc`, `StatusLine`, `Pager`, `shell.ts`
   (scroll position, TOC highlight, `treeCurrent`, focus move); persistence check with a scratch
   second card (quickstart §7), contingency if the tree's scroll resets.
6. **US3, phone:** responsive CSS, menu button and overlay (`menu.ts` wired), 44 px targets,
   safe-area insets (quickstart §8).
7. **US4, keyboard and motion:** skip link, focus styles, the single reduced-motion rule,
   `[hidden]` rule; `check-build` structure checks; keyboard, reduced-motion and scripts-blocked
   runs (quickstart §9).
8. **Budgets and delivery:** `check-build` budgets and `--report` (TDD), nginx gzip/caching,
   health-gate font request (TDD), Docker run (quickstart §10), re-measure and record the real
   sizes, update docs (below). Deploy only when the owner asks.

Stories run in this order because the format (US5) is what lets the card render (US1), and the
shell (US2) wraps a card that already renders.

**Docs to update in implement:** `docs/DESIGN.md` §6 and §8 (Tailwind decided: plain CSS; fonts
self-hosted), `specs/001-walking-skeleton/contracts/card-format.md` (pointer to v2),
`docs/PHASES.md` and `docs/TOPICS.md` status at the end of the session.

## Risks

- **Tree scroll under `transition:persist`** is not verified (R5). The contingency is a ten-line
  save/restore, added only if quickstart §7 shows the reset.
- **Fallback glyph alignment** for `❯ ▰ ▱ ✓ ○` (R2) depends on the reader's monospace font.
  Mitigated by equal glyph counts per row; checked by eye in §6.
- **`fontProviders.npm()`** may not accept these packages (R16); `fontsource()` is the verified
  fallback and needs network at build.
- **Breaking `related` format** touches the schema, rule, page, fixtures and Saga at once. One
  task group, red → green, so nothing is half-migrated on the branch.
- **Budget numbers are estimates until measured** for our own script and the final CSS; the
  limits include margin and are re-measured at the end (R11).

## Complexity Tracking

| Addition | Why it is needed | Simpler alternative rejected |
|---|---|---|
| Client JavaScript (`<ClientRouter />` 5.7 KB + `shell.ts`) in a static-first site (constitution III) | FR-007 (shell stays put), FR-005/FR-006 (live TOC and scroll position), FR-029 (phone menu) all need script; each degrades gracefully without it (FR-008) | CSS-only could do none of persistence or live position; full page loads would reset the tree |
| Card format v2 breaking change (R4) | The layout needs data the text cannot carry; validated per constitution II | Deriving meters or reasons is impossible; leaving them optional would let a half-filled card publish |
