# Feature Specification: Walking Skeleton

**Feature Branch**: `001-walking-skeleton`

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "Walking skeleton for Systems Field Guide. A reader can open a published card page (the "Saga" card, unstyled) at the production URL. Cards are authored as content files with structured metadata: permanent id, title, domain (one of 13), order within the domain, radar status (adopt/trial/assess/hold), last reviewed (YYYY-MM), tags, aliases, related card ids. Publishing must FAIL when a card: is missing required metadata; lacks any required template section (TL;DR, Problem it solves, How it works, Use it when / Avoid it when, Trade-offs including a cost row, In the wild, Pitfalls, Related, Go deeper); or references a related id that does not exist. Cards not reviewed in more than 12 months produce a warning report, not a failure. Every merge to main runs the checks; a manual deploy action publishes to production and verifies the site responds. Out of scope: visual design, search, progress, diagrams."

## Clarifications

### Session 2026-11-23

- Q: Which ids count as existing for a card's related list? → A: Written cards plus cards
  planned in the master topic list; unwritten ones render as "not yet available" (from
  `/speckit-specify`).
- Q: Which host name should the production site be published at? → A: `architecture.cativo.dev`
  (no redirect from other names in this feature).
- Q: Before public launch, who should be able to see the production site? → A: Anyone with the
  address, but search engines are asked not to index it until launch.
- Q: What should the root address show while Saga is the only card? → A: A minimal, unstyled
  index of published cards (title, domain, radar status), each linked; Phase 3 replaces it with
  the styled home page.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the Saga card at the production address (Priority: P1)

A reader opens the guide's production address and reads the Saga card: its title, its metadata
(domain, radar status, last-reviewed date, tags) and all nine template sections in order. The page
is plain and unstyled; the point is that a real card travels the whole path from an authored
content file to a public page. The owner publishes by triggering a manual deploy action, which
reports success only after confirming the live site responds.

**Why this priority**: it proves the end-to-end path (author → checks → build → deploy → live)
that every later phase builds on. Without it nothing else can be shown to a reader.

**Independent Test**: trigger the deploy action, then open the Saga card's address in a browser
and confirm the title, metadata and all nine sections are present in template order.

**Acceptance Scenarios**:

1. **Given** the Saga card passes all checks, **When** the owner triggers the deploy action,
   **Then** the action publishes the site and finishes successfully only after confirming the
   production site responds.
2. **Given** the site is deployed, **When** a reader opens the root address, **Then** they see
   an index listing the Saga card with its title, domain and radar status, linked to the card.
3. **Given** the site is deployed, **When** a reader opens the Saga card's address, **Then** they
   see its title, domain, radar status, last-reviewed date and tags, followed by the nine template
   sections in template order.
4. **Given** the site is deployed, **When** the production site does not respond after
   publishing, **Then** the deploy action finishes as failed and says the site did not respond.
5. **Given** the latest version on the main line fails its checks, **When** the owner triggers
   the deploy action, **Then** nothing is published and the action reports why.

---

### User Story 2 - A broken card cannot be published (Priority: P2)

The owner (as author) adds or edits a card. If the card is missing required metadata, lacks a
required template section, has no cost row in its trade-offs, or points to a related card that
does not exist, the checks fail and tell the author exactly which card and which rule broke. A
change with a broken card cannot reach production.

**Why this priority**: the guide's core promise (constitution principles I and II) is that the
template is enforced by the machine, not by memory. This is the first place it is enforced.

**Independent Test**: introduce each kind of defect into a copy of a valid card and run the
checks; each one fails with a message naming the card and the broken rule, and the valid card
passes.

**Acceptance Scenarios**:

1. **Given** a card missing any required metadata field, **When** the checks run, **Then** they
   fail and name the card and the missing field.
2. **Given** a card whose metadata value is invalid (domain not one of the 13, radar status not
   one of the four, last-reviewed date not a valid `YYYY-MM` month), **When** the checks run,
   **Then** they fail and name the card, the field and the allowed values or format.
3. **Given** a card missing any of the nine required sections, or with a required section that
   has no content, **When** the checks run, **Then** they fail and name the card and the section.
