# Contract: Published Site (HTTP) and Health Gate

Production origin: `https://architecture.cativo.dev`. It's served by nginx in a container behind
Traefik on polaris2 (TLS via the `letsencryptresolver` resolver, plus the `security-headers@file`
middleware).

## Routes

| Path | Content | Requirement |
|---|---|---|
| `/` | Unstyled index of written cards: title (linked to the card), domain display name, radar status. Ordered by domain number, then `order`. | FR-020a |
| `/cards/<id>/` | Card page: H1 title; domain, radar status, reviewed month, tags; then the nine sections in template order. | FR-020, FR-011b |
| `/version.txt` | The short commit SHA (7 characters) the image was built from, followed by a newline. | FR-019 (proves the new version is live) |
| anything else | nginx 404 | n/a |

`/cards/saga` (no trailing slash) gets nginx's directory redirect to `/cards/saga/`. Links always
use the trailing-slash form.

## Headers on every response (any status)

| Header | Value | Set by |
|---|---|---|
| `X-Robots-Tag` | `noindex, nofollow` | nginx `add_header … always`, at `server` level only (no `location` block adds headers, so nothing overrides it) |
| `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` | from `security-headers@file` | Traefik |

Every HTML page also carries `<meta name="robots" content="noindex, nofollow">` in `<head>` (FR-021).

There is deliberately **no** `robots.txt` with `Disallow: /`. Blocking crawling would stop crawlers
from ever seeing the `noindex`, and the URL could still get indexed from external links.

## Health gate

The gate is `node scripts/health-gate.ts --origin https://architecture.cativo.dev --expect-version <short-sha>`.
It runs on the GitHub Actions runner after `docker compose up -d` succeeds on polaris2. Running
from outside polaris2 means it exercises public DNS, TLS, Traefik and nginx, the same path a
reader takes.

### What "responds" means

The site **responds** when, in a single round, all three requests below pass every assertion:

| # | Request | Assertions |
|---|---|---|
| 1 | `GET /version.txt` | status `200` · body trimmed equals `<short-sha>` (the version just deployed, not a stale container) |
| 2 | `GET /` | status `200` · `X-Robots-Tag` contains `noindex` (case-insensitive) · body contains a robots meta tag whose content includes `noindex` · body links to `/cards/saga/` |
| 3 | `GET /cards/saga/` | status `200` · `X-Robots-Tag` contains `noindex` · robots meta contains `noindex` · body contains the H1 `Saga` |

Conditions that apply to every request:

- The TLS certificate must be valid and publicly trusted: Node `fetch` verifies by default, and no
  insecure flag is ever set.
- Redirects are not followed (`redirect: "manual"`), so a `3xx` counts as a failure.
- Each request has a 10-second timeout.

### Retry and verdict

- A round runs every 10 s until one passes, or until **180 s** have passed since the first round.
- **Pass**: print `✓ site responds (version <sha>)` with each request's time in ms (as evidence
  for SC-001), then exit `0`.
- **Fail**: print `✗ site did not respond within 180s` with the last round's problems, one per
  line and URL (for example `GET /cards/saga/: X-Robots-Tag missing`), then exit `1`. The deploy
  job fails with that message (US1 scenario 4).

The assertion logic is a pure function, `checkResponse(kind, {status, headers, body}, expectedVersion) → string[]`,
written test-first. The loop and `fetch` form a thin shell around it.

## Build-output checks (`npm run check:build`)

`node scripts/check-build.ts dist` runs in CI after `astro build`. It fails (exit 1) when any
`dist/**/*.html` page:

- is missing the robots `noindex` meta tag, or
- exceeds the performance budget (see plan.md, Performance budget).

It's also a pure core (`checkPage(html, assetSizes) → string[]`) with a thin file-reading shell,
written test-first.
