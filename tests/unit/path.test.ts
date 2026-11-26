import { describe, expect, it } from 'vitest';
import type { TopicEntry } from '../../src/lib/topics.ts';
import { buildPath, neighbors } from '../../src/lib/layout/path.ts';

const topic = (id: string, domainNumber: number): TopicEntry => ({ id, title: id.toUpperCase(), domainNumber, state: 'pending' });
const TOPICS = [topic('a', 1), topic('b', 1), topic('c', 2)];

describe('buildPath', () => {
  it('should keep topic order across domains', () => {
    expect(buildPath(TOPICS, new Map()).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('should mark written cards with their radar status and the rest with null', () => {
    const path = buildPath(TOPICS, new Map([['b', 'adopt' as const]]));
    expect(path.map((e) => [e.written, e.status])).toEqual([
      [false, null],
      [true, 'adopt'],
      [false, null],
    ]);
  });

  it('should carry title and domain number', () => {
    expect(buildPath(TOPICS, new Map())[2]).toMatchObject({ id: 'c', title: 'C', domainNumber: 2 });
  });
});

describe('neighbors', () => {
  const path = buildPath(TOPICS, new Map());

  it('should return prev and next for a middle entry', () => {
    const { prev, next } = neighbors(path, 'b');
    expect([prev?.id, next?.id]).toEqual(['a', 'c']);
  });

  it('should have no prev on the first and no next on the last', () => {
    expect(neighbors(path, 'a').prev).toBeNull();
    expect(neighbors(path, 'c').next).toBeNull();
  });

  it('should throw for an id not in the path', () => {
    expect(() => neighbors(path, 'zzz')).toThrow(/zzz/);
  });
});
