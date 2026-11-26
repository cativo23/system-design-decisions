import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// A larger default text size in the browser only reaches text sized in rem (WCAG 1.4.4), so no
// font declaration may use px. The two layout sizes tied to text (status line, side columns) follow.
const FILES = readdirSync('src/styles').filter((f) => f.endsWith('.css'));
const css = (file: string) => readFileSync(`src/styles/${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('font units', () => {
  it.each(FILES)('should size text in rem, not px, in %s', (file) => {
    const offenders = [...css(file).matchAll(/(?:^|[;{\s])(font(?:-size)?)\s*:\s*([^;}]+)/g)]
      .filter((m) => /\d(\.\d+)?px/.test(m[2]))
      .map((m) => `${m[1]}: ${m[2].trim()}`);
    expect(offenders).toEqual([]);
  });

  it('should size the status line and the side columns in rem so larger text does not clip them', () => {
    const shell = css('shell.css');
    expect(shell).toMatch(/\.statusline\s*\{[^}]*height:\s*calc\(1\.75rem/);
    expect(shell).toMatch(/grid-template-columns:\s*16\.25rem minmax\(0, 1fr\) 13\.125rem/);
  });
});
