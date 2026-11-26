import { describe, expect, it } from 'vitest';
import { isTypable } from '../../src/lib/layout/typed-title.ts';

describe('isTypable', () => {
  it('should accept up to 14 characters', () => {
    expect(isTypable('Saga')).toBe(true);
    expect(isTypable('x'.repeat(14))).toBe(true);
  });
  it('should reject above 14 characters', () => expect(isTypable('x'.repeat(15))).toBe(false));
  it('should reject blank titles', () => {
    expect(isTypable('')).toBe(false);
    expect(isTypable('   ')).toBe(false);
  });
});
