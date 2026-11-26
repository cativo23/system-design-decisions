# Contract: Card Page UI

The behaviour a card page promises, written so each line can be checked in a browser, in the
built HTML, or in a unit test. It maps to spec FR-001–FR-032. Class names are indicative; the
element roles, attributes and behaviours are the contract.

## Page anatomy

```
<body>
  a.skip-link  "Skip to content" → #main          first focusable element
  header.topbar            landmark: banner
    a.brand ❯ field-guide  → /
    button.menu            phone only; aria-expanded, aria-controls=tree
    button.search          aria-disabled="true", "search", no shortcut hint (clarification 5)
  div.shell
    nav#tree.tree          landmark: navigation, aria-label="Catalog"; transition:persist="tree"
      details.domain × 13  summary: "<NN> <slug> <meter>"; cards inside
    main#main              landmark: main
      article
        .prompt, h1, .meta, then the nine sections (below), then .pager
    aside.toc              aria-label="On this page"
  div.statusline           aria-hidden="true" (it repeats what the page already says)
```

Exactly one `<h1>` per page. The skip link is the first link in the document and becomes
visible on focus.

## Card sections

| Element | Becomes | Accessible form |
|---|---|---|
| `.prompt` | `~/catalog/<NN>-<domain slug> ❯ cat <id>.md` | plain text |
| `h1` | the title inside `<h1><span class="typed">Saga</span></h1>`; typed in when `isTypable(title)` (the span's width animates in a flex `h1`); the caret is `h1::after`, so it follows the growing span as in the mockup | full title always in the DOM and `<title>`; a pseudo-element caret is not read |
| `.meta` | radar badge (word + colour), `reviewed <YYYY-MM>`, tags prefixed `#` | badge text is the status in words |
| TL;DR | `h2#tldr` visually hidden; the first paragraph after it is the panel with a `// tl;dr` label | the heading stays for assistive tech; label is `content: "…" / ""` |
| Other `h2` | `##` marker + title, id from the template table, `scroll-margin-top` clears the sticky bar | real headings |
| Use/Avoid | `h3[data-kind]` shown as `@@ use it when @@`; list items get `+` / `-` and tint | headings and list semantics kept; signs are not the only cue |
| Trade-offs | table inside a scroll frame; each cell starts with a `Meter`; hint "more █ = better for you" under it | `Meter` is `role="img"` with `aria-label="N of 6"` |
| In the wild | `❯ ls ~/in-the-wild/<id>  # volatile · verified <reviewed>`, then rows `name/` + description | list semantics kept |
| Pitfalls | one `<details>` per `Pitfall`: `WARN` + title + chevron; closed by default | native disclosure: Enter/Space toggle, state exposed; chevron is not the only cue |
| Related | grid of cards: title, radar badge (written only), `why`, `cd ../<id>` (written only) | written → `<a>`; unwritten → text + visually hidden "not yet available", no badge, no link |
| Go deeper | rows: `[kind]` + title + `↗` | each is a link; `↗` is `aria-hidden` |
| Pager | previous/next in path order; unwritten neighbour = text + "not yet available" | `nav` with `aria-label`; absent side omitted |

## Tree

- Native `<details>`/`<summary>` per domain: keyboard and screen-reader behaviour for free,
  and it works with scripts blocked (FR-008).
- The current card's domain has `open` in the server HTML. The row for the current card has
  `aria-current="page"`, the marker `◀` and emphasis. After a client navigation the script
  re-marks the current card and opens its domain (`treeCurrent`); the reader's other open/closed
  choices are left alone.
- Domain rows are not links (no domain pages until Phase 3).
- Glyphs: every card shows `○` (not yet). Glyphs for read `·` and mastered `✓` are defined but
  unused. They differ in shape, so state never depends on colour (FR-004).

## Status line

Fixed to the bottom, always visible, `padding-bottom: env(safe-area-inset-bottom)`; the page has
bottom padding so the last line of content is never covered (FR-006). Fields: `READ`, domain,
`<id>.md`, `● <status>`, `domain <read>/<total>`, position (`top` | `N%` | `bot`, set live).
Narrow screens hide the secondary fields and keep mode, file and position.

## Keyboard

| Key | Where | Effect |
|---|---|---|
| Tab / Shift+Tab | everywhere | document order: skip link, brand, (menu), search (focusable, announced as unavailable), tree, article, TOC |
| Enter | skip link | focus moves to `#main` |
| Enter / Space | `summary`, `<details>` pitfall | toggle |
| Enter | any link | navigate (no full reload when the router is active) |
| Escape | open phone menu | close; focus returns to the menu button |
| Tab at the last/first item | open phone menu | wraps inside the menu |

Every focusable element has a visible focus ring (`:focus-visible`, 1 px accent outline, 2 px
offset, as in the mockup). The search trigger uses `aria-disabled="true"` rather than `disabled`, so it stays a tab stop that
screen readers announce as unavailable; activating it does nothing.

## Navigation behaviour (FR-007)

With the router active, choosing a card from the tree, a related entry or the pager swaps the
reading column, the table of contents, the top bar and the status line; the tree element is
carried over (`transition:persist="tree"`), so its scroll position and open domains survive. After
the swap: scroll resets to the top, the address and title update, focus moves to the new `h1`
(`tabindex="-1"`), and back/forward restore the previous cards. Without scripts every link is a
normal page load.

## Responsive behaviour

| Width | Layout |
|---|---|
| > 1200 px | tree, reading column (max ≈ 740 px), table of contents |
| 881–1200 px | table of contents hidden first; tree and column stay |
| ≤ 880 px | tree hidden, menu button shown; one full-width column; side padding respects `env(safe-area-inset-*)`; status line shortened; pager and related stack |

The page never scrolls sideways at 320 px; tables and `pre` blocks scroll inside their own frame.
Tap targets are at least 44 CSS px. Phone menu behaviour: [research.md R8](../research.md#r8-phone-menu-overlay).

## Motion

A single rule at the end of the base CSS: under `prefers-reduced-motion: reduce`, every
`animation` and `transition` is `none`, the caret does not blink, `scroll-behavior` is `auto`, and
the title is shown complete. Astro's view-transition CSS adds its own `animation: none` for the
swap. The typed title, caret blink, staggered rise, hover lift, spotlight, chevron turn and live-dot
pulse are the only animations and are all covered by that rule.

## Hidden

`[hidden] { display: none !important }` is in the base CSS (constitution V), above all component
rules.

## Tokens (`src/styles/tokens.css`)

The mockup's `:root` custom properties, with one change: `--fg-faint: #7d828c` (was `#5d626b`,
[R10](../research.md#r10-contrast-one-token-changes)). Colour roles: `--accent` green (success,
Adopt), `--run` cyan (in flight), `--warn` amber, `--bad` red (failure, Hold), `--info` blue
(Trial). Type: `--mono` and `--sans` are defined from the font variables
`--font-mono` / `--font-sans` that Astro's Fonts API emits, followed by the system fallbacks.

## Unchanged from Phase 1

Every page keeps `<meta name="robots" content="noindex, nofollow">` and the server's
`X-Robots-Tag`; the root index keeps its structure and only picks up the theme (FR-024).
