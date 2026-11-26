import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../src/lib/layout/contrast.ts';

describe('contrastRatio', () => {
  it('should be 21 for white on black', () => expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5));
  it('should be symmetric', () => expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5));
  it('should match a known mid pair', () => {
    // #767676 on white is the classic 4.54:1 AA threshold grey.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});

function tokens(): Record<string, string> {
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  return Object.fromEntries([...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

// Composite a translucent rgba() over an opaque hex, returning a hex.
function over(value: string, base: string): string {
  const m = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return value;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  const b = rgb(base);
  const mixed = [m[1], m[2], m[3]].map((c, i) => Math.round(Number(c) * a + b[i] * (1 - a)));
  return '#' + mixed.map((n) => n.toString(16).padStart(2, '0')).join('');
}

describe('design tokens (SC-007, FR-025)', () => {
  const t = tokens();
  const solid = (name: string, base = t['--bg-raised']) => over(t[name], base);

  const TEXT = ['--fg', '--fg-muted', '--fg-faint', '--accent', '--run', '--info', '--warn', '--bad'];
  const SURFACES = ['--bg', '--bg-raised', '--bg-hover'];

  it.each(TEXT.flatMap((tok) => SURFACES.map((s) => [tok, s])))('should keep %s at 4.5:1 on %s', (tok, surface) => {
    expect(contrastRatio(solid(tok, t[surface]), solid(surface, t['--bg']))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEXT.filter((tok) => tok !== '--fg-faint'))('should keep %s at 4.5:1 on the status line colour', (tok) => {
    expect(contrastRatio(solid(tok), '#0b0c0f')).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['--ok', '--ok-soft'],
    ['--info', '--info-soft'],
    ['--warn', '--warn-soft'],
    ['--bad', '--bad-soft'],
  ])('should keep %s text at 4.5:1 on its %s tint over the raised surface', (fg, soft) => {
    const surface = solid(soft);
    expect(contrastRatio(solid(fg, surface), surface)).toBeGreaterThanOrEqual(4.5);
  });
});
