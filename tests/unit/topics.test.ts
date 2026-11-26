import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTopics } from '../../src/lib/topics.ts';

const SAMPLE = `# Topics

Intro text with \`[x]\` legend that must be ignored.

## 01 · Foundations
- [ ] \`quality-attributes\`: Quality attributes & trade-offs · **MVP**
- [~] \`back-of-envelope\`: Back-of-envelope estimation

## 05 · Distributed data & workflows
- [x] \`saga\`: Saga (2PC covered inside) · **MVP**. Draft content lives elsewhere
- [ ] \`durable-execution\`: Durable execution. Extra note

**Totals:** 4 cards
`;

function topicsInvalid(markdown: string) {
  return parseTopics(markdown, 'docs/TOPICS.md').failures;
}

describe('parseTopics', () => {
  it('should extract TopicEntry.id, title, domainNumber and state', () => {
    const { topics, failures } = parseTopics(SAMPLE, 'docs/TOPICS.md');
    expect(failures).toEqual([]);
    expect(topics).toEqual([
      { id: 'quality-attributes', title: 'Quality attributes & trade-offs', domainNumber: 1, state: 'pending' },
      { id: 'back-of-envelope', title: 'Back-of-envelope estimation', domainNumber: 1, state: 'drafting' },
      { id: 'saga', title: 'Saga (2PC covered inside)', domainNumber: 5, state: 'published' },
      { id: 'durable-execution', title: 'Durable execution', domainNumber: 5, state: 'pending' },
    ]);
  });

  it('should fail when there are no topic lines', () => {
    expect(topicsInvalid('# Topics\n\n## 01 · Foundations\n')).toEqual([
      { file: 'docs/TOPICS.md', id: null, rule: 'topics-invalid', detail: 'no topic lines found' },
    ]);
  });

  it('should fail on a duplicate id, naming both lines', () => {
    const md = '## 01 · Foundations\n- [ ] `a`: A\n- [ ] `a`: A again\n';
    expect(topicsInvalid(md)).toEqual([
      { file: 'docs/TOPICS.md', id: null, rule: 'topics-invalid', detail: 'line 3: id "a" is already used on line 2' },
    ]);
  });

  it('should fail on a topic line before any domain heading', () => {
    const md = '- [ ] `a`: A\n## 01 · Foundations\n- [ ] `b`: B\n';
    expect(topicsInvalid(md)).toEqual([
      { file: 'docs/TOPICS.md', id: null, rule: 'topics-invalid', detail: 'line 1: topic "a" appears before any domain heading' },
    ]);
  });

  it.each(['00', '14'])('should fail on domain heading number %s', (nn) => {
    const md = `## ${nn} · Nowhere\n- [ ] \`a\`: A\n`;
    expect(topicsInvalid(md)).toEqual([
      expect.objectContaining({ rule: 'topics-invalid', detail: `line 1: domain number ${nn} is outside 01–13` }),
    ]);
  });

  it('should report every parse error in one call', () => {
    const md = '- [ ] `a`: A\n## 14 · X\n- [ ] `b`: B\n- [ ] `b`: B\n';
    expect(topicsInvalid(md)).toHaveLength(3);
  });

  it('should parse the real docs/TOPICS.md without failures', () => {
    const markdown = readFileSync(new URL('../../docs/TOPICS.md', import.meta.url), 'utf8');
    const { topics, failures } = parseTopics(markdown, 'docs/TOPICS.md');
    expect(failures).toEqual([]);
    expect(topics).toContainEqual({ id: 'saga', title: 'Saga (2PC covered inside)', domainNumber: 5, state: expect.any(String) });
    const ids = topics.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['outbox-cdc', 'idempotency', 'durable-execution']));
  });
});
