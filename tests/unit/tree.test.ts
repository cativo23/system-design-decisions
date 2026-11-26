import { describe, expect, it } from 'vitest';
import type { TopicEntry } from '../../src/lib/topics.ts';
import { buildTree, treeCurrent } from '../../src/lib/layout/tree.ts';

const topic = (id: string, domainNumber: number): TopicEntry => ({ id, title: id, domainNumber, state: 'pending' });
const TOPICS = [topic('saga', 5), topic('outbox-cdc', 5), topic('cap', 1)];

describe('buildTree', () => {
  const tree = buildTree(TOPICS, new Set(['saga']), 'saga');

  it('should return the 13 domains in order', () => {
    expect(tree.map((d) => d.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('should open only the current card domain', () => {
    expect(tree.filter((d) => d.open).map((d) => d.number)).toEqual([5]);
  });

  it('should count total topics, with read 0 and an empty meter', () => {
    const d5 = tree[4];
    expect([d5.read, d5.total, d5.meter]).toEqual([0, 2, '▱▱▱▱']);
    expect(tree[1].total).toBe(0);
  });

  it('should give written cards an href and unwritten cards none', () => {
    const [saga, outbox] = tree[4].cards;
    expect(saga.href).toBe('/cards/saga/');
    expect(outbox.href).toBeUndefined();
  });

  it('should mark the current card and use the id as label and ○ as glyph', () => {
    const [saga, outbox] = tree[4].cards;
    expect([saga.current, outbox.current]).toEqual([true, false]);
    expect([saga.label, saga.glyph]).toEqual(['saga', '○']);
  });
});

describe('treeCurrent', () => {
  const tree = buildTree(TOPICS, new Set(['saga']), 'saga');

  it('should resolve a card path to its id and domain', () => {
    expect(treeCurrent('/cards/saga/', tree)).toEqual({ id: 'saga', domain: 5 });
  });

  it('should return null for an unknown path', () => {
    expect(treeCurrent('/nope/', tree)).toBeNull();
    expect(treeCurrent('/', tree)).toBeNull();
  });
});
