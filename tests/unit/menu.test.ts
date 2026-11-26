import { describe, expect, it } from 'vitest';
import { nextFocusIndex, nextMenuState } from '../../src/lib/layout/menu.ts';

describe('nextMenuState', () => {
  it('should open on open', () => expect(nextMenuState('closed', 'open')).toBe('open'));

  it.each(['close', 'escape', 'backdrop', 'navigate'] as const)('should close on %s', (event) => {
    expect(nextMenuState('open', event)).toBe('closed');
  });

  it.each(['close', 'escape', 'backdrop', 'navigate'] as const)('should stay closed on %s when closed', (event) => {
    expect(nextMenuState('closed', event)).toBe('closed');
  });
});

describe('nextFocusIndex', () => {
  it('should wrap Tab from the last to 0', () => expect(nextFocusIndex(2, 3, false)).toBe(0));
  it('should wrap Shift+Tab from 0 to the last', () => expect(nextFocusIndex(0, 3, true)).toBe(2));
  it('should move forward and back otherwise', () => {
    expect(nextFocusIndex(0, 3, false)).toBe(1);
    expect(nextFocusIndex(2, 3, true)).toBe(1);
  });
  it('should return -1 when there is nothing to focus', () => expect(nextFocusIndex(0, 0, false)).toBe(-1));
});
