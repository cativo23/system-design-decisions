import { describe, expect, it } from 'vitest';
import { TEMPLATE, tocEntries } from '../../src/lib/cards/template.ts';

describe('template', () => {
  it('should list the nine sections in template order', () => {
    expect(TEMPLATE.map((s) => s.title)).toEqual([
      'TL;DR',
      'Problem it solves',
      'How it works',
      'Use it when / Avoid it when',
      'Trade-offs',
      'In the wild',
      'Pitfalls',
      'Related',
      'Go deeper',
    ]);
  });

  it('should give each section its anchor id and TOC label', () => {
    expect(TEMPLATE.map((s) => [s.id, s.tocLabel])).toEqual([
      ['tldr', null],
      ['problem', 'problem'],
      ['how', 'how-it-works'],
      ['when', 'use-avoid'],
      ['tradeoffs', 'trade-offs'],
      ['wild', 'in-the-wild'],
      ['pitfalls', 'pitfalls'],
      ['related', 'related'],
      ['deeper', 'go-deeper'],
    ]);
  });

  it('should return the eight entries after TL;DR from tocEntries', () => {
    const entries = tocEntries();
    expect(entries).toHaveLength(8);
    expect(entries[0]).toEqual({ id: 'problem', label: 'problem' });
    expect(entries.at(-1)).toEqual({ id: 'deeper', label: 'go-deeper' });
  });
});
