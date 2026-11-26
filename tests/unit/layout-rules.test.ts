import { describe, expect, it } from 'vitest';
import type { Section } from '../../src/lib/cards/parse-card.ts';
import { layoutFailures } from '../../src/lib/cards/layout-rules.ts';

// Each case builds one section from inline text and asserts the layout rules (contracts/card-format.md).
function run(title: string, body: string) {
  const lines = body.split('\n');
  const section: Section = { title, line: 1, lines, empty: body.trim() === '' };
  return layoutFailures([section]);
}

const codes = (title: string, body: string) => run(title, body).map((f) => f.rule);

describe('tldr-shape', () => {
  it('should accept exactly one paragraph', () => {
    expect(run('TL;DR', '\nOne paragraph\nover two lines.\n')).toEqual([]);
  });

  it('should reject two paragraphs and name the count', () => {
    const [f] = run('TL;DR', '\nFirst.\n\nSecond.\n');
    expect(f).toEqual({ rule: 'tldr-shape', detail: expect.stringContaining('2 paragraphs') });
  });

  it('should skip an empty section, which section-empty already reports', () => {
    expect(run('TL;DR', '\n\n')).toEqual([]);
  });
});

describe('use-avoid-shape', () => {
  const ok = '\n### Use it when\n\n- a\n\n### Avoid it when\n\n- b\n';
  const title = 'Use it when / Avoid it when';

  it('should accept the two headings, each with a bullet', () => {
    expect(run(title, ok)).toEqual([]);
  });

  it.each([
    ['missing Use', '\n### Avoid it when\n\n- b\n', /Use it when/],
    ['missing Avoid', '\n### Use it when\n\n- a\n', /Avoid it when/],
    ['wrong order', '\n### Avoid it when\n\n- b\n\n### Use it when\n\n- a\n', /order/],
    ['heading with no bullet', '\n### Use it when\n\n### Avoid it when\n\n- b\n', /Use it when.*bullet/],
    ['extra heading', `${ok}\n### Also\n\n- c\n`, /Also/],
  ])('should reject %s', (_, body, detail) => {
    expect(run(title, body)).toEqual([{ rule: 'use-avoid-shape', detail: expect.stringMatching(detail) }]);
  });
});

describe('trade-offs rules', () => {
  const head = '| dimension | saga | 2PC |\n|---|---|---|\n';
  const row = (a: string, b: string) => `| cost | ${a} | ${b} |\n`;

  it('should accept a three-column table with meters at the start of each value cell', () => {
    expect(run('Trade-offs', head + row('<Meter n={3} /> Light', '<Meter n={0} /> Heavy'))).toEqual([]);
  });

  it('should report tradeoffs-shape with the column count', () => {
    const body = '| dimension | saga |\n|---|---|\n| cost | <Meter n={1} /> x |\n';
    expect(run('Trade-offs', body)).toEqual([{ rule: 'tradeoffs-shape', detail: expect.stringContaining('2 columns') }]);
  });

  it('should report meter-missing naming the row and the column', () => {
    const body = head + row('<Meter n={3} /> Light', 'Heavy');
    expect(run('Trade-offs', body)).toEqual([
      { rule: 'meter-missing', detail: expect.stringMatching(/cost.*2PC/) },
    ]);
  });

  it.each(['7', '-1', '2.5', '"x"'])('should report meter-range for n={%s}, naming the value', (n) => {
    const [f] = run('Trade-offs', head + row(`<Meter n={${n}} /> Light`, '<Meter n={1} /> Heavy'));
    expect(f).toEqual({ rule: 'meter-range', detail: expect.stringContaining(n) });
    expect(f.detail).toMatch(/cost.*saga/);
  });

  it('should not require meters on the header row', () => {
    expect(codes('Trade-offs', head + row('<Meter n={1} /> a', '<Meter n={2} /> b'))).toEqual([]);
  });

  it('should return every failure in the section together', () => {
    const body = head + row('Light', 'Heavy');
    expect(codes('Trade-offs', body)).toEqual(['meter-missing', 'meter-missing']);
  });
});

describe('wild-entry-malformed', () => {
  it('should accept directory-form names with a description', () => {
    expect(run('In the wild', '\n- **aws-step-functions** managed orchestration\n- **node.js** runtime\n')).toEqual([]);
  });

  it.each([
    ['an uppercase name', '- **Temporal** durable execution'],
    ['a name with spaces', '- **AWS Step Functions** orchestration'],
    ['a missing description', '- **temporal**'],
    ['no bold name', '- temporal durable execution'],
  ])('should reject %s and name the line', (_, line) => {
    expect(run('In the wild', `\n${line}\n`)).toEqual([{ rule: 'wild-entry-malformed', detail: expect.stringContaining(line) }]);
  });

  it('should reject a section with no bullet', () => {
    expect(codes('In the wild', '\nJust prose.\n')).toEqual(['wild-entry-malformed']);
  });
});

describe('pitfall-malformed', () => {
  const ok = '\n<Pitfall title="Not idempotent">\nA message delivered twice charges twice.\n</Pitfall>\n';

  it('should accept one well-formed pitfall', () => {
    expect(run('Pitfalls', ok)).toEqual([]);
  });

  it.each([
    ['a blank title', '\n<Pitfall title=" ">\nBody\n</Pitfall>\n'],
    ['a missing title', '\n<Pitfall>\nBody\n</Pitfall>\n'],
    ['an empty body', '\n<Pitfall title="T">\n\n</Pitfall>\n'],
  ])('should reject %s', (_, body) => {
    expect(codes('Pitfalls', body)).toEqual(['pitfall-malformed']);
  });

  it('should reject a section with no pitfall', () => {
    expect(codes('Pitfalls', '\n- **old style.** text\n')).toEqual(['pitfall-malformed']);
  });

  it('should reject stray content between pitfalls and name the line', () => {
    const [f] = run('Pitfalls', `${ok}\nstray text\n`);
    expect(f).toEqual({ rule: 'pitfall-malformed', detail: expect.stringContaining('stray text') });
  });
});

describe('source-malformed', () => {
  const good = '- <Source kind="paper" href="https://example.org/a.pdf">A paper (1987)</Source>';

  it('should accept well-formed sources', () => {
    expect(run('Go deeper', `\n${good}\n- <Source kind="guide" href="https://example.org/g">Guide</Source>\n`)).toEqual([]);
  });

  it.each([
    ['no kind', '- <Source href="https://example.org/a">T</Source>'],
    ['a blank title', '- <Source kind="paper" href="https://example.org/a"> </Source>'],
    ['an http href', '- <Source kind="paper" href="http://example.org/a">T</Source>'],
    ['the old link form', '- [paper] [T](https://example.org/a)'],
  ])('should reject %s and name the line', (_, line) => {
    expect(run('Go deeper', `\n${line}\n`)).toEqual([{ rule: 'source-malformed', detail: expect.stringContaining(line) }]);
  });

  it('should reject a section with no source', () => {
    expect(codes('Go deeper', '\nSee elsewhere.\n')).toEqual(['source-malformed']);
  });
});
