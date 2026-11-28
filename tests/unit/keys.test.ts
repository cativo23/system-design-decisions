import { describe, expect, it } from 'vitest';
import { shouldOpenPalette, type KeyInfo } from '../../src/lib/discovery/keys.ts';

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
