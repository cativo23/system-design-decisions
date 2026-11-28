# Feature Specification: Discovery (search, catalog, learning path, radar, home)

**Feature Branch**: `003-discovery-search-paths`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Readers can find any card in seconds and follow a learning path. Command palette (⌘K/Ctrl+K or "/"), catalog and per-domain pages, learning path page, radar page, j/k section keys on a card, and a home page that replaces the Phase 1 minimal index (hero, two entry points, grid of the 13 domains with card counts and progress meters, freshness strip). Works offline from the static build."

## Clarifications

### Session 2026-11-26

- Q: What should the home freshness strip show about radar changes, given cards keep no status history? → A: Only recently reviewed cards (by review date), each with its current radar status. No history and no placeholder; recording radar changes is deferred to the content pipeline phase (FR-015).
- Q: What should each domain meter measure on the home and catalog? → A: Published cards out of the domain's total cards (e.g. "1 / 4"), with no reader state; the reader-progress reading is added by Phase 4 (FR-014).
- Q: Should navigation to and between the new pages and from the palette keep the shell in place like card-to-card moves today? → A: Yes. All new navigation (palette, catalog, domains, learning path, radar, home) keeps the shell as in Phase 2; the palette and shortcuts MUST keep working after every such move (FR-017, FR-022).
- Q: With one published card, how should domain, learning path and radar pages present mostly-empty content? → A: Show everything: all planned entries, with unwritten ones dimmed as "not yet available", and empty radar groups with an empty-state text; no toggle and no MVP/later label (FR-009, FR-010, FR-011); the radar lists published cards only, since unwritten ones have no status.
- Q: Do "j"/"k" jump from the section currently visible or from the last section reached by keys? → A: From the section currently visible (the one highlighted in the on-page table of contents), including after manual scrolling (FR-012).
- Q: How many recently reviewed cards does the home freshness strip show, and how are cards with the same review month ordered (last-reviewed is month-only)? → A: Up to 5 cards, most recently reviewed first; within the same month, alphabetical by title. With fewer than 5 published cards, it shows all of them (FR-015).
- Q: What should the status line show on pages that are not a card (home, catalog, domain, learning path, radar), which have no file or radar status? → A: The status line stays and shows only the fields that apply: a mode label for the page (e.g. `home`, `catalog`, `path`, `radar`), the domain only on domain pages, and scroll %. File and radar status are omitted (FR-017).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find any card in seconds (Priority: P1)

A reader on any page presses ⌘K (Ctrl+K) or "/", or activates the search button in the top bar. A palette opens with the text field focused. As they type, cards are matched loosely against their titles, alternative names and tags, so a partial or slightly misspelled query ("distributed transactions", "sga") still finds the right card. Each result shows its title, its domain and its radar status. Arrow keys move through the results, Enter opens the highlighted card, and Esc closes the palette and returns focus to where the reader was.

**Why this priority**: it is the headline promise of the phase ("find any card in seconds") and activates the search trigger Phase 2 left disabled.

**Independent Test**: from any page, open the palette with each shortcut, type an alias, a tag and a misspelled title, and open a result using only the keyboard.

**Acceptance Scenarios**:

1. **Given** any page, **When** the reader presses ⌘K/Ctrl+K or "/", **Then** the palette opens with the text field focused.
2. **Given** focus is in a text field elsewhere, **When** the reader types "/", **Then** the palette does not open and the character is typed normally.
3. **Given** the palette is open, **When** the reader types an alias of a card (e.g. "distributed transactions"), **Then** that card is listed, showing its domain and radar status.
4. **Given** results are listed, **When** the reader uses the arrow keys and Enter, **Then** the highlighted card opens.
5. **Given** the palette is open, **When** the reader presses Esc, **Then** it closes and focus returns to the previously focused element.
6. **Given** a query that matches nothing, **When** results update, **Then** the palette says so instead of staying blank.
7. **Given** the site is loaded and the network is then lost, **When** the reader searches, **Then** results still appear.

---

### User Story 2 - Start at the home page and choose a way in (Priority: P1)

A new reader lands on the root. They see in one screen what the guide is and who it is for, two clear entry points (start the learning path; search), a grid of the 13 domains each with a card count and a progress meter, and a freshness strip with recently reviewed cards and their radar status. The home keeps the approved "Linear × terminal" style.

**Why this priority**: it is the front door and replaces the placeholder index; without it the new pages have no entry.

**Independent Test**: open the root at desktop and phone width; confirm hero, both entry points, 13 domain tiles and the freshness strip are present and each link leads to the right place.

**Acceptance Scenarios**:

1. **Given** the root URL, **When** it loads, **Then** the reader sees the hero, two entry points, 13 domain tiles in learning-path order, and the freshness strip.
2. **Given** the home, **When** the reader activates "start the learning path", **Then** the learning path page opens; **When** they activate "search", **Then** the palette opens.
3. **Given** a domain tile, **When** the reader activates it, **Then** that domain's page opens.
4. **Given** a domain with no published card yet, **When** its tile is shown, **Then** it reads as zero of N available and is still reachable.

