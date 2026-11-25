import type { CheckFailure } from '../check-failure.ts';
import type { StaleEntry } from './staleness.ts';

// Output format: contracts/validator-cli.md § Output.

export interface ReportInput {
  failures: CheckFailure[];
  cardCount: number;
  stale: StaleEntry[];
  /** YYYY-MM of the run date. */
  runMonth: string;
}

function sorted(failures: CheckFailure[]): CheckFailure[] {
  // Array.prototype.sort is stable, so failures with the same file and rule keep their order.
  return [...failures].sort((a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule));
}

function summary({ failures, cardCount }: ReportInput): string {
  if (failures.length === 0) return `✓ ${cardCount} card(s) valid`;
  const cards = new Set(failures.map((f) => f.file)).size;
  return `${failures.length} failure(s) in ${cards} card(s)`;
}

export function formatReport(input: ReportInput): string {
  const lines = sorted(input.failures).map((f) => `✗ ${f.file} (${f.id ?? '?'}) ${f.rule}: ${f.detail}`);
  const header = `Staleness report (run date ${input.runMonth}):`;
  const staleness = input.stale.length
    ? [header, ...input.stale.map((s) => `  ${s.id}  reviewed ${s.reviewed}  ${s.ageInMonths} months old  ${s.file}`)]
    : [`${header} no cards need review.`];
  return [...lines, summary(input), '', ...staleness].join('\n');
}

export function formatMarkdownReport(input: ReportInput): string {
  const lines = sorted(input.failures).map((f) => `- ✗ \`${f.file}\` (\`${f.id ?? '?'}\`) **${f.rule}**: ${f.detail}`);
  const total = input.failures.length === 0 ? summary(input) : `**${summary(input)}**`;
  const staleness = input.stale.length
    ? [
        '| card | reviewed | age | file |',
        '|---|---|---|---|',
        ...input.stale.map((s) => `| ${s.id} | ${s.reviewed} | ${s.ageInMonths} months | \`${s.file}\` |`),
      ]
    : ['No cards need review.'];
  return [
    '### Card checks',
    '',
    ...lines,
    ...(lines.length ? [''] : []),
    total,
    '',
    `### Staleness report (run date ${input.runMonth})`,
    '',
    ...staleness,
    '',
  ].join('\n');
}
