import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BUDGETS, checkPage, formatReport, measurePage } from '../../scripts/check-build.ts';

const ROBOTS = '<meta name="robots" content="noindex, nofollow">';

function page({ head = ROBOTS, body = '<h1>Saga</h1>' } = {}) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">${head}<title>Saga</title></head><body>${body}</body></html>`;
}

// Incompressible bytes, so the gzip size is about the byte count.
const noise = (n: number) => randomBytes(n);

describe('checkPage: basics', () => {
  it('should return [] for a clean page', () => {
    expect(checkPage(page(), {})).toEqual([]);
  });

  it('should fail when the robots meta tag is missing', () => {
    expect(checkPage(page({ head: '' }), {})).toEqual([expect.stringMatching(/robots/)]);
  });

  it('should fail when the robots meta tag lacks noindex', () => {
    expect(checkPage(page({ head: '<meta name="robots" content="nofollow">' }), {})).toEqual([
      expect.stringMatching(/robots/),
    ]);
  });

  it('should accept the robots meta with attributes in any order', () => {
    expect(checkPage(page({ head: '<meta content="noindex, nofollow" name="robots">' }), {})).toEqual([]);
  });

  it('should fail when a linked stylesheet is not in the build output', () => {
    const head = `${ROBOTS}<link rel="stylesheet" href="/_astro/missing.css">`;
    expect(checkPage(page({ head }), {})).toEqual([expect.stringMatching(/\/_astro\/missing\.css/)]);
  });

  it('should fail when a same-origin script is not in the build output', () => {
    const head = `${ROBOTS}<script type="module" src="/_astro/missing.js"></script>`;
    expect(checkPage(page({ head }), {})).toEqual([expect.stringMatching(/\/_astro\/missing\.js/)]);
  });
});

describe('checkPage: JavaScript budget (gzip ≤ 12 KB)', () => {
  const js = (n: number) => ({ '/_astro/a.js': noise(n) });
  const head = `${ROBOTS}<script type="module" src="/_astro/a.js"></script>`;

  it('should allow a page with a script under budget', () => {
    expect(checkPage(page({ head }), js(4000))).toEqual([]);
  });

  it('should fail when external JS exceeds the budget, in the documented message shape', () => {
    expect(checkPage(page({ head }), js(13000))).toEqual([
      expect.stringMatching(new RegExp(`^JavaScript is \\d+ bytes \\(budget ${BUDGETS.js}\\)$`)),
    ]);
  });

  it('should count inline scripts', () => {
    const inline = `<script>${noise(13000).toString('base64')}</script>`;
    expect(checkPage(page({ body: inline }), {})).toEqual([expect.stringMatching(/^JavaScript is/)]);
  });

  it('should follow imports transitively so a shared chunk cannot hide bytes', () => {
    const assets = {
      '/_astro/a.js': Buffer.from('import"./b.js";console.log(1)'),
      '/_astro/b.js': Buffer.from(`import{x}from"./c.js";export const y=1`),
      '/_astro/c.js': noise(13000),
    };
    expect(checkPage(page({ head }), assets)).toEqual([expect.stringMatching(/^JavaScript is/)]);
  });

  it('should count a chunk once even when imported twice', () => {
    const assets = {
      '/_astro/a.js': Buffer.from('import"./c.js";import"./b.js"'),
      '/_astro/b.js': Buffer.from('import"./c.js"'),
      '/_astro/c.js': noise(7000),
    };
    expect(checkPage(page({ head }), assets)).toEqual([]);
  });

  it('should fail on a script from another origin', () => {
    const h = `${ROBOTS}<script type="module" src="https://cdn.example.com/a.js"></script>`;
    expect(checkPage(page({ head: h }), {})).toContainEqual(expect.stringMatching(/another origin/));
  });
});

describe('checkPage: CSS budget (gzip ≤ 8 KB)', () => {
  const head = `${ROBOTS}<link rel="stylesheet" href="/_astro/a.css">`;

  it('should pass under budget', () => {
    expect(checkPage(page({ head }), { '/_astro/a.css': noise(3000) })).toEqual([]);
  });

  it('should fail over budget, linked and inline counted together', () => {
    const inline = `<style>${noise(5000).toString('base64')}</style>`;
    const problems = checkPage(page({ head: head + inline }), { '/_astro/a.css': noise(5000) });
    expect(problems).toEqual([expect.stringMatching(new RegExp(`^CSS is \\d+ bytes \\(budget ${BUDGETS.css}\\)$`))]);
  });
});

