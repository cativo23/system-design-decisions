import type { TopicEntry } from '../topics.ts';
import type { CardData } from './schema.ts';

// What the Related section shows for each id in a card's `related` list:
// a link to a written card, or a planned topic shown as not yet available (FR-011b).

export type WrittenCard = Pick<CardData, 'id' | 'title' | 'status'>;

export type RelatedItem =
  | { id: string; why: string; href: string; title: string; status: CardData['status']; available: true }
  | { id: string; why: string; title: string; available: false };

export function resolveRelated(related: CardData['related'], writtenCards: WrittenCard[], topics: TopicEntry[]): RelatedItem[] {
  const written = new Map(writtenCards.map((c) => [c.id, c]));
  const planned = new Map(topics.map((t) => [t.id, t]));

  return related.map(({ id, why }) => {
    const card = written.get(id);
    if (card) return { id, why, href: `/cards/${id}/`, title: card.title, status: card.status, available: true };
    // The validator rejects unknown ids before a build, so the id fallback only guards the page.
    return { id, why, title: planned.get(id)?.title ?? id, available: false };
  });
}
