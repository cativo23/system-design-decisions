import { DOMAINS } from '../domains.ts';
import type { TopicEntry } from '../topics.ts';
import { domainMeter } from './meter.ts';

export interface TreeCard {
  id: string;
  label: string;
  href?: string;
  current: boolean;
  /** ○ not yet read; · read and ✓ mastered arrive with progress (Phase 4). */
  glyph: '○';
}

export interface TreeDomain {
  number: number;
  slug: string;
  name: string;
  open: boolean;
  read: number;
  total: number;
  meter: string;
  cards: TreeCard[];
}

export function buildTree(topics: TopicEntry[], writtenIds: ReadonlySet<string>, currentId: string): TreeDomain[] {
  const currentDomain = topics.find((t) => t.id === currentId)?.domainNumber;
  return DOMAINS.map((d) => {
    const mine = topics.filter((t) => t.domainNumber === d.number);
    return {
      number: d.number,
      slug: d.slug,
      name: d.name,
      open: d.number === currentDomain,
      read: 0, // reader progress does not exist yet (Phase 4 supplies it)
      total: mine.length,
      meter: domainMeter(0, mine.length),
      cards: mine.map((t) => ({
        id: t.id,
        label: t.id,
        ...(writtenIds.has(t.id) ? { href: `/cards/${t.id}/` } : {}),
        current: t.id === currentId,
        glyph: '○' as const,
      })),
    };
  });
}

/** Which card and domain to mark for a page path after a client-side navigation. */
export function treeCurrent(pathname: string, tree: TreeDomain[]): { id: string; domain: number } | null {
  for (const d of tree) {
    for (const c of d.cards) if (c.href !== undefined && c.href === pathname) return { id: c.id, domain: d.number };
  }
  return null;
}
