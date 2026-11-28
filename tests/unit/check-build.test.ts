import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BUDGETS, checkPage, formatReport, measurePage } from '../../scripts/check-build.ts';

const ROBOTS = '<meta name="robots" content="noindex, nofollow">';
// The two CSS rules every page must carry (constitution V), and a structure that passes every check.
const RULES = '<style>[hidden]{display:none!important}@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style>';
const GOOD_BODY = '<a class="skip-link" href="#main">Skip to content</a><header></header><main id="main"><h1>Saga</h1></main>';

// `extra` is appended after the body, so size tests can pad a structurally valid page.
function page({ head = ROBOTS, body = GOOD_BODY, extra = '' } = {}) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">${head}${RULES}<title>Saga</title></head><body>${body}${extra}</body></html>`;
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
    expect(checkPage(page({ extra: inline }), {})).toEqual([expect.stringMatching(/^JavaScript is/)]);
  });

  it('should follow imports transitively so a shared chunk cannot hide bytes', () => {
    const assets = {
      '/_astro/a.js': Buffer.from('import"./b.js";console.log(1)'),
      '/_astro/b.js': Buffer.from(`import{x}from"./c.js";export const y=1`),
      '/_astro/c.js': noise(13000),
    };
    expect(checkPage(page({ head }), assets)).toEqual([expect.stringMatching(/^JavaScript is/)]);
  });

  it('should follow a dynamic import written with a template literal, as the bundler emits it', () => {
    const assets = {
      '/_astro/a.js': Buffer.from('window.requestIdleCallback(()=>import(`./b.js`))'),
      '/_astro/b.js': noise(13000),
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
    const base = page();
    const filler = (n: number) => page({ extra: 'x'.repeat(n) });
    expect(checkPage(filler(51200 - base.length), {})).toEqual([]);
    expect(checkPage(filler(51201 - base.length), {})).toEqual([expect.stringMatching(/HTML is 51201 bytes \(budget 51200\)/)]);
  });

  it('should count HTML size in bytes, not characters', () => {
    const base = page();
    // "✓" is 3 bytes in UTF-8.
    expect(checkPage(page({ extra: '✓'.repeat(Math.ceil((51201 - base.length) / 3)) }), {})).toEqual([
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
    const html = page({ head, extra: noise(33_000).toString('base64') });
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
    expect(checkPage(page({ extra: '<a href="https://microservices.io/">microservices.io</a>' }), {})).toEqual([]);
  });

  it('should report every problem at once', () => {
    const problems = checkPage(page({ head: '', extra: '<img src="https://x.example/a.png" alt="">' }), {});
    expect(problems).toHaveLength(2);
    expect(problems).toContainEqual(expect.stringMatching(/another origin/));
    expect(problems).toContainEqual(expect.stringMatching(/robots/));
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

describe('checkPage: structure (contracts/build-budget.md § Structure checks)', () => {
  const problems = (html: string, opts?: { index?: boolean }) => checkPage(html, {}, opts);

  it('should pass a page with the full structure', () => {
    expect(problems(page())).toEqual([]);
  });

  it.each([
    ['no <h1>', '<a href="#main">Skip</a><header></header><main id="main"></main>', /exactly one <h1>.*found 0/],
    ['two <h1>', GOOD_BODY.replace('</main>', '<h1>Two</h1></main>'), /exactly one <h1>.*found 2/],
  ])('should fail for %s', (_, body, expected) => {
    expect(problems(page({ body }))).toEqual([expect.stringMatching(expected)]);
  });

  it('should fail when the first link is not the skip link', () => {
    const body = '<a href="/">Home</a>' + GOOD_BODY;
    expect(problems(page({ body }))).toEqual([expect.stringMatching(/skip link/)]);
  });

  it('should fail when there is no skip link at all', () => {
    const body = '<header></header><main id="main"><h1>Saga</h1></main>';
    expect(problems(page({ body }))).toEqual([expect.stringMatching(/skip link/)]);
  });

  it('should fail when nothing has id="main"', () => {
    const body = '<a href="#main">Skip</a><header></header><main><h1>Saga</h1></main>';
    expect(problems(page({ body }))).toEqual([expect.stringMatching(/id="main"/)]);
  });

  it('should fail without a <header> or a <main>', () => {
    expect(problems(page({ body: GOOD_BODY.replace('<header></header>', '') }))).toEqual([expect.stringMatching(/<header>/)]);
    expect(problems(page({ body: GOOD_BODY.replace('<main id="main">', '<div id="main">').replace('</main>', '</div>') }))).toEqual([
      expect.stringMatching(/<main>/),
    ]);
  });

  it.each(['nav', 'aside'])('should fail for a <%s> without an aria-label', (tag) => {
    const bad = page({ extra: `<${tag}></${tag}>` });
    expect(problems(bad)).toEqual([expect.stringMatching(new RegExp(`<${tag}>.*aria-label`))]);
    expect(problems(page({ extra: `<${tag} aria-label="x"></${tag}>` }))).toEqual([]);
  });

  it('should fail when the CSS lacks the [hidden] rule', () => {
    const html = page().replace('[hidden]{display:none!important}', '');
    expect(problems(html)).toEqual([expect.stringMatching(/\[hidden\]/)]);
  });

  it('should fail when [hidden] is not display:none !important', () => {
    const html = page().replace('display:none!important}@media', 'display:none}@media');
    expect(problems(html)).toEqual([expect.stringMatching(/\[hidden\]/)]);
  });

  it('should fail without a prefers-reduced-motion block that zeroes animation and transition', () => {
    expect(problems(page().replace('animation:none!important;', ''))).toEqual([expect.stringMatching(/reduced-motion/)]);
    expect(problems(page().replace('transition:none!important', ''))).toEqual([expect.stringMatching(/reduced-motion/)]);
    expect(problems(page().replace('@media (prefers-reduced-motion:reduce)', '@media print'))).toEqual([expect.stringMatching(/reduced-motion/)]);
  });

  it('should read the CSS rules from a linked stylesheet too', () => {
    const html = page().replace(RULES, '<link rel="stylesheet" href="/_astro/a.css">');
    const css = '[hidden]{display:none !important}@media (prefers-reduced-motion: reduce){*,*::before{animation:none !important;transition:none !important}}';
    expect(checkPage(html, { '/_astro/a.css': css })).toEqual([]);
  });

  it('should exempt the index page from the skip link and landmark checks only', () => {
    const body = '<main><h1>Systems Field Guide</h1></main>';
    expect(problems(page({ body }), { index: true })).toEqual([]);
    expect(problems(page({ body: '<main></main>' }), { index: true })).toEqual([expect.stringMatching(/<h1>/)]);
    expect(problems(page({ body }).replace('[hidden]{display:none!important}', ''), { index: true })).toEqual([expect.stringMatching(/\[hidden\]/)]);
  });
});

describe('checkPage: search palette on shell pages (contracts/build-budget.md § Structure checks)', () => {
  // A "shell page" is one with the top bar; the Phase 1 index has none and is skipped until the home replaces it.
  const TRIGGER = '<button type="button" class="search" data-open-palette aria-label="Search"></button>';
  const DIALOG = '<dialog id="palette"></dialog>';
  const shell = (parts: { trigger?: string; dialog?: string } = {}) => {
    const { trigger = TRIGGER, dialog = DIALOG } = parts;
    const body = `<a class="skip-link" href="#main">Skip to content</a><header class="topbar">${trigger}</header>${dialog}<main id="main"><h1>Saga</h1></main>`;
    return page({ body });
  };

  it('should pass a shell page with a live trigger and one palette dialog', () => {
    expect(checkPage(shell(), {})).toEqual([]);
  });

  it('should fail when the search trigger is aria-disabled', () => {
    expect(checkPage(shell({ trigger: TRIGGER.replace('<button ', '<button aria-disabled="true" ') }), {})).toEqual([expect.stringMatching(/search trigger/)]);
  });

  it('should fail when the search trigger is missing', () => {
    expect(checkPage(shell({ trigger: '' }), {})).toEqual([expect.stringMatching(/search trigger/)]);
  });

  it('should fail when the trigger is not a <button>', () => {
    expect(checkPage(shell({ trigger: '<a class="search" href="#">Search</a>' }), {})).toEqual([expect.stringMatching(/search trigger/)]);
  });

  it('should fail when the palette dialog is missing, and when there are two', () => {
    expect(checkPage(shell({ dialog: '' }), {})).toEqual([expect.stringMatching(/exactly one <dialog id="palette">.*found 0/)]);
    expect(checkPage(shell({ dialog: DIALOG + DIALOG }), {})).toEqual([expect.stringMatching(/exactly one <dialog id="palette">.*found 2/)]);
  });

  it('should not ask a page without the top bar for the palette', () => {
    expect(checkPage(page(), {})).toEqual([]);
  });
});

