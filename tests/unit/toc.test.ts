import { describe, expect, it } from 'vitest';
import { currentSection } from '../../src/lib/layout/toc.ts';

const TOPS = [
  { id: 'problem', top: 100 },
  { id: 'how', top: 400 },
  { id: 'when', top: 900 },
];

describe('currentSection', () => {
  it('should return the last section whose top is above the line', () => {
    expect(currentSection(TOPS, 500)).toBe('how');
    expect(currentSection(TOPS, 900)).toBe('when');
  });

  it('should return the first id when none is above the line', () => {
    expect(currentSection(TOPS, 10)).toBe('problem');
  });

  it('should return null for empty input', () => {
    expect(currentSection([], 100)).toBeNull();
  });
});
