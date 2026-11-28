# Contract: `search-index.json` and the matcher

## Endpoint

`GET /search-index.json`, an Astro static endpoint (`src/pages/search-index.json.ts`, exported
`GET` returning `Response.json(...)`), built once at build time to `dist/search-index.json`.

- Same origin, no CORS, `Content-Type: application/json`.
- Served by nginx with the server-level `X-Robots-Tag: noindex, nofollow` (no `location`
  overrides it) and gzip (`application/json` is already in `gzip_types`).
- Not hashed, so no `immutable`; the browser revalidates it normally.

## Shape

```json
{
  "version": 1,
  "entries": [
    {
      "id": "saga",
      "title": "Saga",
      "aliases": ["distributed transactions", "compensating transactions"],
      "tags": ["transactions", "consistency", "microservices"],
      "domain": "Distributed data & workflows",
      "status": "adopt",
      "href": "/cards/saga/"
    }
  ]
}
```

- `entries` holds published cards only, in learning-path order. Empty list is valid.
- `status` is one of `adopt`, `trial`, `assess`, `hold`.
- `version` changes only if the shape changes; `palette.ts` treats an unknown version as the
  error state rather than guessing.
- Gzipped size ≤ 12 KB at 85 entries ([build-budget.md](build-budget.md)).

## Matcher (`src/lib/discovery/match.ts`)

Signature: `search(entries, query, limit = 8): SearchEntry[]`. Pure, no DOM. Rules are fixed in
[research.md R4](../research.md#r4-the-matcher-rules): normalisation, AND over query tokens,
exact / prefix / typo tiers, typo limit 0 / 1 / 2 by token length (1–2 / 3–7 / 8+), field
weights title 3, alias 2, tag 1, order by score then title.

Contract tests (written first):

1. Every published card is returned in the top 3 when its title, each alias and each tag is the query (SC-002).
2. `sga`, `sagaa`, `distribtued transactions`, `consitency` return the Saga card.
3. A query of regex or markup characters (`(`, `[a-`, `<b>`) returns without throwing and treats them as separators.
4. Results are deterministic for the same input.
