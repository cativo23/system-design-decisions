# Systems Field Guide

A static web guide to software and system architecture as practised in industry, built from
"decision cards". Each card teaches *when* to use a pattern, not just what it is, through a fixed
template: TL;DR, Problem it solves, How it works, Use it when / Avoid it when, Trade-offs (with a
cost row), In the wild, Pitfalls, Related, Go deeper.

Live (pre-launch, noindexed): <https://architecture.cativo.dev/>

## Stack

Astro (static output) with MDX cards in a content collection, a test-first Node validator for
card content, and nginx in Docker behind Traefik on a self-hosted server. No backend, no client
JavaScript, no paid services.

## Development

Requires Node 24 (`nvm use`).

```sh
npm ci
```

| Script | What it does |
|---|---|
| `npm run dev` | Astro dev server |
| `npm test` | Vitest unit and integration tests |
| `npm run lint` | ESLint plus `astro check` |
| `npm run validate` | Validates every card in `src/content/cards/` against the template, metadata and `docs/TOPICS.md`, then prints a staleness report |
| `npm run build` | Static build into `dist/` |
| `npm run check:build` | Checks `dist/` against the performance budget (0 JS, ≤ 2 KB CSS, ≤ 50 KB HTML, no third-party origins) and the `noindex` meta tag |

CI runs lint, test, validate, build and check:build on every pull request and push to `main`.

## Deploy

Deploys are manual. Dispatch the `Deploy` workflow on `main`:

```sh
gh workflow run deploy.yml --ref main
gh run watch
```

It reruns the CI checks, pushes the image to Docker Hub, rolls it out on the server with
`docker compose`, and passes only when the health gate confirms the new version is serving.

## Docs

- [docs/DESIGN.md](docs/DESIGN.md): approved design, decisions and stack
- [docs/PHASES.md](docs/PHASES.md): roadmap and phase status
- [docs/TOPICS.md](docs/TOPICS.md): master list of cards and their status
- [specs/001-walking-skeleton/quickstart.md](specs/001-walking-skeleton/quickstart.md): runnable
  end-to-end validation scenarios
