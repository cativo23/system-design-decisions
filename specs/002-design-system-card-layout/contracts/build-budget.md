# Contract: Build Output, Budgets and Headers

Amends [001 http-contract.md](../../001-walking-skeleton/contracts/http-contract.md) §
Build-output checks and § Health gate. Rationale and measurements:
[research.md R11–R13](../research.md#r11-performance-budget-constitution-vi).

## Per-page budgets (enforced by `npm run check:build`)

Measured on each HTML file in `dist/`. Text is measured gzipped at level 6, which is what nginx
serves (`gzip_comp_level 6`); fonts are measured as the woff2 files referenced by the page's
`@font-face` rules.

| Budget | Limit |
|---|---|
| JavaScript: same-origin scripts, inline and external, plus every `.js` chunk they import (followed transitively), gzipped | ≤ 12 KB |
| CSS: inline `<style>` plus same-origin stylesheets, gzipped | ≤ 8 KB |
| Fonts: woff2 files referenced by the page's CSS | ≤ 110 KB |
| HTML document, raw | ≤ 50 KB |
| Whole page: gzipped HTML + CSS + JS + fonts | ≤ 150 KB |
| Resources from another origin (scripts, styles, fonts, images, `url()`) | 0 |

`1 KB = 1024 bytes`. A page over a limit prints `✗ <file>: <what> is <n> bytes (budget <m>)`
and the command exits 1. The limits live as constants at the top of `scripts/check-build.ts`;
changing one needs a reason in the plan (constitution VI). `--report` prints each page's JS, CSS,
font, HTML and total sizes without failing; it exists to record real numbers, not to gate.

## Structure checks (same command, same pure core `checkPage`)

Each page must have:

1. `<meta name="robots" content="…noindex…">` (Phase 1, unchanged).
2. Exactly one `<h1>`.
3. A skip link: the first `<a>` in `<body>` has `href="#main"` and the page has `id="main"`.
4. Landmarks: `<header>`, `<main>`, and every `<nav>` / `<aside>` has an `aria-label`.
5. The CSS contains the `[hidden]` rule with `display: none !important` (constitution V).
6. The CSS contains a `prefers-reduced-motion: reduce` block that sets `animation` and
   `transition` to `none`.

The root index page is exempt from 3 and 4 (no shell until Phase 3) but not from 1, 2, 5 and 6.

## nginx (`nginx/default.conf`)

```
gzip on; gzip_comp_level 6; gzip_vary on; gzip_min_length 1024;
gzip_types text/css application/javascript application/json image/svg+xml;
location /_astro/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header X-Robots-Tag "noindex, nofollow" always;   # a location's add_header drops the server-level one
}
```

## Health gate (extends 001 § Health gate)

After the three existing requests, one more per round:

4. `GET <first font href from / >` → `200`, `X-Robots-Tag` contains `noindex`, `Cache-Control`
   contains `immutable`.

The font href is read from the first `<link rel="preload" as="font" href="…">` in the `/`
response. If `/` has no such link the gate fails with "no font preload found". Same timeouts,
retries and no-redirect rules as the other requests. A new pure case `font` is added to
`checkResponse(kind, response, expectedVersion)`.

The card check's H1 assertion (`<h1>` containing `Saga`) is loosened to tolerate inline elements
inside the heading, because the typed-title markup wraps the text in a `<span>`.
