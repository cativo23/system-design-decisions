import type { CheckFailure } from '../check-failure.ts';

// Output format: contracts/validator-cli.md § Output.

export interface ReportInput {
  failures: CheckFailure[];
  cardCount: number;
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
  return [...lines, summary(input)].join('\n');
}

export function formatMarkdownReport(input: ReportInput): string {
  const lines = sorted(input.failures).map((f) => `- ✗ \`${f.file}\` (\`${f.id ?? '?'}\`) **${f.rule}**: ${f.detail}`);
  const total = input.failures.length === 0 ? summary(input) : `**${summary(input)}**`;
  return ['### Card checks', '', ...lines, ...(lines.length ? [''] : []), total].join('\n');
}
