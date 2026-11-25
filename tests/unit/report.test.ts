import { describe, expect, it } from 'vitest';
import type { CheckFailure } from '../../src/lib/check-failure.ts';
import type { StaleEntry } from '../../src/lib/cards/staleness.ts';
import { formatMarkdownReport, formatReport } from '../../src/lib/cards/report.ts';

const FAILURES: CheckFailure[] = [
  { file: 'cards/b.mdx', id: 'b', rule: 'section-missing', detail: '"Pitfalls" is required' },
  { file: 'cards/a.mdx', id: null, rule: 'frontmatter-invalid', detail: 'bad YAML' },
  { file: 'cards/b.mdx', id: 'b', rule: 'metadata-invalid', detail: 'status "maybe" is not allowed' },
];

describe('formatReport: failures', () => {
  it('should print one line per failure, ordered by file then rule', () => {
    const lines = formatReport({ failures: FAILURES, cardCount: 3, stale: [], runMonth: '2026-11' }).split('\n');
    expect(lines.slice(0, 3)).toEqual([
      '✗ cards/a.mdx (?) frontmatter-invalid: bad YAML',
      '✗ cards/b.mdx (b) metadata-invalid: status "maybe" is not allowed',
      '✗ cards/b.mdx (b) section-missing: "Pitfalls" is required',
    ]);
  });

  it('should summarise failures and the number of cards they affect', () => {
    expect(formatReport({ failures: FAILURES, cardCount: 3, stale: [], runMonth: '2026-11' })).toContain('\n3 failure(s) in 2 card(s)');
  });

  it('should say how many cards are valid when there are no failures', () => {
    expect(formatReport({ failures: [], cardCount: 1, stale: [], runMonth: '2026-11' }).split('\n')[0]).toBe('✓ 1 card(s) valid');
  });
});

describe('formatMarkdownReport: failures', () => {
  it('should render failures as a Markdown list with the summary', () => {
    const md = formatMarkdownReport({ failures: FAILURES, cardCount: 3, stale: [], runMonth: '2026-11' });
    expect(md).toContain('- ✗ `cards/a.mdx` (`?`) **frontmatter-invalid**: bad YAML');
    expect(md).toContain('**3 failure(s) in 2 card(s)**');
  });

  it('should render the valid summary when there are no failures', () => {
    expect(formatMarkdownReport({ failures: [], cardCount: 2, stale: [], runMonth: '2026-11' })).toContain('✓ 2 card(s) valid');
  });
});

const STALE: StaleEntry[] = [
  { file: 'cards/old.mdx', id: 'old', reviewed: '2024-01', ageInMonths: 34 },
  { file: 'src/content/cards/saga.mdx', id: 'saga', reviewed: '2025-09', ageInMonths: 14 },
];

describe('formatReport: staleness', () => {
  it('should end with a staleness section listing one line per stale card', () => {
    const report = formatReport({ failures: [], cardCount: 2, stale: STALE, runMonth: '2026-11' });
    expect(report.split('\n').slice(-3)).toEqual([
      'Staleness report (run date 2026-11):',
      '  old  reviewed 2024-01  34 months old  cards/old.mdx',
      '  saga  reviewed 2025-09  14 months old  src/content/cards/saga.mdx',
    ]);
  });

  it('should say no cards need review when none are stale', () => {
    const report = formatReport({ failures: [], cardCount: 1, stale: [], runMonth: '2026-11' });
    expect(report.split('\n').at(-1)).toBe('Staleness report (run date 2026-11): no cards need review.');
  });

  it('should print the staleness section after the failures too', () => {
    const report = formatReport({ failures: FAILURES, cardCount: 3, stale: STALE, runMonth: '2026-11' });
    expect(report.indexOf('Staleness report')).toBeGreaterThan(report.indexOf('3 failure(s)'));
  });
});

describe('formatMarkdownReport: staleness', () => {
  it('should render stale cards as a Markdown table', () => {
    const md = formatMarkdownReport({ failures: [], cardCount: 2, stale: STALE, runMonth: '2026-11' });
    expect(md).toContain('### Staleness report (run date 2026-11)');
    expect(md).toContain('| saga | 2025-09 | 14 months | `src/content/cards/saga.mdx` |');
  });

  it('should say no cards need review when none are stale', () => {
    const md = formatMarkdownReport({ failures: [], cardCount: 1, stale: [], runMonth: '2026-11' });
    expect(md).toContain('No cards need review.');
  });
});
