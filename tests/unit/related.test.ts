import { describe, expect, it } from 'vitest';
import { resolveRelated } from '../../src/lib/cards/related.ts';
import type { TopicEntry } from '../../src/lib/topics.ts';

const written = [
  { id: 'saga', title: 'Saga', status: 'adopt' as const },
  { id: 'idempotency', title: 'Idempotency', status: 'trial' as const },
];

const topics: TopicEntry[] = [
  { id: 'saga', title: 'Saga (2PC covered inside)', domainNumber: 5, state: 'drafting' },
  { id: 'idempotency', title: 'Idempotency keys', domainNumber: 4, state: 'published' },
  { id: 'outbox-cdc', title: 'Transactional outbox & CDC', domainNumber: 5, state: 'pending' },
];

const rel = (id: string) => ({ id, why: `because ${id}` });

describe('resolveRelated', () => {
  it('should link a written card with its Card.title and Card.status', () => {
    expect(resolveRelated([rel('idempotency')], written, topics)).toEqual([
      { id: 'idempotency', why: 'because idempotency', href: '/cards/idempotency/', title: 'Idempotency', status: 'trial', available: true },
    ]);
  });

  it('should mark a planned but unwritten card as unavailable, titled from TopicEntry.title, with no href', () => {
    const [item] = resolveRelated([rel('outbox-cdc')], written, topics);
    expect(item).toEqual({ id: 'outbox-cdc', why: 'because outbox-cdc', title: 'Transactional outbox & CDC', available: false });
    expect(item).not.toHaveProperty('href');
  });

  it('should preserve the input order', () => {
    const ids = ['outbox-cdc', 'saga', 'idempotency'];
    expect(resolveRelated(ids.map(rel), written, topics).map((r) => r.id)).toEqual(ids);
  });

  it('should carry the why of each entry', () => {
    expect(resolveRelated([rel('saga')], written, topics)[0]).toMatchObject({ why: 'because saga' });
  });

  it('should return [] for an empty list', () => {
    expect(resolveRelated([], written, topics)).toEqual([]);
  });

  it('should fall back to the id as the title for an id in neither list (the validator rejects these first)', () => {
    expect(resolveRelated([rel('ghost')], written, topics)).toEqual([
      { id: 'ghost', why: 'because ghost', title: 'ghost', available: false },
    ]);
  });
});
