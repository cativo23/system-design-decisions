import { describe, expect, it } from 'vitest';
import { buildCatalog, startPoint, toPublished } from '../../src/lib/discovery/catalog.ts';
import { DOMAINS } from '../../src/lib/domains.ts';
import { CARDS, TOPICS } from '../helpers/discovery-fixtures.ts';

const catalog = buildCatalog(TOPICS, CARDS);
const byNumber = (n: number) => catalog.find((d) => d.domain.number === n)!;
const entry = (id: string) => catalog.flatMap((d) => d.entries).find((e) => e.id === id)!;

describe('buildCatalog', () => {
  it('should return the 13 domains in order, including those without topics', () => {
    expect(catalog.map((d) => d.domain.number)).toEqual(DOMAINS.map((d) => d.number));
    expect(byNumber(13).entries).toEqual([]);
  });

  it('should list entries of a domain in topic-list order with a 1-based position', () => {
    expect(byNumber(5).entries.map((e) => [e.id, e.position])).toEqual([
      ['idempotency', 1],
      ['outbox-cdc', 2],
      ['saga', 3],
    ]);
  });

  it('should mark an entry published when its card exists, whatever the topic list state says', () => {
    expect(entry('saga').published).toBe(true); // topic state is "drafting"
    expect(entry('quality-attributes').published).toBe(true);
    expect(entry('idempotency').published).toBe(false);
  });

  it('should give a published entry its card title, status, reviewed month and href', () => {
    expect(entry('saga')).toMatchObject({ title: 'Saga', status: 'adopt', reviewed: '2026-11', href: '/cards/saga/' });
  });

  it('should give an unpublished entry the topic title and null status, reviewed and href (no radar badge, no link)', () => {
    expect(entry('idempotency')).toMatchObject({ title: 'Idempotency', status: null, reviewed: null, href: null });
  });

  it('should count published and total per domain and show them as "published / total"', () => {
    expect([byNumber(5).published, byNumber(5).total, byNumber(5).label]).toEqual([2, 3, '2 / 3']);
    expect([byNumber(1).published, byNumber(1).total, byNumber(1).label]).toEqual([2, 3, '2 / 3']);
  });

  it('should read 0 / N with an empty meter for a domain with topics and no published card', () => {
    expect([byNumber(6).published, byNumber(6).total, byNumber(6).label, byNumber(6).meter]).toEqual([0, 2, '0 / 2', '▱▱▱▱']);
  });

  it('should read 0 / 0 for a domain with no topics', () => {
    expect([byNumber(13).published, byNumber(13).total, byNumber(13).label]).toEqual([0, 0, '0 / 0']);
  });

  it('should draw the meter from published out of total', () => {
    expect(byNumber(5).meter).toBe('▰▰▰▱'); // domainMeter(2, 3): round(2/3 * 4) = 3 filled segments
  });

  it('should list every topic exactly once across the whole path, in domain then position order', () => {
    const path = catalog.flatMap((d) => d.entries).map((e) => e.id);
    expect(path).toHaveLength(TOPICS.length);
    expect(new Set(path).size).toBe(TOPICS.length);
    expect(path).toEqual(['quality-attributes', 'consistency', 'estimation', 'monolith', 'microservices', 'idempotency', 'outbox-cdc', 'saga', 'indexing', 'replication']);
  });

  it('should keep the published count equal to the number of published cards', () => {
    expect(catalog.reduce((n, d) => n + d.published, 0)).toBe(CARDS.length);
  });

  it('should ignore a card with no matching topic instead of inventing an entry', () => {
    const extra = { ...CARDS[0], id: 'not-in-topics' };
    expect(buildCatalog(TOPICS, [...CARDS, extra]).flatMap((d) => d.entries)).toHaveLength(TOPICS.length);
  });
});

describe('toPublished', () => {
  it('should map collection entries to the shape buildCatalog takes', () => {
    const [first] = CARDS;
    expect(toPublished([{ data: { ...first, related: [] } }])).toEqual([first]);
  });
});

describe('startPoint', () => {
  it('should be the first published entry in path order, skipping unwritten ones before it', () => {
    // Domain 1 starts with quality-attributes, which is published; moving it to unpublished must advance the start.
    expect(startPoint(catalog)?.id).toBe('quality-attributes');
    const withoutFirst = buildCatalog(TOPICS, CARDS.filter((c) => c.id !== 'quality-attributes'));
    expect(startPoint(withoutFirst)?.id).toBe('consistency');
  });

  it('should skip whole domains with nothing published', () => {
    const onlySaga = buildCatalog(TOPICS, CARDS.filter((c) => c.id === 'saga'));
    expect(startPoint(onlySaga)?.id).toBe('saga');
  });

  it('should be null when nothing is published', () => {
    expect(startPoint(buildCatalog(TOPICS, []))).toBeNull();
  });

  it('should return a published entry with its link', () => {
    expect(startPoint(catalog)).toMatchObject({ published: true, href: '/cards/quality-attributes/' });
  });
});