4. **Given** a card whose trade-offs have no cost row, **When** the checks run, **Then** they
   fail and say the cost row is missing.
5. **Given** a card whose related list contains an id that matches neither a written card nor a
   card planned in the master topic list, **When** the checks run, **Then** they fail and name
   the card and the unknown id.
   A related id that matches a planned but unwritten card passes.
6. **Given** two cards share the same id, **When** the checks run, **Then** they fail and name
   both cards.
7. **Given** several cards with several defects, **When** the checks run, **Then** every defect
   is reported in the same run, not just the first one.
8. **Given** a change to the main line, **When** it is proposed or merged, **Then** the checks
   run automatically and their result is visible on the change.

---

### User Story 3 - Stale cards are reported without blocking (Priority: P3)

When the checks run, the owner receives a report listing every card whose last review is more
than 12 months old, so they know what to re-verify. Stale cards never stop publishing.

**Why this priority**: freshness is part of the guide's promise, but with one card it has little
immediate value; it matters as the catalogue grows.

**Independent Test**: set a card's last-reviewed month to more than 12 months ago, run the
checks, and confirm they pass and the report lists that card with its age.

**Acceptance Scenarios**:

1. **Given** a card last reviewed more than 12 months before the day the checks run, **When**
   the checks run, **Then** the report lists the card, its last-reviewed month and how many
   months old it is, and the checks still pass.
2. **Given** no card is older than 12 months, **When** the checks run, **Then** the report says
   no cards need review.

---

### Edge Cases

- A card last reviewed exactly 12 months ago is **not** stale; 13 months or more is stale.
- A last-reviewed month in the future fails the checks as an invalid date.
- A card that lists itself as related fails the checks.
- A required section present only as a heading with no content counts as missing.
- Sections present but in the wrong order fail the checks, since the template fixes the order.
- Optional metadata lists (tags, aliases, related) may be empty; when present, entries must not
  be blank or duplicated.
- If there are no cards at all, the checks fail: an empty guide is never published.
- If the deploy action is triggered twice in a row, the second run publishes the same version
  again without error.

## Requirements *(mandatory)*

### Functional Requirements

**Card content and metadata**

- **FR-001**: Each card MUST be authored as one content file holding its metadata and its body.
- **FR-002**: Each card MUST declare: a permanent `id`, `title`, `domain`, `order` within the
  domain, radar `status`, `reviewed` month, `tags`, `aliases` and `related` card ids.
- **FR-003**: `id` MUST be a lowercase slug, unique across all cards, and independent of title.
- **FR-004**: `domain` MUST be one of the 13 domains: Foundations; Architecture styles; Compute
  & runtime; Communication & APIs; Distributed data & workflows; Storage; Traffic; Data
  platforms; Reliability & operations; Security, privacy & compliance; AI systems; Architect's
  craft; Reference architectures.
- **FR-005**: `status` MUST be one of `adopt`, `trial`, `assess`, `hold`.
- **FR-006**: `reviewed` MUST be a valid calendar month written `YYYY-MM`, not in the future.
- **FR-007**: `order` MUST be a positive whole number.

**Template enforcement**

- **FR-008**: The checks MUST fail when a card is missing any required metadata field or has an
  invalid value for it.
- **FR-009**: The checks MUST fail when a card lacks any of the nine required sections — TL;DR,
  Problem it solves, How it works, Use it when / Avoid it when, Trade-offs, In the wild, Pitfalls,
  Related, Go deeper — when one of them is empty, or when they are out of template order.
- **FR-010**: The checks MUST fail when a card's Trade-offs section has no cost row.
- **FR-011**: The checks MUST fail when a card's `related` list contains an id that matches
  neither a written card nor a card planned in the master topic list, or contains the card's own
  id.
- **FR-011a**: Every written card's id MUST appear in the master topic list; the checks MUST fail
  otherwise, so the topic list stays the single register of card ids.
- **FR-011b**: On the card page, a related entry pointing to a written card MUST link to it; one
  pointing to a planned but unwritten card MUST be shown by title as not yet available, without
  a link.
- **FR-012**: The checks MUST fail when two cards share an id.
- **FR-013**: Every failure MUST name the card (its file and id), the rule broken and, where
  relevant, the field, section or id involved. All failures MUST be reported in a single run.

