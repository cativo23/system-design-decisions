// The palette's states and result cursor, with no DOM (data-model.md § PaletteState).

export type PaletteStatus = 'closed' | 'loading' | 'ready' | 'error';

export type PaletteEvent =
  | { type: 'open'; index: 'ready' | 'pending' | 'failed' }
  | { type: 'loaded' }
  | { type: 'failed' }
  | { type: 'close' };

const OPEN_AS = { ready: 'ready', pending: 'loading', failed: 'error' } as const;

export function nextPaletteState(state: PaletteStatus, event: PaletteEvent): PaletteStatus {
  if (event.type === 'close') return 'closed';
  if (event.type === 'open') return state === 'closed' ? OPEN_AS[event.index] : state;
  // The index settling only matters to a palette that is waiting for it.
  if (state !== 'loading') return state;
  return event.type === 'loaded' ? 'ready' : 'error';
}

/** Arrow keys: wraps at both ends; -1 means nothing highlighted (also the answer when there are no results). */
export function moveCursor(cursor: number, count: number, direction: 'down' | 'up'): number {
  if (count === 0) return -1;
  if (direction === 'down') return cursor < 0 ? 0 : (cursor + 1) % count;
  return cursor < 0 ? count - 1 : (cursor - 1 + count) % count;
}

/** What Enter opens: the highlighted result, or nothing. */
export function selected<T>(results: T[], cursor: number): T | null {
  return results[cursor] ?? null;
}
