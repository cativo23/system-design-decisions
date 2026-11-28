import { describe, expect, it } from 'vitest';
import { adjacentSection, reachedSection, shouldHandleSectionKey, shouldOpenPalette, type KeyInfo } from '../../src/lib/discovery/keys.ts';

const key = (k: string, mods: Partial<KeyInfo> = {}): KeyInfo => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });
const body = { tag: 'body', editable: false };
const input = { tag: 'input', editable: false };

describe('shouldOpenPalette', () => {
  it('should open with Ctrl+K and with Cmd+K, either letter case', () => {
    expect(shouldOpenPalette(key('k', { ctrlKey: true }), body)).toBe(true);
    expect(shouldOpenPalette(key('K', { metaKey: true }), body)).toBe(true);
  });

  it('should open with Ctrl+K even when focus is in a text field', () => {
    expect(shouldOpenPalette(key('k', { ctrlKey: true }), input)).toBe(true);
  });

  it('should open with "/" when focus is not in an editable field', () => {
    expect(shouldOpenPalette(key('/'), body)).toBe(true);
    expect(shouldOpenPalette(key('/'), { tag: 'a', editable: false })).toBe(true);
  });

  it('should open with "/" typed with Shift (keyboards where it is Shift+7)', () => {
    expect(shouldOpenPalette(key('/', { shiftKey: true }), body)).toBe(true);
  });

  it.each(['input', 'textarea', 'select'])('should not open with "/" while focus is in a %s', (tag) => {
    expect(shouldOpenPalette(key('/'), { tag, editable: false })).toBe(false);
  });

  it('should not open with "/" in a contenteditable element', () => {
    expect(shouldOpenPalette(key('/'), { tag: 'div', editable: true })).toBe(false);
  });

  it('should leave "/" with Ctrl, Cmd or Alt to the browser', () => {
    expect(shouldOpenPalette(key('/', { ctrlKey: true }), body)).toBe(false);
    expect(shouldOpenPalette(key('/', { metaKey: true }), body)).toBe(false);
    expect(shouldOpenPalette(key('/', { altKey: true }), body)).toBe(false);
  });

  it('should leave other K combinations to the browser', () => {
    expect(shouldOpenPalette(key('k'), body)).toBe(false);
    expect(shouldOpenPalette(key('k', { ctrlKey: true, shiftKey: true }), body)).toBe(false);
    expect(shouldOpenPalette(key('k', { ctrlKey: true, altKey: true }), body)).toBe(false);
  });

  it('should ignore other keys', () => {
    expect(shouldOpenPalette(key('j', { ctrlKey: true }), body)).toBe(false);
    expect(shouldOpenPalette(key('a'), body)).toBe(false);
  });
});

describe('adjacentSection', () => {
  const ids = ['tldr', 'problem', 'how', 'use'];

  it('should go to the next section on j and the previous on k', () => {
    expect(adjacentSection(ids, 'problem', 'j')).toBe('how');
    expect(adjacentSection(ids, 'problem', 'k')).toBe('tldr');
  });

  it('should not move past the last section on j, nor before the first on k', () => {
    expect(adjacentSection(ids, 'use', 'j')).toBeNull();
    expect(adjacentSection(ids, 'tldr', 'k')).toBeNull();
  });

  it('should go to the first section on j when the page is above the first heading, and stay on k', () => {
    expect(adjacentSection(ids, null, 'j')).toBe('tldr');
    expect(adjacentSection(ids, null, 'k')).toBeNull();
  });

  it('should treat an id that is not in the list like no current section', () => {
    expect(adjacentSection(ids, 'gone', 'j')).toBe('tldr');
    expect(adjacentSection(ids, 'gone', 'k')).toBeNull();
  });

  it('should have nothing to move to when the page has no sections', () => {
    expect(adjacentSection([], null, 'j')).toBeNull();
    expect(adjacentSection([], 'x', 'k')).toBeNull();
  });
});

describe('shouldHandleSectionKey', () => {
  const card = { paletteOpen: false, isCard: true };

  it('should answer j and k on a card page, with CapsLock too', () => {
    expect(shouldHandleSectionKey(key('j'), body, card)).toBe('j');
    expect(shouldHandleSectionKey(key('k'), body, card)).toBe('k');
    expect(shouldHandleSectionKey(key('J'), body, card)).toBe('j');
  });

  it('should ignore them while the palette is open', () => {
    expect(shouldHandleSectionKey(key('j'), body, { ...card, paletteOpen: true })).toBeNull();
  });

  it.each(['input', 'textarea', 'select'])('should ignore them while focus is in a %s', (tag) => {
    expect(shouldHandleSectionKey(key('j'), { tag, editable: false }, card)).toBeNull();
  });

  it('should ignore them in a contenteditable element', () => {
    expect(shouldHandleSectionKey(key('k'), { tag: 'div', editable: true }, card)).toBeNull();
  });

  it('should leave j and k with Ctrl, Cmd, Alt or Shift to the browser', () => {
    for (const mod of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey'] as const) {
      expect(shouldHandleSectionKey(key('j', { [mod]: true }), body, card), mod).toBeNull();
    }
  });

  it('should do nothing on pages that are not a card', () => {
    expect(shouldHandleSectionKey(key('j'), body, { paletteOpen: false, isCard: false })).toBeNull();
  });

  it('should ignore other keys', () => {
    expect(shouldHandleSectionKey(key('l'), body, card)).toBeNull();
  });
});

describe('reachedSection', () => {
  const LINE = 200;
  const VIEWPORT = 900;
  const at = (...tops: number[]) => tops.map((top, i) => ({ id: `s${i + 1}`, top }));

  it('should be null above the first heading, whatever the table of contents highlights', () => {
    expect(reachedSection(at(450, 900, 1300), LINE, false, VIEWPORT)).toBeNull();
  });

  it('should be the last section whose heading has passed the reading line', () => {
    expect(reachedSection(at(-900, -300, 150, 600), LINE, false, VIEWPORT)).toBe('s3');
    expect(reachedSection(at(-900, -300, -50, 600), LINE, false, VIEWPORT)).toBe('s3');
  });

  it('should be null when the page has no sections', () => {
    expect(reachedSection([], LINE, false, VIEWPORT)).toBeNull();
    expect(reachedSection([], LINE, true, VIEWPORT)).toBeNull();
  });

  it('should count the last section on screen once the page cannot scroll further, so the end is reachable', () => {
    // The last two headings sit below the reading line even at the bottom of the page.
    expect(reachedSection(at(-1500, -900, -300, 224, 438), LINE, true, VIEWPORT)).toBe('s5');
  });

  it('should skip headings below the screen at the bottom of the page', () => {
    expect(reachedSection(at(-1500, -300, 224, 1200), LINE, true, VIEWPORT)).toBe('s3');
  });

  it('should be null at the bottom of a page whose headings are all below the screen', () => {
    expect(reachedSection(at(950, 1200), LINE, true, VIEWPORT)).toBeNull();
  });
});

