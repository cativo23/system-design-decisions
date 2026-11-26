# Feature Specification: Design System & Card Layout

**Feature Branch**: `002-design-system-card-layout`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description: "Give the guide its approved visual identity ("Linear × terminal", see docs/DESIGN.md §5 and docs/mockups/saga-card.html). Every card page has: top bar with brand and search trigger; left tree index of domains/cards with per-domain progress glyphs; reading column; right "on this page" TOC that highlights the current section; bottom tmux-style status line (mode, domain, file, radar status, domain progress, scroll %). Card sections render as: prompt breadcrumb + typed title, radar badge + reviewed date + tags, TL;DR panel, diff-style Use/Avoid, trade-offs table with ASCII meters, `ls`-style In the wild marked volatile, expandable WARN pitfalls, related cards with radar badges and `cd` hints, Go deeper list, prev/next pager. Moving between cards keeps the shell (tree, status line) in place without a full reload feel. Works at phone width. Fully keyboard reachable; prefers-reduced-motion disables all animation. The Saga card must look like the mockup."

## Clarifications

### Session 2026-11-25

- Q: Should related and pager entries for unwritten cards show a radar badge (provisional status in the topic list) or none? → A: None. Unwritten cards show title, reason and "not yet available", with no badge and no link; the topic list gains no radar field, and the Saga page differs from the mockup there (FR-018, FR-020, FR-031).
- Q: Should all text reach 4.5:1 contrast (lightening the mockup's faintest grey) or keep the mockup's exact colors? → A: All text reaches 4.5:1. The faintest grey is lightened just enough; decorative marks (hairlines, tree connectors) are exempt (FR-025, SC-007).
- Q: Are trade-off meter levels required card data, optional, or required for the cost row only? → A: Required. Every Trade-offs row carries a level from 0 to 6 for the card's approach and for the alternative; a missing or out-of-range level fails the checks (FR-021, FR-022).
- Q: At phone width, should the tree index stay hidden or be reachable through a button? → A: Reachable. A menu button in the top bar opens the tree as an overlay on phone-width screens, following mobile navigation conventions; the table of contents stays hidden (FR-029).
- Q: Should the search trigger be shown as unavailable until Phase 3, hidden, or shown as live? → A: Shown but disabled and labelled as unavailable, with no shortcut hint since the shortcuts do not work yet (FR-002).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a card in the approved visual identity (Priority: P1)

A reader opens the Saga card and sees the guide's approved look, "Linear × terminal": a single dark
theme, monospace for structure and labels, a readable sans for long-form text, and the terminal
vocabulary from the design. The reading column shows the card as a prompt breadcrumb, a title that
types itself in, a row with the radar badge, the review date and the tags, a TL;DR panel, and then
each template section rendered in its own form: Use/Avoid as a diff, Trade-offs as a table with
ASCII meters, In the wild as a directory listing marked volatile, Pitfalls as expandable WARN
lines, Related as cards with radar badges and `cd` hints, Go deeper as a source list, and a
previous/next pager at the end.

**Why this priority**: this is the product. The guide's value to a reader is a card that is
pleasant and quick to read in long sessions, and the identity is what makes it a portfolio piece.
Everything else in this phase frames this page.

**Independent Test**: open the Saga card at desktop width next to `docs/mockups/saga-card.html`
and walk the page top to bottom, element by element, against the list in FR-009 to FR-020. Each
in-scope element matches; the only differences are the documented deviations (FR-031).

**Acceptance Scenarios**:

1. **Given** the Saga card, **When** a reader opens it, **Then** the page shows the prompt
   breadcrumb, the title, the radar/date/tags row and the TL;DR panel, in that order, before the
   first section.
2. **Given** a card's Use it when / Avoid it when section, **When** it renders, **Then** the use
   items appear as added (`+`) lines under a "use it when" header and the avoid items as removed
   (`-`) lines under an "avoid it when" header.
3. **Given** a card's Trade-offs table, **When** it renders, **Then** every cell shows an ASCII
   meter of its level next to its text, the cost row is present, and a hint explains which
   direction is better.
4. **Given** a card's Pitfalls, **When** the page first loads, **Then** each pitfall shows as a
   collapsed WARN line with a short title, and opening it reveals its explanation; closing it
   hides it again.
5. **Given** a card whose Related entries point to cards that are written, **When** the page
   renders, **Then** each entry shows the card's title, radar badge, a one-line reason and a
   `cd ../<id>` hint, and links to the card. An entry for a card that is not written shows its
   title and reason, is marked "not yet available" and is not a link.
6. **Given** a card that is neither first nor last on the learning path, **When** the reader
   reaches the end, **Then** a pager offers the previous and the next card in path order; a
   neighbour that is not written is shown as not yet available and is not a link.
7. **Given** a reader whose browser cannot load the approved fonts, **When** the page renders,
   **Then** the text is shown immediately in fallback fonts of the same kind (monospace or sans)
   and the layout does not visibly jump when the fonts arrive.

---

### User Story 2 - Orient and move around inside the shell (Priority: P1)

Every card page sits inside a fixed frame. At the top, a bar with the brand and a search trigger.
On the left, a tree index of the 13 domains and their cards, each domain with a progress meter and
each card with a progress glyph. On the right, an "on this page" table of contents that highlights
the section being read. At the bottom, a tmux-style status line showing the mode, the domain, the
file, the radar status, the domain progress and the scroll position. When the reader moves to
another card, the tree and the status line stay where they are; only the reading column and the
card-specific details change, so the move does not feel like a full page reload.

**Why this priority**: the shell is what turns a pile of pages into a guide a reader can browse
and orient in. It is the other half of the visual identity and every later phase (search,
progress, home) plugs into it.

**Independent Test**: open a card, scroll it, and read the TOC and status line; then use the tree
to open a second card and check that the tree keeps its scroll position and open domains while the
status line updates. (A second sample card is needed for this test; see Assumptions.)

**Acceptance Scenarios**:

1. **Given** a card page, **When** it renders, **Then** it shows the top bar, tree index, reading
   column, table of contents and status line.
2. **Given** the tree index, **When** it renders, **Then** it lists all 13 domains in learning-path
   order; the current card's domain is open and the current card is marked; written cards are
   links; cards listed in the master topic list but not written are shown as not yet available
   and are not links.
3. **Given** a reader scrolling a card, **When** a section reaches the reading position, **Then**
   its entry in the table of contents is highlighted and the previous entry is not; clicking an
   entry jumps to that section.
4. **Given** a reader scrolling a card, **When** the scroll position changes, **Then** the status
   line's position field shows `top` at the very top, a percentage in between and `bot` at the
   very end.
5. **Given** a reader on one card with some tree domains opened and the tree scrolled, **When**
   they open another card from the tree, a related entry or the pager, **Then** the tree keeps its
   scroll position and its open domains, the status line stays on screen, the new card appears
   scrolled to its top, and the status line's domain, file and radar status show the new card.
6. **Given** a reader who has moved between cards, **When** they use the browser's back and
   forward buttons, **Then** the previous cards come back with the address updated and no broken
   state.
7. **Given** a reader whose browser blocks scripts, **When** they use the guide, **Then** every
   card is still fully readable and reachable through ordinary links; only the live extras (typed
   title, highlight of the current section, scroll position) may be absent.

---

### User Story 3 - Read comfortably on a phone (Priority: P2)

A reader opens a card on a phone. The reading column takes the full width and the page does not
scroll sideways. The table of contents steps out of the way, the tree index is one tap away behind a
menu button in the top bar, the status line stays at the bottom in a shorter form, and wide content such as the trade-offs table or a wide
diagram scrolls inside its own frame instead of widening the page.

**Why this priority**: card pages get opened from messages and bookmarks on phones, and the
constitution's promise that a reference tool works in any reading situation includes the small
screen. It does not block the desktop experience, so it follows it.

**Independent Test**: open the Saga card at 320, 390 and 768 pixel widths and check that the page
never scrolls sideways, text is readable without zooming, every section is reachable and the last
lines are not hidden behind the status line.

**Acceptance Scenarios**:

1. **Given** a viewport 320 pixels wide, **When** a card renders, **Then** the page has no
   horizontal scroll and no text is clipped.
2. **Given** a narrow viewport, **When** the Trade-offs table is wider than the screen, **Then**
   the table scrolls inside its own frame and the rest of the page stays put.
3. **Given** a viewport between phone and desktop width, **When** the page renders, **Then** the
   table of contents drops away first, then the tree index, and the reading column always stays.
4. **Given** a phone-width screen, **When** the reader taps the menu button in the top bar,
   **Then** the tree index opens as an overlay with the same content and behaviour as on
   desktop; it closes by a close control, by Escape, by tapping outside it, and when a card is
   chosen; and while it is open the page behind it does not scroll.
5. **Given** the menu overlay is open, **When** a keyboard or screen-reader user navigates,
   **Then** focus stays inside the overlay, returns to the menu button when it closes, and the
   button announces whether the menu is open.
6. **Given** a phone with a notch or a home indicator, **When** the status line is shown,
   **Then** its text and the page content are not covered by those screen areas.

---

### User Story 4 - Operate everything by keyboard, with calm motion (Priority: P2)

A reader who never touches the mouse can reach and operate every interactive element: the brand
link, the search trigger, the tree's domains and cards, the table of contents entries, the
pitfalls, the related cards, the sources and the pager. The element that has focus is always
visible. A reader who has asked their system to reduce motion sees no animation at all: the title
is already typed, nothing blinks, fades, slides or lifts, and moving between cards is instant.

**Why this priority**: the constitution makes keyboard operation and reduced motion
non-negotiable (principle V), and the design leans on motion that must stay optional. It is
verified separately from the visuals because a page can look right and still fail it.

**Independent Test**: unplug the mouse, tab through a card page from the top, and open every
pitfall and follow every kind of link; then switch on the reduced-motion preference and reload.

**Acceptance Scenarios**:

1. **Given** a card page, **When** a keyboard user presses Tab repeatedly, **Then** focus visits
   every interactive element exactly once in a logical order, and each focused element shows a
   clear focus indicator.
2. **Given** the repeated shell at the top of the page, **When** a keyboard user wants to read the
   card, **Then** a single action takes them past the top bar and tree index to the reading column.
3. **Given** a pitfall, **When** a keyboard user activates it, **Then** it opens or closes, and
   its open or closed state is conveyed in a way that does not rely on motion or color alone.
4. **Given** the reduced-motion preference is on, **When** any card page loads, is scrolled, or is
   navigated away from, **Then** no animation or transition runs: the title shows complete, the
   caret does not blink, sections appear without staging, hover effects change state without
   movement, and scrolling to a section is instant.
5. **Given** any element marked as hidden, **When** other styles apply to it, **Then** it stays
   hidden.

---

### User Story 5 - The card format carries what the layout needs (Priority: P2)

The owner, as author, writes a card once and the layout renders it. Some things the layout shows
cannot be derived from the text a card already holds: the level of each trade-off meter, the
one-line reason beside each related card, and the kind label (paper, pattern, guide…) of each
source. The card format carries them, and the checks fail, naming the card and the rule, when one
is missing or invalid, so a card cannot be published with a half-filled layout.

**Why this priority**: the Saga card cannot look like the mockup without this data, and
constitution principle II says required content is enforced by the machine, not by memory. It is
P2 only because it is invisible to readers until US1 uses it.

**Independent Test**: take a valid card and remove or corrupt each new piece of data in turn; each
defect makes the checks fail with a message naming the card and the rule, and the unmodified card
passes.

**Acceptance Scenarios**:

1. **Given** a Trade-offs row without a level for the card's approach or for the alternative,
   **When** the checks run, **Then** they fail and name the card, the row and the missing level.
2. **Given** a level outside the allowed scale, **When** the checks run, **Then** they fail and
   state the allowed range.
3. **Given** a related card with no one-line reason, **When** the checks run, **Then** they fail
   and name the card and the related id.
4. **Given** a Go deeper source with no kind label, **When** the checks run, **Then** they fail
   and name the card and the source.
5. **Given** a Pitfalls or In the wild entry that cannot be split into the parts the layout needs
   (title and explanation; name and description), **When** the checks run, **Then** they fail and
   name the card and the entry.
6. **Given** several such defects across several cards, **When** the checks run, **Then** every
   defect is reported in the same run.
7. **Given** the Saga card with its new data, **When** the checks run, **Then** they pass.

---

### Edge Cases

- A long card title wraps instead of overflowing or being clipped by the typed-title effect, and
  the full title is always available to assistive technology and in the browser tab title.
- A card with no tags, or many tags, still renders a tidy row; tags wrap.
- A card that is the first or last on the learning path shows no previous or no next pager entry,
  rather than an empty or broken one.
- A card page shorter than the screen shows `top` in the status line and the page is not forced to
  scroll.
- Following a link to a section (from the table of contents or from the address) lands with the
  section heading visible, not hidden under the top bar.
- The last lines of a card are never hidden behind the status line.
- Wide preformatted content (a wide ASCII diagram, a code block) scrolls inside its own frame and
  never widens the page.
- With 200% browser zoom or large text, the layout reflows and nothing becomes unreachable.
- The meters' ASCII glyphs read as noise to a screen reader unless they also carry their level as
  text.
- Radar status and use/avoid meaning are never conveyed by color alone: the badge says its status
  in words and the diff lines carry `+` and `-`.
- Navigating between cards keeps the tree's scroll position, except that when the new current card
  would be out of view in the tree it is scrolled just far enough to be visible.
- A related or pager neighbour that points at a card id with no written card and no planned entry
  cannot occur, because Phase 1 checks already reject unknown ids.
- If the approved fonts fail to load at all, the page stays fully usable in fallback fonts.

## Requirements *(mandatory)*

### Functional Requirements

**Shell**

- **FR-001**: Every card page MUST present five regions: a top bar, a tree index, a reading
  column, an "on this page" table of contents and a bottom status line.
- **FR-002**: The top bar MUST show the brand, which links to the site root, and a search trigger;
  on phone-width screens it also shows the menu button of FR-029. Because search itself is delivered
  in Phase 3, in this phase the search trigger MUST be visible, labelled and visibly unavailable
  (no shortcut hint) rather than a control that looks live and does nothing. It MUST stay reachable
  by keyboard and be announced as unavailable, and activating it MUST do nothing.
- **FR-003**: The tree index MUST list all 13 domains in learning-path order with their numbers.
  Each domain MUST be openable and closable by pointer and by keyboard; the current card's domain
  MUST be open by default; the current card MUST be marked with a text marker and emphasis.
  Written cards MUST be links. Cards that appear in the master topic list but are not written
  MUST be shown as not yet available and MUST NOT be links.
- **FR-004**: The tree index MUST show a progress meter per domain and a progress glyph per card.
  Reader progress is delivered in Phase 4; until then every domain meter MUST show the
  nothing-done state and every card glyph the not-yet state. The glyph for each of the three
  progress states (not yet, read, mastered) MUST be distinguishable without color.
- **FR-005**: The table of contents MUST list one entry per card section after the TL;DR panel,
  in template order. Selecting an entry MUST jump to that section. The entry for the section
  currently being read MUST be highlighted by a cue other than color alone, and the highlight
  MUST follow the reader as they scroll.
- **FR-006**: The status line MUST stay fixed at the bottom of the screen and show: the mode
  (`READ`), the card's domain, the card's file name, the card's radar status, the domain's
  progress as `read/total` (read is zero in this phase), and the scroll position (`top`, a
  percentage, or `bot`). Page content MUST never be hidden behind it.
- **FR-007**: Moving from one card to another MUST keep the tree index (its scroll position and
  its open and closed domains) and the status line in place. Only the reading column, the table
  of contents and the status line's card-specific fields change. The new card MUST appear at its
  top, the address MUST update, and back and forward MUST work. Keyboard focus and the reading
  position MUST land on the new card's content so a keyboard or screen-reader user is not left
  behind.
- **FR-008**: If the reader's browser blocks scripts, the guide MUST remain fully readable and
  every link MUST work as an ordinary page load. Only the live extras (typed title, current
  section highlight, scroll position, persistence of the shell) MAY be absent.

**Card sections**

- **FR-009**: The page MUST open with a prompt breadcrumb of the form
  `~/catalog/<domain number>-<domain slug> ❯ cat <card id>.md`, using the final 13-domain
  numbering.
- **FR-010**: The card title MUST appear as a large title that types itself in with a blinking
  caret. The complete title MUST be available to assistive technology and as the page title at
  all times, and long titles MUST wrap.
- **FR-011**: Below the title the page MUST show a row with the radar badge (label in words,
  colored by status), the last-reviewed month and the card's tags, each tag prefixed with `#`.
- **FR-012**: The TL;DR MUST render as a distinct panel above the first section.
- **FR-013**: Each template section after the TL;DR MUST have a heading marked with `##`, in
  template order, and a stable section link that the table of contents uses.
- **FR-014**: Use it when / Avoid it when MUST render as a diff: a "use it when" header followed
  by added lines marked `+`, then an "avoid it when" header followed by removed lines marked `-`.
- **FR-015**: Trade-offs MUST render as a table comparing the card's approach with its main
  alternative, with the cost row present. Every cell MUST show an ASCII meter of its level beside
  its text. The meter MUST also convey its level as text to assistive technology. A hint under
  the table MUST say which direction is better ("more █ = better for you").
- **FR-016**: In the wild MUST render as an `ls`-style listing (a `❯ ls ~/in-the-wild/<card id>`
  command line, then one `name/` and description per entry) marked as volatile with a verified
  date. The verified date is the card's last-reviewed month.
- **FR-017**: Pitfalls MUST render as a list of entries, each a collapsed `WARN` line with a short
  title that opens to show its explanation. Open and closed MUST be operable by pointer and
  keyboard and MUST be conveyed in a way that does not rely on motion or color alone.
- **FR-018**: Related MUST render as a grid of cards, each with the related card's title, a
  one-line reason and a `cd ../<id>` hint. A related card that is written MUST also show its radar
  badge and link to it. A related card that is not written MUST show no badge and no link, and
  MUST say it is not yet available.
- **FR-019**: Go deeper MUST render as a list where each source shows a kind label, its title and
  a cue that it opens an external page.
- **FR-020**: The page MUST end with a pager offering the previous and the next card in learning-
  path order, which runs across domains and follows the master topic list. A neighbour that is not
  written MUST be shown by title as not yet available and MUST NOT be a link. The first card on the
  path has no previous entry and the last has no next entry.

**Card format and checks**

- **FR-021**: A card's authored content MUST carry the data the layout needs that the text does not
  already provide: for each Trade-offs row, a level for the card's approach and a level for the
  alternative, each a whole number from 0 to 6 (the mockup's six-step meter); for each related card, a one-line reason; and for each Go
  deeper source, a kind label. The data MUST live in the card file with no second list to keep in
  sync.
- **FR-022**: The checks MUST fail, naming the card, the rule and the row, entry or id involved,
  when any of that data is missing or invalid (a level outside the scale, a blank reason, a blank
  kind label), or when a Pitfalls entry lacks a title or an explanation, or an In the wild entry
  lacks a name or a description, or when the TL;DR is not a single paragraph (the layout styles one
  paragraph as the panel). All failures MUST be reported in a single run.
- **FR-023**: Every rule from Phase 1 MUST keep working unchanged, the Saga card MUST pass them
  together with the new rules, and the pages MUST still carry the pre-launch "do not index"
  signal that the post-deploy check verifies.

**Visual identity and cross-cutting rules**

- **FR-024**: The guide MUST use one deliberate dark theme with the approved color roles: green
  accent (also success and Adopt), cyan for in-flight, amber for warning, red for failure and
  Hold, blue for info and Trial. It MUST use monospace for structure, chrome and labels and a
  proportional sans for long-form reading, as in the mockup. The theme and typefaces MUST also
  apply to the existing minimal root index; its structure stays as it is until Phase 3.
- **FR-025**: All text MUST have a contrast ratio of at least 4.5:1 against its background.
  Decorative marks (hairlines, tree connectors) are exempt.
- **FR-026**: Every interactive element MUST be reachable and operable by keyboard alone, in a
  logical order, with a visible focus indicator. A keyboard user MUST be able to bypass the
  repeated shell and reach the reading column in one action.
- **FR-027**: When the reader's system asks for reduced motion, no animation or transition MUST
  run anywhere on a card page: the title MUST show complete, the caret MUST NOT blink, the load
  sequence, hover movement, expand and collapse effects and shell transitions MUST be instant, and
  scrolling to a section MUST be immediate.
- **FR-028**: An element marked as hidden MUST stay hidden whatever styles other components apply.
- **FR-029**: On a phone-width screen the reading column MUST use the full width, the page MUST NOT
  scroll sideways, the table of contents MUST step out of the way, the tree index MUST be reachable
  through a menu button in the top bar that opens it as an overlay (closable by a close control,
  Escape and a tap outside, closing when a card is chosen, trapping focus while open, restoring
  focus on close, and tap targets at least 44 CSS pixels), the top bar and a shortened status line
  MUST remain, and wide tables and preformatted content MUST scroll
  inside their own frames. At widths in between, the table of contents MUST drop away before the
  tree index. The layout MUST respect device screen insets (notches, home indicators).
- **FR-030**: Until the approved fonts have loaded, the page MUST show its text in fallback fonts
  of the same kind and MUST NOT visibly jump when the fonts arrive.
- **FR-031**: The Saga card MUST look like the mockup for every element named in this
  specification. These parts of the mockup are out of scope here and MUST NOT appear: the command
  palette and its shortcuts; the primary navigation links (path, catalog, radar, progress); the
  keyboard-shortcut hints beside the table of contents; the "mark your progress" panel; the
  simulation terminal in How it works; and the reading-time estimate. The only addition to the mockup is the phone menu button
  (FR-029). Where the master data
  disagrees with the mockup, the master data wins: the domain number in the breadcrumb and tree
  (the mockup predates the 13 domains) and the lack of a radar badge on related and pager cards
  that are not written.
- **FR-032**: This feature MUST NOT add search, the command palette, reader progress, simulations,
  the catalog, learning-path or radar pages, the styled home page, new cards or search-engine
  optimisation.

### Key Entities

- **Card**: as in Phase 1, plus the authored layout data: trade-off levels, a reason per related
  card, a kind label per source.
- **Trade-off row**: a dimension name, a level and text for the card's approach, a level and text
  for the alternative; the row named `cost` is mandatory.
- **Related entry**: a related card id with the author's one-line reason; resolves to a written
  card or a planned, unwritten one.
- **Source**: a Go deeper entry with a kind label, a title and a link.
- **Path order**: the learning-path sequence of all cards, by domain number then order within the
  domain, read from the master topic list. It drives the tree, the pager and the status line's
  domain totals.
- **Domain**: one of the 13 fixed subject areas, with a number, a slug and a name.
- **Radar status**: adopt, trial, assess or hold, with its fixed color and word.
- **Shell**: the persistent frame (top bar, tree index, status line) around a card's reading
  column and table of contents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a side-by-side review at desktop width, 100% of the in-scope elements listed in
  FR-009 to FR-020 on the Saga page match the mockup, and the only differences are the deviations
  listed in FR-031. The owner signs this off.
- **SC-002**: In 100% of trials moving between two cards, the tree keeps its scroll position and
  open domains and the status line never leaves the screen.
- **SC-003**: Every interactive element on a card page can be reached and operated with the
  keyboard alone, with zero mouse-only functions, and every focus stop is visibly indicated.
- **SC-004**: With the reduced-motion preference on, zero animations or transitions run on any card
  page.
- **SC-005**: At 320 pixel width, a card page has zero horizontal page scroll, and every section,
  the pager and the last line of content are reachable and readable without zooming.
- **SC-006**: A reader on a typical broadband connection sees the card's text in under 2 seconds,
  and the page does not visibly jump when fonts arrive (layout shift no greater than 0.1). The
  page-weight budgets for this phase are
  stated and checked in the plan (constitution VI).
- **SC-007**: 100% of text on card pages meets a 4.5:1 contrast ratio.
- **SC-008**: 100% of the new defect types in User Story 5 (missing or out-of-range trade-off
  level, blank related reason, blank source kind, malformed pitfall, malformed In the wild entry,
  multi-paragraph TL;DR)
  are blocked, each demonstrated by an automated example that fails, and every Phase 1 defect type
  is still blocked.
- **SC-009**: With scripts blocked, 100% of cards remain readable and every link works.

## Assumptions

- The owner (Carlos) is the only author and the only person who triggers deploys in this phase.
- Saga is the only written card. Checking that the shell persists between cards needs at least two
  cards, so tests use a second sample card that is not published; no card is added to the site.
- `docs/mockups/saga-card.html` and `docs/DESIGN.md` §5 are the approved visual reference. The
  mockup is a design reference only: its content is placeholder, its breadcrumb uses an older
  domain numbering, and it shows items that belong to later phases (FR-031).
- Progress surfaces (tree meters and glyphs, status line `read/total`) are built now and show the
  nothing-done state until Phase 4 supplies real values. The progress-marking panel is Phase 4.
- The top bar carries only the brand and search trigger (plus the phone menu button) because the pages the mockup's navigation
  links point to (path, catalog, radar, progress) arrive in Phases 3 and 4. Domain rows in the tree
  open and close but are not links, for the same reason.
- At phone width the table of contents is hidden, as in the mockup, but the tree index is reachable
  through a menu button, which the mockup does not have. It is the only addition to the mockup's
  chrome in this phase and follows mobile navigation conventions.
- A radar status exists only for written cards. Saga's related cards are all unwritten, so in this
  phase its Related grid and its pager show titles as not yet available without radar badges,
  which differs from the mockup.
- Trade-off meters use a six-step scale, as in the mockup, where more filled steps is better for
  the reader. For the cost row, more filled steps means cheaper or lighter.
- A kind label is a short word such as `paper`, `pattern` or `guide`; the plan decides whether the
  set is fixed.
- The mockup's faintest grey measures about 3.3:1 against the background, below FR-025. The
  approved palette keeps its look but that grey is lightened as little as needed to reach 4.5:1
  (confirmed in clarification).
- This phase introduces the first client-side behavior. Phase 1's budgets (zero JavaScript, no more
  than 2 KB of CSS) cannot hold and MUST be restated with new numbers in the plan's Performance
  budget section. Where the fonts come from and which styling approach to use are plan decisions.
- Everything stays English-only, free of paid or managed services, and static at build time, as
  the constitution requires.
