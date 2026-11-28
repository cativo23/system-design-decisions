import { currentSection } from '../layout/toc.ts';

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

/** Which section to scroll to for `j` (next) or `k` (previous), or null to stay put (at either end, or nothing to move to). */
export function adjacentSection(sectionIds: string[], currentId: string | null, key: 'j' | 'k'): string | null {
  const index = currentId === null ? -1 : sectionIds.indexOf(currentId); // an unknown id counts as "above the first section"
  if (key === 'j') return sectionIds[index + 1] ?? null;
  return index > 0 ? sectionIds[index - 1] : null;
}

export interface SectionKeyContext {
  paletteOpen: boolean;
  isCard: boolean;
}

/** `j` or `k` when the reader means to move between sections of a card; null when the key belongs to something else. */
export function shouldHandleSectionKey(event: KeyInfo, active: ActiveInfo, context: SectionKeyContext): 'j' | 'k' | null {
  if (!context.isCard || context.paletteOpen) return null;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return null;
  if (active.editable || TEXT_FIELDS.has(active.tag.toLowerCase())) return null;
  const key = event.key.toLowerCase(); // CapsLock gives "J", which is still the reader's j
  return key === 'j' || key === 'k' ? key : null;
}

/**
 * The section the reader has reached, or null above the first heading. Normally the last heading past the reading line.
 * At the bottom of the page the last headings can never get that far, so what is on screen counts instead; otherwise
 * `j` could never reach the end of a card.
 */
export function reachedSection(tops: { id: string; top: number }[], line: number, atBottom: boolean, viewport: number): string | null {
  if (tops.length === 0) return null;
  if (atBottom) return [...tops].reverse().find((t) => t.top < viewport)?.id ?? null;
  return tops[0].top > line ? null : currentSection(tops, line);
}

