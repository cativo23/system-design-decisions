import type { CardData } from '../cards/schema.ts';
import type { TopicEntry } from '../topics.ts';
import { buildCatalog, type PublishedCard } from './catalog.ts';

// The build-time search index (contracts/search-index.md): published cards only, in learning-path
// order, so the same input always gives the same bytes.

export interface SearchEntry {
  id: string;
  title: string;
  aliases: string[];
  tags: string[];
  /** The domain name the reader sees, not the slug. */
  domain: string;
  status: CardData['status'];
  href: string;
}

export interface SearchIndex {
  version: 1;
  entries: SearchEntry[];
}

export function buildSearchIndex(topics: TopicEntry[], cards: PublishedCard[]): SearchIndex {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const entries = buildCatalog(topics, cards)
    .flatMap((d) => d.entries.filter((e) => e.published).map((e) => ({ domain: d.domain, card: byId.get(e.id)!, href: e.href! })))
    .map(
      ({ domain, card, href }): SearchEntry => ({
        id: card.id,
        title: card.title,
        aliases: card.aliases,
        tags: card.tags,
        domain: domain.name,
        status: card.status,
        href,
      }),
    );
  return { version: 1, entries };
}
