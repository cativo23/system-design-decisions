import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCard } from '../../src/lib/cards/parse-card.ts';
import type { CardData } from '../../src/lib/cards/schema.ts';
import { toPublished } from '../../src/lib/discovery/catalog.ts';
import { search } from '../../src/lib/discovery/match.ts';
import { buildSearchIndex } from '../../src/lib/discovery/search-index.ts';
import { parseTopics } from '../../src/lib/topics.ts';

// SC-002 over the real content: a card added later that cannot be found by its own title, alias or tag fails the build.
const DIR = 'src/content/cards';
const cards = readdirSync(DIR)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => parseCard(join(DIR, f), readFileSync(join(DIR, f), 'utf8')));
const { topics } = parseTopics(readFileSync('docs/TOPICS.md', 'utf8'), 'docs/TOPICS.md');
const { entries } = buildSearchIndex(topics, toPublished(cards.map((c) => ({ data: c.data as CardData }))));

describe('search over the real cards', () => {
  it('should index every published card', () => {
    expect(entries).toHaveLength(cards.length);
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const card of entries) {
    it.each([card.title, ...card.aliases, ...card.tags])(`should find ${card.id} in the top 3 for "%s"`, (query) => {
      expect(search(entries, query).slice(0, 3).map((e) => e.id)).toContain(card.id);
    });
  }

  it('should find the Saga card from the misspelling the spec names', () => {
    expect(search(entries, 'sga').slice(0, 3).map((e) => e.id)).toContain('saga');
  });
});
