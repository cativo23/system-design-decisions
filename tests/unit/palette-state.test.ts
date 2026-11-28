import { describe, expect, it } from 'vitest';
import { moveCursor, nextPaletteState, selected, type PaletteEvent, type PaletteStatus } from '../../src/lib/discovery/palette-state.ts';

const run = (start: PaletteStatus, ...events: PaletteEvent[]) => events.reduce(nextPaletteState, start);

describe('nextPaletteState', () => {
  it('should open straight to ready when the index is loaded', () => {
    expect(run('closed', { type: 'open', index: 'ready' })).toBe('ready');
  });

  it('should open to loading while the index is pending', () => {
    expect(run('closed', { type: 'open', index: 'pending' })).toBe('loading');
  });

  it('should open to error when the index failed to load', () => {
    expect(run('closed', { type: 'open', index: 'failed' })).toBe('error');
  });

  it('should go from loading to ready or error when the index settles', () => {
    expect(run('loading', { type: 'loaded' })).toBe('ready');
    expect(run('loading', { type: 'failed' })).toBe('error');
  });

  it('should stay closed when the index settles while the palette is closed', () => {
    expect(run('closed', { type: 'loaded' })).toBe('closed');
    expect(run('closed', { type: 'failed' })).toBe('closed');
  });

  it.each(['loading', 'ready', 'error'] as const)('should close from %s', (state) => {
    expect(run(state, { type: 'close' })).toBe('closed');
  });

  it('should ignore an open event while already open', () => {
    expect(run('ready', { type: 'open', index: 'pending' })).toBe('ready');
    expect(run('loading', { type: 'open', index: 'ready' })).toBe('loading');
  });

  it('should always end consistent after a long alternating open/close sequence', () => {
    const open: PaletteEvent = { type: 'open', index: 'ready' };
    const close: PaletteEvent = { type: 'close' };
    const sequence = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? open : close));
    expect(run('closed', ...sequence)).toBe('closed');
    expect(run('closed', open, open, open, close)).toBe('closed');
    expect(run('closed', close, close, open)).toBe('ready');
  });
});

describe('moveCursor', () => {
  it('should move down and wrap from the last to the first', () => {
    expect(moveCursor(0, 3, 'down')).toBe(1);
    expect(moveCursor(2, 3, 'down')).toBe(0);
  });

  it('should move up and wrap from the first to the last', () => {
    expect(moveCursor(2, 3, 'up')).toBe(1);
    expect(moveCursor(0, 3, 'up')).toBe(2);
  });

  it('should start at the first on down and at the last on up from no selection', () => {
    expect(moveCursor(-1, 3, 'down')).toBe(0);
    expect(moveCursor(-1, 3, 'up')).toBe(2);
  });

  it('should return -1 when there are no results', () => {
    expect(moveCursor(0, 0, 'down')).toBe(-1);
    expect(moveCursor(-1, 0, 'up')).toBe(-1);
  });
});

describe('selected', () => {
  it('should return the highlighted result, and nothing for cursor -1 or out of range', () => {
    expect(selected(['a', 'b'], 1)).toBe('b');
    expect(selected(['a', 'b'], -1)).toBeNull();
    expect(selected(['a', 'b'], 5)).toBeNull();
    expect(selected([], 0)).toBeNull();
  });
});
