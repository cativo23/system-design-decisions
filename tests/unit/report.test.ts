import { describe, expect, it } from 'vitest';
import type { CheckFailure } from '../../src/lib/check-failure.ts';
import { formatMarkdownReport, formatReport } from '../../src/lib/cards/report.ts';

const FAILURES: CheckFailure[] = [
  { file: 'cards/b.mdx', id: 'b', rule: 'section-missing', detail: '"Pitfalls" is required' },
  { file: 'cards/a.mdx', id: null, rule: 'frontmatter-invalid', detail: 'bad YAML' },
  { file: 'cards/b.mdx', id: 'b', rule: 'metadata-invalid', detail: 'status "maybe" is not allowed' },
];

describe('formatReport: failures', () => {
  it('should print one line per failure, ordered by file then rule', () => {
    const lines = formatReport({ failures: FAILURES, cardCount: 3 }).split('\n');
    expect(lines.slice(0, 3)).toEqual([
      '✗ cards/a.mdx (?) frontmatter-invalid: bad YAML',
      '✗ cards/b.mdx (b) metadata-invalid: status "maybe" is not allowed',
      '✗ cards/b.mdx (b) section-missing: "Pitfalls" is required',
    ]);
  });

  it('should summarise failures and the number of cards they affect', () => {
    expect(formatReport({ failures: FAILURES, cardCount: 3 })).toContain('\n3 failure(s) in 2 card(s)');
  });

  it('should say how many cards are valid when there are no failures', () => {
    expect(formatReport({ failures: [], cardCount: 1 }).split('\n')[0]).toBe('✓ 1 card(s) valid');
  });
});

describe('formatMarkdownReport: failures', () => {
  it('should render failures as a Markdown list with the summary', () => {
    const md = formatMarkdownReport({ failures: FAILURES, cardCount: 3 });
    expect(md).toContain('- ✗ `cards/a.mdx` (`?`) **frontmatter-invalid**: bad YAML');
    expect(md).toContain('**3 failure(s) in 2 card(s)**');
  });

  it('should render the valid summary when there are no failures', () => {
    expect(formatMarkdownReport({ failures: [], cardCount: 2 })).toContain('✓ 2 card(s) valid');
  });
});
