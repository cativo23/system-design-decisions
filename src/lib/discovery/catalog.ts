import { DOMAINS, type Domain } from '../domains.ts';
import type { CardData } from '../cards/schema.ts';
import { domainMeter } from '../layout/meter.ts';
import type { TopicEntry } from '../topics.ts';

// Every page of the discovery feature is derived from the topic list plus the cards (FR-016).
// Path order is the position in docs/TOPICS.md: domain order, then list order (research.md R6).

export type PublishedCard = Pick<CardData, 'id' | 'title' | 'domain' | 'order' | 'status' | 'reviewed' | 'tags' | 'aliases'>;

export interface CatalogEntry {
  id: string;
  title: string;
  domain: Domain;
  /** 1-based, within the domain, in topic-list order. */
  position: number;
  published: boolean;
  /** null when unpublished: no radar badge (FR-009). */
  status: CardData['status'] | null;
  reviewed: string | null;
  /** null when unpublished: no link. */
  href: string | null;
}

export interface DomainSummary {
  domain: Domain;
  entries: CatalogEntry[];
  published: number;
  total: number;
  /** "published / total" (FR-014). */
  label: string;
  meter: string;
}

/** Collection entries (`{ data }`) to the card shape buildCatalog takes. */
export function toPublished(entries: { data: CardData }[]): PublishedCard[] {
  return entries.map(({ data: { id, title, domain, order, status, reviewed, tags, aliases } }) => ({ id, title, domain, order, status, reviewed, tags, aliases }));
}

/** "Published" means a card exists, not that the topic list says so (the real Saga is `[~]` and live). */
export function buildCatalog(topics: TopicEntry[], cards: PublishedCard[]): DomainSummary[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return DOMAINS.map((domain) => {
    const entries = topics
      .filter((t) => t.domainNumber === domain.number)
      .map((t, index): CatalogEntry => {
        const card = byId.get(t.id);
        return {
          id: t.id,
          title: card?.title ?? t.title,
          domain,
          position: index + 1,
          published: card !== undefined,
          status: card?.status ?? null,
          reviewed: card?.reviewed ?? null,
          href: card ? `/cards/${t.id}/` : null,
        };
      });
    const published = entries.filter((e) => e.published).length;
    return { domain, entries, published, total: entries.length, label: `${published} / ${entries.length}`, meter: domainMeter(published, entries.length) };
  });
}

/** Where the learning path begins: the first published entry in path order, or null while nothing is published. */
export function startPoint(catalog: DomainSummary[]): CatalogEntry | null {
  return catalog.flatMap((d) => d.entries).find((e) => e.published) ?? null;
}

