import { describe, expect, it } from 'vitest';
import { cardSchema } from '../../src/lib/cards/schema.ts';

const VALID = {
  id: 'saga',
  title: 'Saga',
  domain: 'distributed-data',
  order: 3,
  status: 'adopt',
  reviewed: '2026-11',
  tags: ['transactions'],
  aliases: ['distributed transactions'],
  related: ['outbox-cdc'],
};

function issues(overrides: Record<string, unknown>) {
  const result = cardSchema.safeParse({ ...VALID, ...overrides });
  return result.success ? [] : result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

function withoutField(field: string) {
  const data: Record<string, unknown> = { ...VALID };
  delete data[field];
  return cardSchema.safeParse(data);
}

describe('cardSchema', () => {
  it('should accept a valid card', () => {
    expect(issues({})).toEqual([]);
  });

  it.each(['id', 'title', 'domain', 'order', 'status', 'reviewed', 'tags', 'aliases', 'related'])(
    'should reject a card missing %s, with the field path',
    (field) => {
      const result = withoutField(field);
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((i) => i.path[0])).toContain(field);
    },
  );

  describe('Card.id', () => {
    it.each(['Saga', 'saga-', '-saga', 'saga--x', 'saga_x', ''])('should reject %j with the slug format', (id) => {
      expect(issues({ id })).toEqual([{ path: 'id', message: expect.stringContaining('lowercase slug') }]);
    });

    it('should accept a multi-part slug', () => {
      expect(issues({ id: 'outbox-cdc2' })).toEqual([]);
    });
  });

  describe('Card.title', () => {
    it.each(['', '   '])('should reject the blank title %j', (title) => {
      expect(issues({ title })).toEqual([{ path: 'title', message: expect.stringContaining('blank') }]);
    });
  });

  describe('Card.domain', () => {
    it('should reject an unknown domain and list the allowed slugs', () => {
      const [issue] = issues({ domain: 'frontend' });
      expect(issue.path).toBe('domain');
      expect(issue.message).toContain('foundations');
      expect(issue.message).toContain('reference-architectures');
    });
  });

  describe('Card.order', () => {
    it.each([0, -1, 1.5, '3'])('should reject %j as not a whole number ≥ 1', (order) => {
      expect(issues({ order })).toEqual([{ path: 'order', message: expect.stringContaining('whole number ≥ 1') }]);
    });
  });

  describe('Card.status', () => {
    it('should reject an unknown status and list the four rings', () => {
      expect(issues({ status: 'maybe' })).toEqual([
        { path: 'status', message: expect.stringContaining('adopt, trial, assess, hold') },
      ]);
    });
  });

  describe('Card.reviewed', () => {
    it.each(['2026-13', '2026-00', '2026-1', '26-11', '2026/11', 202611])(
      'should reject %j and name the YYYY-MM format',
      (reviewed) => {
        expect(issues({ reviewed })).toEqual([{ path: 'reviewed', message: expect.stringContaining('YYYY-MM') }]);
      },
    );

    it('should accept any well-formed month (the future rule lives in the validator)', () => {
      expect(issues({ reviewed: '2099-12' })).toEqual([]);
    });
  });

  describe.each(['tags', 'aliases', 'related'])('Card.%s', (field) => {
    it('should accept an empty list', () => {
      expect(issues({ [field]: [] })).toEqual([]);
    });

    it('should reject a blank entry', () => {
      expect(issues({ [field]: ['a', '  '] })).toEqual([
        { path: expect.stringMatching(new RegExp(`^${field}`)), message: expect.stringContaining('blank') },
      ]);
    });

    it('should reject a duplicate entry and name it', () => {
      expect(issues({ [field]: ['a', 'b', 'a'] })).toEqual([
        { path: field, message: expect.stringContaining('duplicate "a"') },
      ]);
    });

    it('should reject a value that is not a list', () => {
      expect(issues({ [field]: 'a' })).toEqual([{ path: field, message: expect.stringContaining('list') }]);
    });
  });
});
