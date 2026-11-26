import { describe, expect, it } from 'vitest';
import { domainMeter, meterString } from '../../src/lib/layout/meter.ts';

describe('meterString', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])('should fill %i of 6 cells', (n) => {
    expect(meterString(n)).toBe('█'.repeat(n) + '░'.repeat(6 - n));
  });

  it.each([7, -1, 2.5, NaN])('should throw for %s', (n) => {
    expect(() => meterString(n)).toThrow();
  });
});

describe('domainMeter', () => {
  it.each([
    [0, 6, '▱▱▱▱'],
    [6, 6, '▰▰▰▰'],
    [3, 6, '▰▰▱▱'],
    [1, 0, '▱▱▱▱'],
    [0, 0, '▱▱▱▱'],
  ])('should render %i/%i as %s', (read, total, expected) => {
    expect(domainMeter(read, total)).toBe(expected);
  });
});
