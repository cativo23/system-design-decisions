import type { CheckFailure } from './check-failure.ts';

// Parses the master topic list (contracts/topics-format.md). Everything that
// isn't a domain heading or a topic line is ignored.

export interface TopicEntry {
  id: string;
  title: string;
  domainNumber: number;
  state: 'pending' | 'drafting' | 'published';
}

const HEADING = /^## (\d{2}) · /;
const TOPIC = /^- \[([ ~x])\] `([a-z0-9]+(?:-[a-z0-9]+)*)`: (.*)$/;
const STATES = { ' ': 'pending', '~': 'drafting', x: 'published' } as const;

// The title ends at the first " · " or ". ", which drops markers like **MVP**.
function cutTitle(rest: string): string {
  const cuts = [rest.indexOf(' · '), rest.indexOf('. ')].filter((i) => i >= 0);
  return (cuts.length ? rest.slice(0, Math.min(...cuts)) : rest).trim();
}

export function parseTopics(markdown: string, file: string): { topics: TopicEntry[]; failures: CheckFailure[] } {
  const topics: TopicEntry[] = [];
  const failures: CheckFailure[] = [];
  const fail = (detail: string) => failures.push({ file, id: null, rule: 'topics-invalid', detail });
  const firstLineOf = new Map<string, number>();
  let sawHeading = false;
  // undefined after an out-of-range heading: its topics are checked but not registered.
  let domainNumber: number | undefined;
  let topicLines = 0;

  markdown.split('\n').forEach((line, index) => {
    const lineNo = index + 1;
    const heading = line.match(HEADING);
    if (heading) {
      sawHeading = true;
      const n = Number(heading[1]);
      domainNumber = n >= 1 && n <= 13 ? n : undefined;
      if (domainNumber === undefined) fail(`line ${lineNo}: domain number ${heading[1]} is outside 01–13`);
      return;
    }

    const topic = line.match(TOPIC);
    if (!topic) return;
    topicLines++;
    const [, mark, id, rest] = topic;

    const firstLine = firstLineOf.get(id);
    if (firstLine !== undefined) {
      fail(`line ${lineNo}: id "${id}" is already used on line ${firstLine}`);
      return;
    }
    firstLineOf.set(id, lineNo);

    if (!sawHeading) {
      fail(`line ${lineNo}: topic "${id}" appears before any domain heading`);
      return;
    }
    if (domainNumber === undefined) return;

    topics.push({ id, title: cutTitle(rest), domainNumber, state: STATES[mark as keyof typeof STATES] });
  });

  if (topicLines === 0) fail('no topic lines found');
  return { topics, failures };
}
