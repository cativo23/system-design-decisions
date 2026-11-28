import { describe, expect, it } from 'vitest';
import type { PublishedCard } from '../../src/lib/discovery/catalog.ts';
import { freshness } from '../../src/lib/discovery/freshness.ts';
import { CARDS } from '../helpers/discovery-fixtures.ts';

const card = (id: string, title: string, reviewed: string): PublishedCard => ({ ...CARDS[0], id, title, reviewed });

describe('freshness', () => {
  it('should list the most recently reviewed first, with same-month cards in title order', () => {
    expect(freshness(CARDS).map((i) => [i.title, i.reviewed])).toEqual([
      ['Consistency models', '2026-11'],
      ['Saga', '2026-11'],
      ['Microservices', '2026-10'],
      ['Transactional outbox', '2026-10'],
      ['Quality attributes', '2026-09'],
    ]);
  });

  it('should compare months as dates, not as text lengths or numbers', () => {
    const cards = [card('a', 'A', '2025-12'), card('b', 'B', '2026-01'), card('c', 'C', '2026-02')];
    expect(freshness(cards).map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('should show at most 5', () => {
    const many = Array.from({ length: 8 }, (_, i) => card(`c${i}`, `Card ${i}`, `2026-0${i + 1}`));
    expect(freshness(many)).toHaveLength(5);
    expect(freshness(many).map((i) => i.reviewed)).toEqual(['2026-08', '2026-07', '2026-06', '2026-05', '2026-04']);
  });

  it('should show all of them when fewer than 5 are published, and nothing when none is', () => {
    expect(freshness(CARDS.slice(0, 2))).toHaveLength(2);
    expect(freshness([])).toEqual([]);
  });

  it('should give every item its current radar status, link and review month, and nothing about history', () => {
    const saga = freshness(CARDS).find((i) => i.id === 'saga')!;
    expect(saga).toEqual({ id: 'saga', title: 'Saga', href: '/cards/saga/', status: 'adopt', reviewed: '2026-11' });
  });

  it('should give the same order whatever the input order', () => {
    expect(freshness([...CARDS].reverse())).toEqual(freshness(CARDS));
  });
});
