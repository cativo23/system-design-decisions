// Card validator CLI (contracts/validator-cli.md). A thin shell: it reads
// files, prints, and picks the exit code; the rules live in src/lib.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { parseCard } from '../src/lib/cards/parse-card.ts';
import { formatReport } from '../src/lib/cards/report.ts';
import { validateCards } from '../src/lib/cards/rules.ts';
import { parseTopics } from '../src/lib/topics.ts';

const USAGE = 'usage: node scripts/validate-cards.ts [--cards <dir>] [--topics <file>] [--today <YYYY-MM-DD>]';

function usageError(message: string): never {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

function readArgs() {
  try {
    const { values } = parseArgs({
      strict: true,
      options: {
        cards: { type: 'string', default: 'src/content/cards' },
        topics: { type: 'string', default: 'docs/TOPICS.md' },
        today: { type: 'string', default: new Date().toISOString().slice(0, 10) },
      },
    });
    return values;
  } catch (error) {
    return usageError((error as Error).message);
  }
}

const args = readArgs();
if (!/^\d{4}-\d{2}-\d{2}$/.test(args.today)) usageError(`--today must be YYYY-MM-DD, got "${args.today}"`);

let topicsSource: string;
let cardFiles: string[];
try {
  topicsSource = readFileSync(args.topics, 'utf8');
} catch {
  usageError(`cannot read topics file ${args.topics}`);
}
try {
  cardFiles = readdirSync(args.cards).filter((name) => name.endsWith('.mdx')).sort();
} catch {
  usageError(`cannot read cards directory ${args.cards}`);
}

const topics = parseTopics(topicsSource, args.topics);
const cards = cardFiles.map((name) => {
  const file = join(args.cards, name);
  return parseCard(file, readFileSync(file, 'utf8'));
});
const failures = [...topics.failures, ...validateCards(cards, topics.topics, args.today, args.cards)];

console.log(formatReport({ failures, cardCount: cards.length }));
process.exit(failures.length > 0 ? 1 : 0);