---

### User Story 3 - Browse by domain (Priority: P2)

A reader opens the catalog, which lists all 13 domains with their card counts, and then a domain page listing that domain's cards in learning-path order. Published cards link to the card; cards not yet written appear as "not yet available" with no link.

**Why this priority**: it is the browse alternative to search and the basis for the home grid.

**Independent Test**: open the catalog, open each domain, and verify the order and the state of every card against the master topic list.

**Acceptance Scenarios**:

1. **Given** the catalog, **When** it loads, **Then** all 13 domains appear in order with published and total card counts.
2. **Given** a domain page, **When** it loads, **Then** every card of the domain appears in path order, published ones as links with their radar status, others as "not yet available".

---

### User Story 4 - Follow the recommended reading order (Priority: P2)

A reader opens the learning path page and sees the recommended order across all domains: domain by domain, card by card. Published cards are links; unwritten ones are marked as not yet available. The first published card is easy to start from.

**Why this priority**: it delivers the "follow a learning path" half of the promise.

**Independent Test**: compare the page to the domain order and per-domain card order; follow it from the first available card.

**Acceptance Scenarios**:

1. **Given** the learning path page, **When** it loads, **Then** domains appear in the guide's fixed order and cards in each domain's path order.
2. **Given** the path, **When** the reader activates the start point, **Then** the first published card opens.

---

### User Story 5 - See what to adopt and what to avoid (Priority: P3)

A reader opens the radar page and sees published cards grouped under adopt, trial, assess and hold, each with its domain and last-reviewed date.

**Why this priority**: it is a different lens on the same content, valuable but not needed to find or read cards.

**Independent Test**: for each published card, check it appears in exactly the group matching its radar status.

**Acceptance Scenarios**:

1. **Given** the radar page, **When** it loads, **Then** four groups appear in the fixed order adopt, trial, assess, hold, and each published card is in exactly one.
2. **Given** a group with no cards, **When** the page loads, **Then** the group still appears and says it is empty.

---

### User Story 6 - Move between sections of a card with the keyboard (Priority: P3)

On a card page, pressing "j" moves to the next section and "k" to the previous one; the current section is scrolled into view and its position is reflected in the on-page table of contents.

**Why this priority**: a keyboard-first convenience on top of the existing layout.

**Independent Test**: on the Saga card, press j and k through all sections, including at the first and last section and while the palette is open or a text field has focus.

**Acceptance Scenarios**:

1. **Given** a card page, **When** the reader presses "j", **Then** the next section is brought into view; "k" goes to the previous.
2. **Given** the first or last section, **When** the reader presses "k" or "j" respectively, **Then** nothing breaks and the position stays.
3. **Given** the palette is open or a text field is focused, **When** the reader presses j or k, **Then** the keys are typed normally and the page does not move.

---

### Edge Cases

- A query containing regex or markup characters is treated as plain text.
- Very fast typing and repeated open/close never leave the palette in a broken or half-open state.
- The palette opened while scripts are still loading shows a visible loading state rather than doing nothing.
- With scripts blocked, the catalog, domain, learning path, radar and home pages remain readable and every link works; only the palette is unavailable.
- Domains with zero published cards, and a radar group with zero cards, render correctly.
- The reader has the reduced-motion preference on: no new animation runs.
- A shortcut pressed with a modifier combination the browser reserves does not interfere with it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The top bar search trigger MUST become active and open the palette; its "unavailable" label from Phase 2 is removed and the shortcut hints are shown.
- **FR-002**: The palette MUST open with ⌘K or Ctrl+K from any page, and with "/" when focus is not in an editable field.
- **FR-003**: The palette MUST match the query against each published card's title, aliases and tags, tolerating partial words and small typos, and rank closer matches first.
- **FR-004**: Each result MUST show the card's title, its domain and its radar status.
- **FR-005**: The palette MUST be fully operable by keyboard (type, arrows, Enter, Esc), trap focus while open, and restore focus to the prior element on close; it MUST be announced to assistive technology as a dialog with a labelled field and results.
- **FR-006**: The palette MUST show an explicit empty state and a loading state.
- **FR-007**: Search MUST work from the static build alone: no search server, and it MUST keep working after the network is lost once the page has loaded.
- **FR-008**: A catalog page MUST list all 13 domains in order, each with its published and total card counts.
- **FR-009**: Domain and learning path pages MUST show every planned card with no toggle to hide the unwritten ones and no MVP/later label. Each domain MUST have its own page listing all its cards in path order; unwritten cards appear as "not yet available", with no link and no radar badge.
- **FR-010**: A learning path page MUST list all domains and their cards in recommended reading order and offer a start point at the first published card.
- **FR-011**: A radar page MUST group published cards by adopt, trial, assess, hold in that order, always showing all four groups, with each card's domain and last-reviewed date.
- **FR-012**: On a card page, "j" and "k" MUST move to the next and previous section relative to the section currently visible (the one highlighted in the on-page table of contents), including after manual scrolling (above the first section, "j" goes to the first section and "k" does nothing), MUST be inert while the palette is open or a text field is focused, and MUST be listed in a shortcut hint. On pages that are not a card, "j" and "k" do nothing.
- **FR-013**: The root page MUST replace the Phase 1 minimal index with: a short hero (what the guide is, who it is for), two entry points (start the learning path; search), a grid of the 13 domains with card count and progress meter, and a freshness strip.
- **FR-014**: The domain meters on the home and the catalog MUST show published cards out of total cards in the domain (e.g. "1 / 4"), as a bar and as text, with no reader-specific state.
- **FR-015**: The freshness strip MUST list up to 5 of the most recently reviewed cards (by last-reviewed month, most recent first; cards in the same month ordered alphabetically by title; all of them when fewer than 5 are published), each with its current radar status. It MUST NOT show radar-change history or a placeholder for it.
- **FR-016**: All new pages MUST be generated from the same source of truth as the cards and the master topic list, so a new card appears in search, its domain page, the learning path, the radar and the home without editing those pages.
- **FR-017**: The new pages MUST keep the existing shell (top bar, tree index, status line) and the approved visual style, and work at phone width (320 px) with no horizontal page scroll. On pages that are not a card, the status line MUST stay and show only the fields that apply: a mode label for the page (e.g. `home`, `catalog`, `path`, `radar`), the domain only on domain pages, and scroll %; file and radar status are omitted.
- **FR-018**: All new interactive elements MUST be keyboard reachable with a visible focus state; any new animation MUST be disabled under reduced motion.
- **FR-019**: All new text MUST meet 4.5:1 contrast and be sized so the reader's default text size applies.
- **FR-020**: The new pages and the palette MUST stay within page-weight budgets (constitution VI) whose numbers the plan sets, checked at build time.
- **FR-021**: The new pages MUST remain excluded from search-engine indexing while the site is in its noindex phase.
- **FR-022**: Moving to or between any page of this feature, or opening a card from the palette, MUST keep the shell in place exactly as moving between cards does today (tree scroll position and open domains preserved, status line never leaving the screen). After every move the palette and the keyboard shortcuts MUST still work, with no duplicated or lost behaviour.

