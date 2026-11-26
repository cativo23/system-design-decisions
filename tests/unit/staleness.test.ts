import { describe, expect, it } from 'vitest';
import { parseCard } from '../../src/lib/cards/parse-card.ts';
import { ageInMonths, staleCards } from '../../src/lib/cards/staleness.ts';

function card(file: string, id: string, reviewed: string) {
  return parseCard(file, `---\nid: ${id}\nreviewed: ${reviewed}\n---\n`);
}

describe('ageInMonths', () => {
  it.each([
    ['2026-11', '2026-11-23', 0],
    ['2026-10', '2026-11-01', 1],
    ['2025-11', '2026-11-30', 12],
    ['2025-10', '2026-11-23', 13],
    ['2026-11', '2028-01-15', 14],
  ])('should count %s → %s as %i whole calendar months', (reviewed, today, months) => {
    expect(ageInMonths(reviewed, today)).toBe(months);
  });
});

describe('staleCards', () => {
  const TODAY = '2026-11-23';

  it('should not list a card reviewed exactly 12 months ago', () => {
    expect(staleCards([card('a.mdx', 'a', '2025-11')], TODAY)).toEqual([]);
  });

  it('should list a card reviewed 13 months ago with StaleEntry.file, id, reviewed and ageInMonths', () => {
    expect(staleCards([card('a.mdx', 'a', '2025-10')], TODAY)).toEqual([
      { file: 'a.mdx', id: 'a', reviewed: '2025-10', ageInMonths: 13 },
    ]);
  });

  it('should sort stale cards oldest first', () => {
    const cards = [card('b.mdx', 'b', '2025-06'), card('a.mdx', 'a', '2024-01'), card('c.mdx', 'c', '2025-09')];
    expect(staleCards(cards, TODAY).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('should skip cards without an id or a valid reviewed month (the validator reports those)', () => {
    const cards = [
      card('a.mdx', 'a', '2020-13'),
      parseCard('b.mdx', 'no frontmatter'),
      parseCard('c.mdx', '---\nreviewed: 2020-01\n---\n'),
      card('d.mdx', 'd', '2020-01'),
    ];
    expect(staleCards(cards, TODAY).map((s) => s.file)).toEqual(['d.mdx']);
  });
});
