# Systems Field Guide Constitution

Systems Field Guide is a static web guide to software and system architecture as practised in
industry, built from "decision cards". The approved design lives in `docs/DESIGN.md`; this
constitution states the rules every feature, plan and card MUST obey.

## Core Principles

### I. Content Integrity

- Every card MUST follow the fixed decision-card template, with sections in this order:
  TL;DR · Problem it solves · How it works · Use it when / Avoid it when · Trade-offs ·
  In the wild · Pitfalls · Related · Go deeper.
- The Trade-offs table MUST include a `cost` row and compare against the main alternative.
- Tool, product and vendor names MUST appear only in *In the wild* and *Go deeper*; all other
  sections describe durable concepts.
- Every card MUST carry a radar status (`adopt` · `trial` · `assess` · `hold`) and a
  last-reviewed date (`YYYY-MM`).
- Factual claims MUST be verifiable and cite sources; primary sources are preferred.
- Content MUST NOT include interview-prep material ("how to answer the interviewer", Q&A drills).

**Rationale:** the template teaches *when* to use something, not just what it is, and the
volatility rule keeps the durable parts of a card from rotting when the tool landscape moves.

### II. Validation over Convention

- Every rule the template or metadata requires (required metadata, required sections, the cost
  row, related ids that exist) MUST be enforced automatically at build/CI time.
- A rule that cannot be checked automatically MUST appear on the card review checklist; no rule
  relies on the author's memory.
- Cards past their review window (more than 12 months) produce a warning report, not a failure.

**Rationale:** 80+ cards written over time stay consistent only if the machine says no.

### III. Static-First, No Backend in v1

- Every page MUST be rendered at build time. There is no server runtime, database or API in v1.
- Client JavaScript MUST be limited to interactive islands that need it; static content ships as
  HTML and CSS.
- Search, progress and simulations MUST work from the static build without a server.
- No paid or managed services. Production self-hosts on the owner's server.

**Rationale:** the site is ~90% static content; a backend now is cost and risk with no reader value.

### IV. Sync-Ready by Design

- Every card MUST have a permanent `id` that never changes, independent of its title or slug.
- All reading and writing of reader progress MUST go through a single storage interface; no other
  code touches the underlying storage directly.
- Every progress entry MUST record its state and an `updatedAt` timestamp.

**Rationale:** these three cheap rules let a future cross-device sync merge with
"last write wins" instead of forcing a rewrite.

### V. Accessible and Calm

- Every interactive element MUST be reachable and operable by keyboard alone, with a visible
  focus state.
- `prefers-reduced-motion` MUST disable all non-essential animation.
- Diagrams and simulations MUST be fully readable and understandable without animation.
- Elements hidden with the `hidden` attribute MUST stay hidden regardless of component styles.

**Rationale:** a reference tool is read for long sessions and by keyboard-first readers; motion
is a teaching aid, never a requirement.

### VI. Performance Budget

- Content pages MUST stay light. Each plan that adds or changes pages MUST state concrete,
  measurable budgets (e.g. transferred JS/CSS per page) and how they are checked.
- A change that exceeds an agreed budget MUST be justified in its plan or reverted.

**Rationale:** budgets defined per plan are measurable; "keep it fast" is not.

### VII. Test-First (NON-NEGOTIABLE)

- All logic MUST be built red → green → refactor: a failing test that describes the behaviour is
  written and seen to fail before the implementation.
- This covers validators, the progress store, the simulator engine and every component with
  behaviour. Pure presentational markup is exempt.
- Bug fixes start with a test that reproduces the bug.

**Rationale:** validators and the store are the safety net for everything else; they must be
trustworthy themselves.

### VIII. Simplicity

- Build the smallest viable solution for the current spec. YAGNI applies.
- No speculative abstractions, configuration, feature flags or plugin points.
- Added complexity MUST be justified in the plan's complexity tracking.

**Rationale:** a one-owner project stays maintainable only if it carries no unused machinery.

### IX. Official Guides

- Every technology MUST be installed, scaffolded and configured following its official
  documentation (official CLIs and integration commands).
- Third-party starters and templates MUST NOT be used.
- Where a plan deviates from an official guide, it MUST say why.

**Rationale:** official paths are documented, upgradable and debuggable; templates hide decisions.

### X. Spec-Driven Workflow

- Every feature MUST go through spec-kit in order: specify → clarify → (checklist) → plan →
  tasks → analyze → implement → converge, repeating implement/converge until Converged.
- Specs describe *what* and *why* only; technology choices belong in the plan.
- Each artifact is reviewed by the owner before the next step. Steps are not skipped.
- Each feature lives on its own branch; commits follow Conventional Commits; work merges to `main`
  through a pull request.

**Rationale:** reviewed specs and plans keep scope explicit and decisions traceable.

## Content & Platform Constraints

- **Language:** all content is English. No i18n in v1.
- **Scope:** software and system architecture. Frontend and mobile architecture are out of scope,
  except server-facing edge topics (BFF, CDN, edge compute, real-time).
- **Freshness:** a card's radar status and last-reviewed date are always visible; radar status
  changes are recorded.
- **Diagrams:** ASCII-first; SVG only when ASCII stops being legible.
- **Content production:** cards are produced through the documented multi-agent content process,
  launched only on the owner's explicit request.
- **Secrets:** no secrets, tokens or credentials in the repository; deploy credentials live only
  in the CI secret store.
- **Safe rendering:** runtime code inserts text into the page with text APIs, never by injecting
  HTML strings.

## Quality Gates

- Every merge to `main` MUST pass: lint, tests, content validation and a production build.
- A card is marked published only after it passes automated validation and the review checklist.
- A deploy MUST verify that the production site responds before it is considered done.
- `/speckit-analyze` MUST report no unresolved CRITICAL issues before `/speckit-implement` starts.

## Governance

- This constitution supersedes other practices. `docs/DESIGN.md` holds design decisions and
  `docs/PHASES.md` the roadmap; where they conflict with this document, this document wins until
  amended.
- Amendments are deliberate: proposed with a rationale, approved by the owner, and committed on
  their own with a version bump.
- Versioning follows semantic versioning: MAJOR for removing or redefining a principle, MINOR for
  a new principle or materially expanded guidance, PATCH for clarifications and wording.
- Every plan MUST include a Constitution Check against these principles; every review checks
  compliance, and any justified exception is recorded in the plan's complexity tracking.

**Version**: 1.0.0 | **Ratified**: 2026-11-23 | **Last Amended**: 2026-11-23
