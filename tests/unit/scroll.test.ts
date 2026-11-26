import { describe, expect, it } from 'vitest';
import { scrollLabel } from '../../src/lib/layout/scroll.ts';

describe('scrollLabel', () => {
  it('should say top at 0', () => expect(scrollLabel(0, 1000)).toBe('top'));
  it('should say top when the page does not scroll', () => expect(scrollLabel(0, 0)).toBe('top'));
  it('should say top when maxScroll is negative', () => expect(scrollLabel(10, -5)).toBe('top'));
  it('should say bot at the maximum', () => expect(scrollLabel(1000, 1000)).toBe('bot'));
  it('should say bot past the maximum', () => expect(scrollLabel(1200, 1000)).toBe('bot'));
  it('should round the percentage', () => {
    expect(scrollLabel(500, 1000)).toBe('50%');
    expect(scrollLabel(333, 1000)).toBe('33%');
    expect(scrollLabel(1, 1000)).toBe('0%');
  });
});