describe('checkPage: font budget (woff2 ≤ 110 KB)', () => {
  const fontCss = (n: number) => `@font-face{font-family:x;src:url(/_astro/fonts/${n}.woff2) format("woff2")}`;

  it('should measure woff2 files referenced by inline CSS', () => {
    const head = `${ROBOTS}<style>${fontCss(1)}${fontCss(2)}</style>`;
    const ok = { '/_astro/fonts/1.woff2': Buffer.alloc(50_000), '/_astro/fonts/2.woff2': Buffer.alloc(50_000) };
    expect(checkPage(page({ head }), ok)).toEqual([]);
    const over = { ...ok, '/_astro/fonts/2.woff2': Buffer.alloc(70_000) };
    expect(checkPage(page({ head }), over)).toEqual([
      expect.stringMatching(new RegExp(`^Fonts is 120000 bytes \\(budget ${BUDGETS.fonts}\\)$`)),
    ]);
  });

  it('should measure woff2 files referenced by a linked stylesheet', () => {
    const head = `${ROBOTS}<link rel="stylesheet" href="/_astro/a.css">`;
    const assets = { '/_astro/a.css': Buffer.from(fontCss(1)), '/_astro/fonts/1.woff2': Buffer.alloc(120_000) };
    expect(checkPage(page({ head }), assets)).toEqual([expect.stringMatching(/^Fonts is 120000/)]);
  });

  it('should fail when a referenced font is not in the build output', () => {
    const head = `${ROBOTS}<style>${fontCss(9)}</style>`;
    expect(checkPage(page({ head }), {})).toEqual([expect.stringMatching(/fonts\/9\.woff2/)]);
  });

  it('should count a font once even when two rules reference it', () => {
    const head = `${ROBOTS}<style>${fontCss(1)}${fontCss(1)}</style>`;
    expect(checkPage(page({ head }), { '/_astro/fonts/1.woff2': Buffer.alloc(100_000) })).toEqual([]);
  });
});

describe('checkPage: HTML and whole-page budgets', () => {
  it('should fail when the HTML document exceeds 51200 bytes raw', () => {
    const base = page({ body: '' });
    const filler = (n: number) => page({ body: 'x'.repeat(n) });
    expect(checkPage(filler(51200 - base.length), {})).toEqual([]);
    expect(checkPage(filler(51201 - base.length), {})).toEqual([expect.stringMatching(/HTML is 51201 bytes \(budget 51200\)/)]);
  });

  it('should count HTML size in bytes, not characters', () => {
    const base = page({ body: '' });
    // "✓" is 3 bytes in UTF-8.
    expect(checkPage(page({ body: '✓'.repeat(Math.ceil((51201 - base.length) / 3)) }), {})).toEqual([
      expect.stringMatching(/HTML/),
    ]);
  });

  it('should fail when the whole page exceeds 150 KB transferred', () => {
    // Each part is under its own budget: JS 11 KB, CSS 7 KB, fonts 108 KB, HTML ~33 KB gzipped.
    const head = `${ROBOTS}<script type="module" src="/_astro/a.js"></script><link rel="stylesheet" href="/_astro/a.css">`;
    const css = `@font-face{src:url(/_astro/fonts/1.woff2)}` + noise(6500).toString('latin1');
    const assets = {
      '/_astro/a.js': noise(11000),
      '/_astro/a.css': Buffer.from(css, 'latin1'),
      '/_astro/fonts/1.woff2': Buffer.alloc(108_000),
    };
    const html = page({ head, body: noise(33_000).toString('base64') });
    const problems = checkPage(html, assets);
    expect(problems).toEqual([expect.stringMatching(new RegExp(`^Page is \\d+ bytes \\(budget ${BUDGETS.page}\\)$`))]);
  });
});

describe('checkPage: third-party origins', () => {
  it.each([
    ['a stylesheet', '<link rel="stylesheet" href="https://cdn.example.com/a.css">'],
    ['a font', '<link rel="preload" as="font" href="https://fonts.example.com/a.woff2" crossorigin>'],
    ['an image', '<img src="https://img.example.com/a.png" alt="">'],
    ['a protocol-relative image', '<img src="//img.example.com/a.png" alt="">'],
    ['an inline style url()', '<style>@font-face{src:url(https://fonts.example.com/a.woff2)}</style>'],
  ])('should fail on %s from another origin', (_, tag) => {
    expect(checkPage(page({ head: `${ROBOTS}${tag}` }), {})).toContainEqual(expect.stringMatching(/another origin/));
  });

  it('should allow plain links to other sites (they are navigation, not page resources)', () => {
    expect(checkPage(page({ body: '<a href="https://microservices.io/">microservices.io</a>' }), {})).toEqual([]);
  });

  it('should report every problem at once', () => {
    expect(checkPage(page({ head: '', body: '<img src="https://x.example/a.png" alt="">' }), {})).toHaveLength(2);
  });
});

describe('measurePage and formatReport', () => {
  it('should measure js, css, fonts, html and the total for a page', () => {
    const head = `${ROBOTS}<style>@font-face{src:url(/_astro/fonts/1.woff2)}</style><script type="module" src="/_astro/a.js"></script>`;
    const sizes = measurePage(page({ head }), {
      '/_astro/a.js': Buffer.from('console.log(1)'),
      '/_astro/fonts/1.woff2': Buffer.alloc(1000),
    });
    expect(sizes.fonts).toBe(1000);
    expect(sizes.js).toBeGreaterThan(0);
    expect(sizes.css).toBeGreaterThan(0);
    expect(sizes.html).toBe(Buffer.byteLength(page({ head })));
    expect(sizes.page).toBeGreaterThanOrEqual(sizes.fonts + sizes.js + sizes.css);
  });

  it('should format one row per page with the budgets in the header', () => {
    const out = formatReport([{ file: 'cards/saga/index.html', js: 5700, css: 4000, fonts: 101860, html: 30000, page: 120000 }]);
    expect(out).toContain('cards/saga/index.html');
    expect(out).toContain('5700');
    expect(out).toContain('101860');
    expect(out.split('\n')[0]).toMatch(/js.*css.*fonts.*html.*page/i);
  });
});
