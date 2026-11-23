# Systems Field Guide: Design

> Status: **approved** (2026-11-23) · Working name, final name still open (see [Open questions](#open-questions))
> Companion docs: [PHASES.md](PHASES.md) (roadmap + spec-kit prompts) · [TOPICS.md](TOPICS.md) (card tracker) · [mockups/saga-card.html](mockups/saga-card.html) (approved visual reference)

## 1. Vision

A web guide to **software and system architecture as practised in industry today**. It covers architecture styles, distributed data, scale to millions of users, big data, reliability, security and AI systems.

It is **not interview prep**: no "how to answer the interviewer" content. Each topic answers *what a working architect needs to know to make a decision*. Content must reflect the state of the art as of the date it was last reviewed.

## 2. Audience & use

- **Now:** Carlos, as a personal study and reference tool.
- **Later:** public, so it is written at publishable quality from day one.
- **Two reading modes, both first-class:**
  1. **Learning path.** A suggested order through the domains for a first read.
  2. **Quick reference.** Every card is self-contained and can be found in seconds through search.

## 3. Non-goals (v1)

- No interview Q&A, no "how to answer" content.
- No frontend or mobile architecture, except server-facing edge topics (BFF, CDN, edge compute, real-time).
- No backend, accounts or cross-device sync in v1 (see the Sync item in [Backlog](PHASES.md#backlog)).
- No paid or managed services. Everything self-hosts on polaris2.
- No i18n. Content is English only.

## 4. Content model

### 4.1 Domains
There are 13 domains in learning-path order. The full card list lives in [TOPICS.md](TOPICS.md): 83 cards, 41 of them in the MVP.

1. Foundations
2. Architecture styles
3. Compute & runtime
4. Communication & APIs
5. Distributed data & workflows
6. Storage
7. Traffic
8. Data platforms
9. Reliability & operations
10. Security, privacy & compliance
11. AI systems
12. Architect's craft
13. Reference architectures

### 4.2 The decision card (fixed template)
Every card has the same sections in the same order. Validation enforces this.

| Section | Rule |
|---|---|
| **TL;DR** | 2–3 sentences: what it is and the core trade-off |
| **Problem it solves** | The situation that makes this pattern necessary |
| **How it works** | Mechanism, with a diagram (ASCII-first, see 4.5) |
| **Use it when / Avoid it when** | Rendered as a diff: `+` lines for use, `-` lines for avoid |
| **Trade-offs** | A table that **always includes a `cost` row** and compares against the main alternative |
| **In the wild** | Real tools, products and companies. The volatile part, dated |
| **Pitfalls** | The common failure modes, each with its mitigation |
| **Related** | Links to other cards by `id` |
| **Go deeper** | 2–3 curated sources (paper, pattern, guide) |

**Volatility rule:** tool, product and vendor names appear **only** in *In the wild* and *Go deeper*. Everything else describes durable concepts.

### 4.3 Card metadata
| Field | Purpose |
|---|---|
| `id` | Permanent slug. Never changes, even if the title does. Progress is keyed on it |
| `title` | Display name |
| `domain` | One of the 13 domains |
| `order` | Position inside the domain's learning path |
| `status` | Radar ring: `adopt` · `trial` · `assess` · `hold` |
| `reviewed` | Date of last review (YYYY-MM) |
| `tags` | Free topical tags |
| `aliases` | Alternative names used by search (e.g. "distributed transactions" → Saga) |
| `related` | List of card `id`s. Each must exist |

### 4.4 Freshness policy
- Every card shows its **radar status** and **last reviewed** date.
- A card not reviewed for **more than 12 months** is flagged *needs review*. This is a warning, not a build failure.
- Radar status changes are recorded so readers can see what moved.

### 4.5 Diagrams
- **ASCII-first.** Use box-drawing characters in monospace, and animate them where it teaches something (see the Saga simulator in the mockup).
- **SVG fallback** when ASCII stops being legible, such as large topologies or many nodes.
- Diagrams must make sense without animation, because `prefers-reduced-motion` turns it off.

## 5. Experience & visual design

**Direction:** "Linear × terminal". The site has the editorial polish of a product blog (reference: linear.app/now) and the vocabulary of a terminal. Approved reference: [mockups/saga-card.html](mockups/saga-card.html).

- **Theme:** a single deliberate dark theme. Near-black background, cool greys and hairline borders.
- **Color:** the accent is green `#4ade80`, which also means success and *Adopt*. Cyan `#5ee7ff` means in-flight or running. Amber means warning or compensation. Red means failure or *Hold*. Blue means info or *Trial*.
- **Type:** mono (Geist Mono) for structure, chrome and labels. Inter for long-form reading.
- **Terminal vocabulary:**
  - prompt breadcrumb: `~/catalog/04-distributed-data ❯ cat saga.md`
  - typed title with blinking caret
  - tree index: `├──`
  - `git diff` use/avoid block
  - ASCII meters in the trade-offs table
  - `ls` block for *In the wild*
  - `WARN` lines for pitfalls
  - `cd ../outbox` hints on related cards
  - tmux-style status line
- **Interactions:**
  - command palette (`⌘K` or `/`) with fuzzy search over titles, aliases and tags
  - `j`/`k` keys for section navigation
  - `r` key to run a card's simulation
  - TOC that highlights the current section
  - spotlight hover on related cards
  - staggered load animation
  - persistent shell across page navigations
- **Progress:** per-card state `not yet` / `read` / `mastered`, a meter per domain, and a progress page.
- **Accessibility:**
  - respect `prefers-reduced-motion`
  - visible focus states
  - keyboard reachable everything
  - `[hidden] { display: none !important }` in the base CSS (a bug found in the mockup)

## 6. Architecture & stack

| Concern | Choice |
|---|---|
| Framework | **Astro**, latest stable at the time of scaffolding, set up via the official install guide |
| Content | **MDX** in Astro content collections with **Zod** schemas |
| Interactivity | **React islands** only where needed: simulator (`client:visible`), palette (`client:idle`), progress. Everything else is static HTML |
| Navigation | Astro View Transitions with `transition:persist` for the shell (tree, status line, palette) |
| Search | **Pagefind**, indexed at build time, so there is no search service |
| Styling | CSS custom-property tokens from the mockup. Whether to add Tailwind v4 is decided in Phase 2 `/speckit-plan` |
| Progress storage | `ProgressStore` interface → `LocalProgressStore` (localStorage) in v1 |
| Validation | Schema plus custom validators in CI: required sections, `related` ids exist, staleness report |
| Hosting | **polaris2**: Docker image (static build served by `nginx:alpine`) behind Traefik with Let's Encrypt. No paid services |
| CI/CD | GitHub Actions → Docker Hub → SSH deploy to polaris2 with `docker compose pull && up -d`, then a health gate. This reuses the wizdaa-takehome pattern: `space-server_web` network, `letsencryptresolver`, `security-headers@file` |

### 6.1 Future-proofing for Sync (decided now, cheap)
1. Stable `id` per card, independent of its slug or title.
2. All progress reads and writes go through the `ProgressStore` interface.
3. Each progress entry is stored as `{ state, updatedAt }`, so a future merge is "last write wins".

The future Sync phase switches to Astro's Node adapter (static pages stay prerendered) and adds `/api/progress` and `/api/auth/*` backed by **SQLite on a Docker volume** and **better-auth with GitHub OAuth**, all on polaris2.

## 7. Decision log

| # | Decision | Why | Rejected |
|---|---|---|---|
| D1 | Support both reading modes (path + reference) | Carlos wants to study in order once and look things up afterwards | Reference only; course only |
| D2 | Fixed decision-card template | It teaches when to use something, not just what it is, and validation keeps 80+ cards consistent | Minimal cheatsheet (doesn't teach decisions); long articles (break quick reference) |
| D3 | English content | Consistent with Carlos's public repos; larger audience | Spanish; bilingual (doubles maintenance) |
| D4 | Radar status plus review date | "Info de hoy" needs a visible freshness signal, not silent decay | Date only; no mechanism |
| D5 | Static site from MDX in git | Templates can be validated, staleness is checked in CI, history comes for free, and it doubles as a portfolio piece | Notion or Obsidian Publish (no validation, lock-in); custom app with backend (YAGNI) |
| D6 | Astro + React islands | The page is about 90% static content and 10% widgets, which is exactly the islands model. React is used only where it adds value | Starlight (too docs-shaped); Fumadocs + Next (more JS and complexity, only wins if a backend is needed soon); Docusaurus (custom design is painful) |
| D7 | "Linear × terminal" visual style | Chosen by Carlos from references, with the mockup iterated to approval | Plain editorial; illustrated catalog |
| D8 | Green `#4ade80` accent | A friendlier version of Matrix green. Cyan is reserved for "running" so it doesn't clash with green "done" | Lavender; `#00ff41` (too harsh) |
| D9 | ASCII-first diagrams | Matches the terminal identity, versions as text, and can be animated cheaply | SVG-first |
| D10 | Self-host on polaris2, no paid services | Carlos's rule for personal projects | Vercel, Cloudflare, Turso, Supabase |
| D11 | No backend in v1, but sync-ready | YAGNI now, while the three cheap rules in 6.1 avoid a rewrite later | Building sync now |
| D12 | spec-kit SDD for code, multi-agent Workflow for content | Code is sequential and shares files. Cards are independent and benefit from parallel draft → verify → review | One approach for everything |
| D13 | Host `architecture.cativo.dev`, no alias redirect yet | Names the subject, not the working title, so it survives a rename; unambiguous on a `.dev` domain (picked with a naming review on 2026-11-23) | `systems.` (reads as ops), `system-design.` (interview-prep connotation), `arch.` (Arch Linux), `catalog.` (vague); alias redirect deferred (YAGNI) |

## 8. Open questions
- **Name** of the site. The domain is decided: `architecture.cativo.dev` (D13).
- **Tailwind v4 or plain CSS tokens**: decide in the Phase 2 plan.
- **License** for the content and code before going public.
- **Analytics:** none, or something self-hosted later.

## 9. Research notes
On 2026-11-23 a research agent critiqued the taxonomy against the Thoughtworks Tech Radar Vol. 35, InfoQ trend reports from 2025–2026, the CNCF survey and engineering blogs. Its main findings are already folded into the domains, [TOPICS.md](TOPICS.md) and the MVP cut:
- added durable execution, authorization models, DR, safe config rollout, data contracts, real-time and FinOps
- reframed Lambda/Kappa, CAP and 2PC
- rebuilt the AI domain

Some of its claims were sourced from press coverage rather than primary sources. **Re-verify them when writing each card.**
