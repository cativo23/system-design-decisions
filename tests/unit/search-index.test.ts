import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { PublishedCard } from '../../src/lib/discovery/catalog.ts';
import { buildSearchIndex } from '../../src/lib/discovery/search-index.ts';
import { DOMAINS } from '../../src/lib/domains.ts';
import type { TopicEntry } from '../../src/lib/topics.ts';
import { CARDS, TOPICS } from '../helpers/discovery-fixtures.ts';

describe('buildSearchIndex', () => {
  const index = buildSearchIndex(TOPICS, CARDS);

  it('should declare version 1', () => {
    expect(index.version).toBe(1);
  });

  it('should hold published cards only, in learning-path order', () => {
    expect(index.entries.map((e) => e.id)).toEqual(['quality-attributes', 'consistency', 'microservices', 'outbox-cdc', 'saga']);
  });

  it('should carry id, title, aliases, tags, status and href of the card', () => {
    const saga = index.entries.find((e) => e.id === 'saga')!;
    expect(saga).toEqual({
      id: 'saga',
      title: 'Saga',
      aliases: ['distributed transactions', 'compensating transactions'],
      tags: ['transactions', 'consistency', 'microservices'],
      domain: 'Distributed data & workflows',
      status: 'adopt',
      href: '/cards/saga/',
    });
  });

  it('should give the domain name the reader sees, not the slug', () => {
    expect(index.entries.map((e) => e.domain)).toEqual(['Foundations', 'Foundations', 'Architecture styles', 'Distributed data & workflows', 'Distributed data & workflows']);
  });

  it('should not index unpublished topics', () => {
    expect(index.entries.map((e) => e.id)).not.toContain('idempotency');
  });

  it('should give an empty entry list when nothing is published', () => {
    expect(buildSearchIndex(TOPICS, [])).toEqual({ version: 1, entries: [] });
  });

  it('should produce the same bytes for the same input', () => {
    expect(JSON.stringify(buildSearchIndex(TOPICS, CARDS))).toBe(JSON.stringify(buildSearchIndex(TOPICS, [...CARDS].reverse())));
  });

  it('should keep 85 realistic entries within 12 KB gzipped (the index budget)', () => {
    const words = ['consensus', 'replication', 'latency', 'throughput', 'queue', 'partition', 'cache', 'retry', 'timeout', 'schema', 'gateway', 'stream', 'lease', 'quorum', 'shard', 'index', 'batch', 'cursor', 'fanout', 'backoff'];
    const pick = (i: number, k: number) => words[(i * 7 + k * 3) % words.length];
    const topics: TopicEntry[] = [];
    const cards: PublishedCard[] = [];
    for (let i = 0; i < 85; i++) {
      const domain = DOMAINS[i % DOMAINS.length];
      const id = `${pick(i, 0)}-${pick(i, 1)}-${i}`;
      topics.push({ id, title: id, domainNumber: domain.number, state: 'published' });
      cards.push({
        id,
        title: `${pick(i, 0)} and ${pick(i, 1)} in distributed systems`,
        domain: domain.slug,
        order: 1,
        status: 'adopt',
        reviewed: '2026-11',
        tags: [pick(i, 2), pick(i, 3), pick(i, 4), pick(i, 5)],
        aliases: [`${pick(i, 6)} ${pick(i, 7)}`, `${pick(i, 8)} ${pick(i, 9)} pattern`, `${pick(i, 10)} ${pick(i, 11)}`],
      });
    }
    const big = buildSearchIndex(topics, cards);
    expect(big.entries).toHaveLength(85);
    expect(gzipSync(JSON.stringify(big), { level: 6 }).length).toBeLessThanOrEqual(12 * 1024);
  });
});
