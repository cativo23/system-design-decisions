import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCard } from '../../src/lib/cards/parse-card.ts';
import { validateCards } from '../../src/lib/cards/rules.ts';
import { parseTopics } from '../../src/lib/topics.ts';

// Cross-card rules and the run-date rule. TOPICS has alpha (written), beta and gamma (planned).
const FIXTURES = new URL('../fixtures/valid/', import.meta.url);
const VALID = readFileSync(new URL('cards/alpha.mdx', FIXTURES), 'utf8');
const { topics: TOPICS } = parseTopics(readFileSync(new URL('TOPICS.md', FIXTURES), 'utf8'), 'TOPICS.md');
const TODAY = '2026-11-23';

// Builds a one-line `related` list of { id, why } objects for the frontmatter.
const rel = (...ids: string[]) => `[${ids.map((id) => `{id: ${id}, why: w}`).join(', ')}]`;

function card(file: string, changes: Record<string, string> = {}) {
  let source = VALID;
  for (const [field, value] of Object.entries(changes)) {
    source = source.replace(new RegExp(`^${field}: .*$`, 'm'), `${field}: ${value}`);
  }
  return parseCard(file, source);
}

describe('validateCards: cross-card rules', () => {
  it('should pass a related id that is planned but unwritten', () => {
    expect(validateCards([card('a.mdx', { related: rel('beta', 'gamma') })], TOPICS, TODAY, 'cards')).toEqual([]);
  });

  it('should pass a related id that is another written card', () => {
    const cards = [card('a.mdx', { related: rel('beta2') }), card('b.mdx', { id: 'beta2', order: '3' })];
    const topics = [...TOPICS, { id: 'beta2', title: 'Beta 2', domainNumber: 1, state: 'pending' as const }];
    expect(validateCards(cards, topics, TODAY, 'cards')).toEqual([]);
  });

  it('should report related-unknown for an id in neither the cards nor the topics', () => {
    expect(validateCards([card('a.mdx', { related: rel('beta', 'nope') })], TOPICS, TODAY, 'cards')).toEqual([
      { file: 'a.mdx', id: 'alpha', rule: 'related-unknown', detail: expect.stringContaining('"nope"') },
    ]);
  });

  it('should report related-why-missing naming the related id', () => {
    expect(validateCards([card('a.mdx', { related: '[{id: beta, why: " "}]' })], TOPICS, TODAY, 'cards')).toEqual([
      { file: 'a.mdx', id: 'alpha', rule: 'related-why-missing', detail: expect.stringContaining('"beta"') },
    ]);
  });

  it('should report related-self when a card lists its own id', () => {
    expect(validateCards([card('a.mdx', { related: rel('alpha') })], TOPICS, TODAY, 'cards')).toEqual([
      { file: 'a.mdx', id: 'alpha', rule: 'related-self', detail: 'related lists the card\'s own id "alpha"' },
    ]);
  });

  it('should report id-duplicate on every file that shares the id, naming the others', () => {
    const failures = validateCards([card('a.mdx'), card('b.mdx'), card('c.mdx')], TOPICS, TODAY, 'cards');
    expect(failures).toEqual([
      { file: 'a.mdx', id: 'alpha', rule: 'id-duplicate', detail: 'id "alpha" is also used by b.mdx, c.mdx' },
      { file: 'b.mdx', id: 'alpha', rule: 'id-duplicate', detail: 'id "alpha" is also used by a.mdx, c.mdx' },
      { file: 'c.mdx', id: 'alpha', rule: 'id-duplicate', detail: 'id "alpha" is also used by a.mdx, b.mdx' },
    ]);
  });

  it('should report order-matches-topics when order differs from the position in the topic list', () => {
    // beta is the 2nd topic of domain 1 (see fixtures/valid/TOPICS.md), but the card says order 1.
    const failures = validateCards([card('b.mdx', { id: 'beta', order: '1', related: '[]' })], TOPICS, TODAY, 'cards');
    expect(failures).toEqual([
      { file: 'b.mdx', id: 'beta', rule: 'order-matches-topics', detail: expect.stringMatching(/order 1.*position 2.*TOPICS\.md/) },
    ]);
  });

  it('should pass a card whose order equals its position within its domain in the topic list', () => {
    expect(validateCards([card('a.mdx')], TOPICS, TODAY, 'cards')).toEqual([]);
    expect(validateCards([card('g.mdx', { id: 'gamma', domain: 'distributed-data', order: '1' })], TOPICS, TODAY, 'cards')).toEqual([]);
  });

  it('should not report order-matches-topics for a card that is not in the topic list (id-not-in-topics covers it)', () => {
    const rules = validateCards([card('x.mdx', { id: 'ghost', order: '9' })], TOPICS, TODAY, 'cards').map((f) => f.rule);
    expect(rules).toEqual(['id-not-in-topics']);
  });

  it('should report id-not-in-topics for a card missing from the master topic list', () => {
    expect(validateCards([card('z.mdx', { id: 'zeta' })], TOPICS, TODAY, 'cards')).toEqual([
      { file: 'z.mdx', id: 'zeta', rule: 'id-not-in-topics', detail: expect.stringContaining('"zeta"') },
    ]);
  });

  it('should report no-cards on an empty list, naming the directory', () => {
    expect(validateCards([], TOPICS, TODAY, 'src/content/cards')).toEqual([
      { file: 'src/content/cards', id: null, rule: 'no-cards', detail: 'no *.mdx cards in src/content/cards' },
    ]);
  });

  it('should report a reviewed month after the run month as metadata-invalid', () => {
    expect(validateCards([card('a.mdx', { reviewed: '2026-12' })], TOPICS, TODAY, 'cards')).toEqual([
      { file: 'a.mdx', id: 'alpha', rule: 'metadata-invalid', detail: 'reviewed "2026-12" is in the future (run month 2026-11)' },
    ]);
  });

  it('should accept the current month as reviewed', () => {
    expect(validateCards([card('a.mdx', { reviewed: '2026-11' })], TOPICS, TODAY, 'cards')).toEqual([]);
  });

  it('should return every defect from several cards in one call (FR-013)', () => {
    const cards = [
      card('a.mdx', { status: 'maybe', related: rel('nope') }),
      card('b.mdx', { id: 'zeta', reviewed: '2030-01' }),
    ];
    expect(validateCards(cards, TOPICS, TODAY, 'cards').map((f) => `${f.file} ${f.rule}`)).toEqual(
      expect.arrayContaining([
        'a.mdx metadata-invalid',
        'a.mdx related-unknown',
        'b.mdx metadata-invalid',
        'b.mdx id-not-in-topics',
      ]),
    );
  });
});
