import { describe, expect, it } from 'vitest';
import { checkPage } from '../../scripts/check-build.ts';

const ROBOTS = '<meta name="robots" content="noindex, nofollow">';

function page({ head = ROBOTS, body = '<h1>Saga</h1>' } = {}) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">${head}<title>Saga</title></head><body>${body}</body></html>`;
}

describe('checkPage', () => {
  it('should return [] for a clean page', () => {
    expect(checkPage(page(), {})).toEqual([]);
  });

  it('should fail on an inline <script>', () => {
    const problems = checkPage(page({ body: '<script>console.log(1)</script>' }), {});
    expect(problems).toEqual([expect.stringMatching(/script/i)]);
  });

  it('should fail on an external <script src>', () => {
    const problems = checkPage(page({ head: `${ROBOTS}<script type="module" src="/_astro/a.js"></script>` }), {});
    expect(problems).toEqual([expect.stringMatching(/script/i)]);
  });

  it('should fail when same-origin CSS (linked + inline) exceeds 2048 bytes', () => {
    const head = `${ROBOTS}<link rel="stylesheet" href="/_astro/a.css"><style>${'a'.repeat(100)}</style>`;
    expect(checkPage(page({ head }), { '/_astro/a.css': 1948 })).toEqual([]);
    expect(checkPage(page({ head }), { '/_astro/a.css': 1949 })).toEqual([expect.stringMatching(/CSS.*2049.*2048/)]);
  });

  it('should fail when a linked stylesheet is not in the build output', () => {
    const head = `${ROBOTS}<link rel="stylesheet" href="/_astro/missing.css">`;
    expect(checkPage(page({ head }), {})).toEqual([expect.stringMatching(/\/_astro\/missing\.css/)]);
  });

  it('should fail when the HTML document exceeds 51200 bytes', () => {
    const base = page({ body: '' });
    const filler = (n: number) => page({ body: 'x'.repeat(n) });
    expect(checkPage(filler(51200 - base.length), {})).toEqual([]);
    expect(checkPage(filler(51201 - base.length), {})).toEqual([expect.stringMatching(/HTML.*51201.*51200/)]);
  });

  it('should count HTML size in bytes, not characters', () => {
    const base = page({ body: '' });
    // "✓" is 3 bytes in UTF-8.
    expect(checkPage(page({ body: '✓'.repeat(Math.ceil((51201 - base.length) / 3)) }), {})).toEqual([
      expect.stringMatching(/HTML/),
    ]);
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

  it.each([
    ['a stylesheet', '<link rel="stylesheet" href="https://cdn.example.com/a.css">'],
    ['a font', '<link rel="preload" as="font" href="https://fonts.example.com/a.woff2" crossorigin>'],
    ['an image', '<img src="https://img.example.com/a.png" alt="">'],
    ['a protocol-relative image', '<img src="//img.example.com/a.png" alt="">'],
    ['an inline style url()', '<style>@font-face{src:url(https://fonts.example.com/a.woff2)}</style>'],
  ])('should fail on %s from another origin', (_, tag) => {
    expect(checkPage(page({ head: `${ROBOTS}${tag}` }), { '/_astro/a.css': 0 })).toContainEqual(
      expect.stringMatching(/another origin/),
    );
  });

  it('should allow plain links to other sites (they are navigation, not page resources)', () => {
    expect(checkPage(page({ body: '<a href="https://microservices.io/">microservices.io</a>' }), {})).toEqual([]);
  });

  it('should report every problem at once', () => {
    expect(checkPage(page({ head: '<script>1</script>' }), {})).toHaveLength(2);
  });
});
