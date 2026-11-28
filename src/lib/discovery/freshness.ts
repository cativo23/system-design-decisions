import type { PublishedCard } from './catalog.ts';
import type { CardData } from '../cards/schema.ts';

// The home's freshness strip (FR-015): up to 5 published cards, most recently reviewed first.
// `reviewed` is `YYYY-MM`, so plain string order is chronological; same-month cards go by title.
export interface FreshnessItem {
  id: string;
  title: string;
  href: string;
  status: CardData['status'];
  reviewed: string;
}

const LIMIT = 5;

export function freshness(cards: PublishedCard[]): FreshnessItem[] {
  return [...cards]
    .sort((a, b) => (a.reviewed < b.reviewed ? 1 : a.reviewed > b.reviewed ? -1 : a.title.localeCompare(b.title) || a.id.localeCompare(b.id)))
    .slice(0, LIMIT)
    .map(({ id, title, status, reviewed }) => ({ id, title, href: `/cards/${id}/`, status, reviewed }));
}
