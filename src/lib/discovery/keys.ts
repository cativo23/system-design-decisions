// Keyboard decisions as pure functions; src/scripts/shell.ts only reads the event and acts on the answer.

export interface KeyInfo {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** The focused element, reduced to what the decision needs. */
export interface ActiveInfo {
  tag: string;
  editable: boolean;
}

const TEXT_FIELDS = new Set(['input', 'textarea', 'select']);

/** Ctrl/Cmd+K from anywhere; "/" only when the reader is not typing. Other combinations belong to the browser. */
export function shouldOpenPalette(event: KeyInfo, active: ActiveInfo): boolean {
  if (event.key.toLowerCase() === 'k') return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
  if (event.key === '/') {
    // Shift is allowed: on some keyboard layouts "/" is Shift+7.
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    return !active.editable && !TEXT_FIELDS.has(active.tag.toLowerCase());
  }
  return false;
}