### Key Entities

- **Card**: a published decision card with permanent id, title, domain, path order, radar status, reviewed month, tags and aliases.
- **Planned topic**: an entry in the master list, published or not, with id, title and domain; unwritten ones have no radar status.
- **Domain**: one of the 13 ordered groups, with number, name, and published/total counts.
- **Search entry**: what the palette knows about a published card (title, aliases, tags, domain, radar status, address).
- **Learning path**: the fixed ordering of domains and of cards within each.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader can open the palette and reach a card by keyboard alone in under 5 seconds, from any page.
- **SC-002**: For 100% of published cards, searching their title, any alias or any tag returns that card in the top 3 results; a fixed set of misspelled-title cases (defined in the plan, with "sga" for Saga as the minimum) also passes.
- **SC-003**: Palette results appear within 100 ms of each keystroke on a typical laptop once loaded.
- **SC-004**: With the network disconnected after load, 100% of palette searches still return results.
- **SC-005**: 100% of cards appear exactly once in the learning path, exactly once in their domain page and, if published, exactly once in the radar and in search.
- **SC-006**: Every card state (published, not yet available) renders consistently across catalog, domain, path and home, with counts matching the master topic list.
- **SC-007**: The home shows hero, both entry points, 13 domain tiles and the freshness strip on first load, with no horizontal scroll at 320 px.
- **SC-008**: Every new interactive element is operable by keyboard alone; with reduced motion on, zero animations run on new pages.
- **SC-009**: 100% of new text meets 4.5:1 contrast.
- **SC-010**: With scripts blocked, 100% of the new non-palette pages stay readable and every link works.
- **SC-011**: The new pages and palette stay within the budgets set by the plan, and the build fails if exceeded.
- **SC-012**: In 100% of trials moving from any new page, or from the palette, to a card or another new page, the tree keeps its scroll position and open domains, and the palette still opens afterwards with every shortcut.
- **SC-013**: After scrolling manually to any section of a card, pressing "j" or "k" lands on the adjacent section of that visible section in 100% of trials.

## Assumptions

- Search covers published cards only. At the time of writing only one card is published; the same rules apply as cards are added.
- Unwritten (pending or drafting) cards show in the catalog, domain pages and learning path as "not yet available", as in the Phase 2 tree and pager. They have no radar status and are not searchable.
- **Home meters (confirmed)**: the domain progress meters show published out of total cards, with no reader state, because reader progress belongs to Phase 4.
- **Freshness strip (confirmed)**: it shows recently reviewed cards by last-reviewed date and each card's current radar status. The content has no history of radar changes, so "radar changes" are not shown and no placeholder is displayed; recording them is out of scope.
- Reader progress, export/import and its display are Phase 4 and out of scope.
- No changes to card content or the card template; the Saga card gains only the "j/k" behaviour.
- English only; single dark theme as approved.
- The owner (Carlos) remains the only author and the only person who triggers deploys.
