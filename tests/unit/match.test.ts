import { describe, expect, it } from 'vitest';
import { editDistance, normalize, search } from '../../src/lib/discovery/match.ts';
import { buildSearchIndex, type SearchEntry } from '../../src/lib/discovery/search-index.ts';
import { CARDS, TOPICS } from '../helpers/discovery-fixtures.ts';

const { entries } = buildSearchIndex(TOPICS, CARDS);
const ids = (query: string, from: SearchEntry[] = entries) => search(from, query).map((e) => e.id);
const entry = (title: string, aliases: string[] = [], tags: string[] = []): SearchEntry => ({
  id: title.toLowerCase().replace(/\W+/g, '-'),
  title,
  aliases,
  tags,
  domain: 'Foundations',
  status: 'adopt',
  href: '/cards/x/',
});

describe('normalize', () => {
  it('should lower-case, strip diacritics and split on anything that is not a letter or digit', () => {
    expect(normalize('  Café  Ünïcode, B-Tree (v2)! ')).toEqual(['cafe', 'unicode', 'b', 'tree', 'v2']);
  });

  it('should return no tokens for symbols only', () => {
    expect(normalize('([<>]).*')).toEqual([]);
  });
});

describe('editDistance (optimal string alignment)', () => {
  it.each([
    ['saga', 'saga', 0],
    ['sga', 'saga', 1], // insertion
    ['sagaa', 'saga', 1], // deletion
    ['sagb', 'saga', 1], // substitution
    ['sag', 'sga', 1], // adjacent swap counts as one edit
    ['kitten', 'sitting', 3],
    ['', 'abc', 3],
  ])('should measure %s → %s as %i', (a, b, expected) => {
    expect(editDistance(a, b)).toBe(expected);
  });
});

describe('search: matching tiers', () => {
  it('should match an exact title word, a prefix and a title in any letter case', () => {
    expect(ids('saga')).toContain('saga');
    expect(ids('SAG')).toContain('saga');
    expect(ids('Microserv')).toContain('microservices');
  });

  it('should match an alias and a tag', () => {
    expect(ids('distributed transactions')[0]).toBe('saga');
    expect(ids('messaging')).toEqual(['outbox-cdc']);
  });

  it('should require every query token to match (AND)', () => {
    expect(ids('saga outbox')).toEqual([]);
    expect(ids('compensating transactions')).toEqual(['saga']);
  });

  it('should return nothing for an empty or blank query', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
  });
});

describe('search: typo limits by token length', () => {
  it('should allow no typo in a 1–2 letter token (exact or prefix only)', () => {
    const only = [entry('Ab')];
    expect(ids('ab', only)).toHaveLength(1);
    expect(ids('a', only)).toHaveLength(1);
    expect(ids('ac', only)).toEqual([]);
  });

  it('should allow one typo in a 3–7 letter token, and not two', () => {
    const only = [entry('Aaaa')];
    expect(ids('aaab', only)).toHaveLength(1);
    expect(ids('aabb', only)).toEqual([]);
  });

  it('should allow two typos in a token of 8 or more letters, and not three', () => {
    const only = [entry('Abcdefgh')];
    expect(ids('abcdefxy', only)).toHaveLength(1);
    expect(ids('abcdexyz', only)).toEqual([]);
  });

  it('should match a typo against the same-length prefix of a longer word while the reader is still typing', () => {
    expect(ids('distribt', [entry('Distributed systems')])).toHaveLength(1);
  });

  it('should find the SC-002 misspellings', () => {
    expect(ids('sga').slice(0, 3)).toContain('saga');
    expect(ids('sagaa').slice(0, 3)).toContain('saga');
    expect(ids('distribtued transactions').slice(0, 3)).toContain('saga');
    expect(ids('consitency').slice(0, 3)).toContain('saga');
    expect(ids('microservces').slice(0, 3)).toContain('microservices');
  });
});

describe('search: ranking and limits', () => {
  it('should rank a title match above an alias match above a tag match', () => {
    const list = [entry('Zeta', [], ['quorum']), entry('Beta', ['quorum']), entry('Quorum')];
    expect(ids('quorum', list)).toEqual(['quorum', 'beta', 'zeta']);
  });

  it('should rank an exact word above a prefix above a typo', () => {
    const list = [entry('Sagas'), entry('Sagb'), entry('Saga')];
    expect(ids('saga', list)).toEqual(['saga', 'sagas', 'sagb']);
  });

  it('should break ties by title ascending, the same way every time', () => {
    const list = [entry('Cc', ['shared']), entry('Aa', ['shared']), entry('Bb', ['shared'])];
    expect(ids('shared', list)).toEqual(['aa', 'bb', 'cc']);
    expect(ids('shared', [...list].reverse())).toEqual(['aa', 'bb', 'cc']);
  });

  it('should return at most 8 results by default and honour a given limit', () => {
    const many = Array.from({ length: 12 }, (_, i) => entry(`Alpha ${String.fromCharCode(97 + i)}`));
    expect(search(many, 'alpha')).toHaveLength(8);
    expect(search(many, 'alpha', 3)).toHaveLength(3);
  });

  it('should be fast: 85 entries searched in well under 100 ms (SC-003)', () => {
    const many = Array.from({ length: 85 }, (_, i) => entry(`Topic ${i} replication`, [`alias ${i} consensus`], ['latency', 'quorum']));
    const best = Math.min(
      ...[0, 1, 2].map(() => {
        const t = performance.now();
        search(many, 'replicaton consensu');
        return performance.now() - t;
      }),
    );
    expect(best).toBeLessThan(25);
  });
});

describe('search: plain text only', () => {
  it.each(['(', '[a-', '<b>', '.*', '\\', 'a{2,', '$^'])('should not throw on %s', (query) => {
    expect(() => search(entries, query)).not.toThrow();
  });

  it('should treat regex characters as separators, not as syntax', () => {
    expect(ids('(saga)')).toEqual(ids('saga'));
  });

  it('should be deterministic', () => {
    expect(ids('consistency')).toEqual(ids('consistency'));
  });
});

describe('SC-002: every published card is in the top 3 for its title, each alias and each tag', () => {
  for (const card of entries) {
    it.each([card.title, ...card.aliases, ...card.tags])(`should find ${card.id} for "%s"`, (query) => {
      expect(ids(query).slice(0, 3)).toContain(card.id);
    });
  }
});