**Freshness report**

- **FR-014**: Each run of the checks MUST produce a staleness report listing every card whose
  `reviewed` month is more than 12 months before the run date, with its month and age in months.
- **FR-015**: Stale cards MUST NOT cause the checks to fail.

**Publishing**

- **FR-016**: The checks MUST run automatically on every proposed change to the main line and on
  every merge to it, and their pass/fail result MUST be visible on the change.
- **FR-017**: The site MUST be published to production only by a deploy action the owner
  triggers manually.
- **FR-018**: The deploy action MUST refuse to publish a version that fails the checks.
- **FR-019**: After publishing, the deploy action MUST verify that the production site at
  `architecture.cativo.dev` responds and report failure if it does not.
- **FR-020**: The published site MUST serve the Saga card at a stable address derived from its
  permanent id, showing its title, metadata and all nine sections in template order.

- **FR-020a**: The site's root address MUST show an unstyled index of all published cards, each
  with its title, domain and radar status and a link to the card. With no other page in this
  feature, it is also the natural target for the post-deploy verification.

**Pre-launch visibility**

- **FR-021**: Until the public launch, every published page MUST be reachable without login and
  MUST ask search engines not to index it; the post-deploy verification MUST confirm this signal
  is in place.

**Out of scope**

- **FR-022**: This feature MUST NOT include visual design, search, reading progress, diagrams or
  simulations; the card page is unstyled.

### Key Entities

- **Card**: one decision card. Has metadata (id, title, domain, order, status, reviewed, tags,
  aliases, related) and a body with the nine template sections. Identified by its permanent id.
- **Master topic list**: the register of every planned card (id, title, domain, MVP flag,
  status). The source of truth for which ids exist, written or not.
- **Domain**: one of the 13 fixed subject areas, in learning-path order. A card belongs to one.
- **Radar status**: the card's recommendation ring — adopt, trial, assess or hold.
- **Check report**: the outcome of a run of the checks — a list of failures (card, rule, detail)
  that blocks publishing when non-empty.
- **Staleness report**: the list of cards past their review window, with month and age; never
  blocks publishing.
- **Deployment**: one manually triggered publication of a checked version, ending in a verified
  success or a reported failure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader on a typical broadband connection can open the Saga card at the production
  address and see all nine sections, with the page fully loaded in under 2 seconds.
- **SC-002**: 100% of the defect types in User Story 2 (each missing metadata field, each invalid
  value, each missing or empty section, wrong section order, missing cost row, unknown related
  id, self-reference, duplicate id, card id missing from the topic list) are blocked, and each
  one is demonstrated by an automated example that fails.
- **SC-003**: For every failure, the author can identify the card and the rule to fix from the
  report alone, without reading the checking code.
- **SC-004**: From triggering the deploy action to a verified live site takes under 10 minutes.
- **SC-005**: A stale card appears in the staleness report in 100% of runs and never causes a
  run to fail.

## Assumptions

- The owner (Carlos) is the only author and the only person who triggers deploys in this phase.
- The Saga card's content comes from the approved draft in `docs/mockups/saga-card.html`, placed
  under domain 5 (Distributed data & workflows) as listed in `docs/TOPICS.md`. The mockup's
  breadcrumb `04-distributed-data` predates the final domain numbering and is not authoritative.
- Saga's related cards are `outbox-cdc`, `idempotency` and `durable-execution`, using the ids
  in `docs/TOPICS.md` (the mockup's `outbox` is the older, non-authoritative spelling).
- The production address is `https://architecture.cativo.dev`. It names the subject rather than
  the site, so it survives a later rename; the final site name is still open in the design.
- The volatility rule (vendor names only in *In the wild* and *Go deeper*) and source quality
  are judged on the review checklist (Phase 6), not by these automated checks.
- The styled home page (hero, learning-path and search entry points, domain grid, freshness
  strip) belongs to Phase 3 and replaces the minimal index.
- Automatic rollback is out of scope; a failed deploy is fixed by deploying again.
- "Months old" is counted in whole calendar months between `reviewed` and the run date.
