// Pure transitions for the phone menu (research.md R7, R8). Nothing here is stored.
export type MenuState = 'closed' | 'open';
export type MenuEvent = 'open' | 'close' | 'escape' | 'backdrop' | 'navigate';

export function nextMenuState(state: MenuState, event: MenuEvent): MenuState {
  if (event === 'open') return 'open';
  return state === 'open' ? 'closed' : state;
}

/** Focus trap: Tab and Shift+Tab wrap around the `count` focusable elements. */
export function nextFocusIndex(index: number, count: number, shift: boolean): number {
  if (count <= 0) return -1;
  return shift ? (index <= 0 ? count - 1 : index - 1) : index >= count - 1 ? 0 : index + 1;
}
