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

  // The status line paints --fg-faint on #0b0c0f, so every text token is checked there, --fg-faint included.
  it.each(TEXT)('should keep %s at 4.5:1 on the status line colour', (tok) => {
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

  // ---- text the CSS draws with its own colour or opacity (T077) ----
  const readCss = (file: string) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); // comments would join the next selector
  const CSS = { card: readCss('src/styles/card.css'), shell: readCss('src/styles/shell.css') };
  const escape = (selector: string) => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** The value of `prop` in the first rule whose selector list contains `selector` exactly. */
  function declared(css: string, selector: string, prop: string): string {
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!m[1].split(',').some((sel) => sel.trim() === selector)) continue;
      const d = m[2].match(new RegExp(`(?:^|;|\\s)${escape(prop)}\\s*:\\s*([^;]+)`));
      if (d) return d[1].trim();
    }
    throw new Error(`no "${prop}" declared for ${selector}`);
  }
  const colour = (value: string, surface: string) => (value.startsWith('var(') ? solid(value.slice(4, -1), surface) : over(value, surface));

  it('should keep the diff text, signs and hunk header at 4.5:1 on their tints', () => {
    const raised = solid('--bg-raised');
    const use = over(declared(CSS.card, 'h3[data-kind="use"] + ul > li', 'background'), raised);
    const avoid = over(declared(CSS.card, 'h3[data-kind="avoid"] + ul > li', 'background'), raised);
    const hunk = over(declared(CSS.card, 'h3[data-kind]', 'background'), solid('--bg'));
    const checks: [string, string, string][] = [
      ['use text', colour(declared(CSS.card, 'h3[data-kind="use"] + ul > li', 'color'), use), use],
      ['use sign', colour(declared(CSS.card, 'h3[data-kind="use"] + ul > li::before', 'color'), use), use],
      ['avoid text', colour(declared(CSS.card, 'h3[data-kind="avoid"] + ul > li', 'color'), avoid), avoid],
      ['avoid sign', colour(declared(CSS.card, 'h3[data-kind="avoid"] + ul > li::before', 'color'), avoid), avoid],
      ['hunk header', colour(declared(CSS.card, 'h3[data-kind]', 'color'), hunk), hunk],
    ];
    for (const [what, fg, bg] of checks) expect(contrastRatio(fg, bg), what).toBeGreaterThanOrEqual(4.5);
  });

  // Text drawn with `opacity` below 1 is composited over its surface. A new opacity rule in the CSS
  // fails here until it is listed with the token it fades, so it cannot slip past the contrast check.
  const FADED_TEXT: Record<string, string> = {
    'h2 .hash': '--accent',
    '.cmdline .comment': '--warn',
  };

  it('should list every faded text rule in the CSS', () => {
    const found = Object.values(CSS).flatMap((css) =>
      [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter((m) => /(^|[;\s])opacity\s*:\s*0?\.\d+/.test(m[2]) && !m[1].includes('::') && !/@keyframes|transition/.test(m[1] + m[2]))
        .map((m) => m[1].trim()),
    );
    expect(found.sort()).toEqual(Object.keys(FADED_TEXT).sort());
  });

  it.each(Object.entries(FADED_TEXT))('should keep faded text %s (%s) at 4.5:1 on the page and raised surfaces', (selector, token) => {
    const css = CSS.card.includes(`${selector} {`) || CSS.card.includes(`${selector},`) ? CSS.card : CSS.shell;
    const opacity = Number(declared(css, selector, 'opacity'));
    for (const surface of ['--bg', '--bg-raised']) {
      const bg = solid(surface, t['--bg']);
      expect(contrastRatio(over(`rgba(${rgb(solid(token)).join(',')},${opacity})`, bg), bg), `${selector} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
