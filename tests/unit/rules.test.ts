import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCard } from '../../src/lib/cards/parse-card.ts';
import { TEMPLATE_SECTIONS, validateCards } from '../../src/lib/cards/rules.ts';
import { parseTopics } from '../../src/lib/topics.ts';

// Per-card rules. Each test mutates the valid fixture card exactly once.
const FIXTURES = new URL('../fixtures/valid/', import.meta.url);
const VALID = readFileSync(new URL('cards/alpha.mdx', FIXTURES), 'utf8');
const { topics: TOPICS } = parseTopics(readFileSync(new URL('TOPICS.md', FIXTURES), 'utf8'), 'TOPICS.md');
const FILE = 'cards/alpha.mdx';
const TODAY = '2026-11-23';

function check(source: string) {
  return validateCards([parseCard(FILE, source)], TOPICS, TODAY, 'cards');
}

function setField(field: string, value: string) {
  return VALID.replace(new RegExp(`^${field}: .*$`, 'm'), `${field}: ${value}`);
}

function sectionBody(title: string) {
  const start = VALID.indexOf(`## ${title}\n`);
  const next = VALID.indexOf('\n## ', start + 1);
  return VALID.slice(start, next === -1 ? undefined : next + 1);
}

describe('validateCards: per-card rules', () => {
  it('should pass the valid fixture card', () => {
    expect(check(VALID)).toEqual([]);
  });

  it.each(['id', 'title', 'domain', 'order', 'status', 'reviewed', 'tags', 'aliases', 'related'])(
    'should report metadata-missing naming %s when it is absent',
    (field) => {
      const source = VALID.replace(new RegExp(`^${field}: .*\\n`, 'm'), '');
      expect(check(source)).toEqual([
        { file: FILE, id: field === 'id' ? null : 'alpha', rule: 'metadata-missing', detail: `${field} is required` },
      ]);
    },
  );

  it.each([
    ['id', 'Alpha', 'lowercase slug'],
    ['domain', 'frontend', 'foundations'],
    ['status', 'maybe', 'adopt, trial, assess, hold'],
    ['reviewed', '2026-13', 'YYYY-MM'],
    ['order', '0', 'whole number ≥ 1'],
    ['tags', '[a, " "]', 'blank'],
    ['aliases', '[x, x]', 'duplicate "x"'],
    ['related', '[{id: beta, why: x}, {id: beta, why: y}]', 'duplicate "beta"'],
  ])('should report metadata-invalid for %s = %s, naming the allowed values or format', (field, value, hint) => {
    const failures = check(setField(field, value)).filter((f) => f.rule === 'metadata-invalid');
    expect(failures).toEqual([
      expect.objectContaining({ file: FILE, rule: 'metadata-invalid', detail: expect.stringContaining(hint) }),
    ]);
    expect(failures[0].detail).toContain(field);
  });

  it('should include the bad value in a metadata-invalid detail', () => {
    expect(check(setField('status', 'maybe'))[0].detail).toContain('"maybe"');
  });

  it.each(TEMPLATE_SECTIONS)('should report section-missing for "%s" with the template order', (title) => {
    const source = VALID.replace(sectionBody(title), '');
    const failures = check(source);
    expect(failures).toContainEqual({
      file: FILE,
      id: 'alpha',
      rule: 'section-missing',
      detail: expect.stringContaining(`"${title}" is required (template order: TL;DR, Problem it solves,`),
    });
  });

  it('should report section-empty for a heading with no content', () => {
    const source = VALID.replace(sectionBody('Pitfalls'), '## Pitfalls\n\n');
    expect(check(source)).toEqual([
      { file: FILE, id: 'alpha', rule: 'section-empty', detail: '"Pitfalls" has no content' },
    ]);
  });

  it('should report section-order with the expected and actual order', () => {
    const wild = sectionBody('In the wild');
    const pitfalls = sectionBody('Pitfalls');
    const source = VALID.replace(wild + pitfalls, pitfalls + wild);
    const [failure] = check(source);
    expect(failure).toMatchObject({ file: FILE, id: 'alpha', rule: 'section-order' });
    expect(failure.detail).toContain('expected');
    expect(failure.detail).toContain('Pitfalls, In the wild');
  });

  it('should report section-duplicate when a section appears twice', () => {
    const pitfalls = sectionBody('Pitfalls');
    const source = VALID.replace(pitfalls, pitfalls + pitfalls);
    expect(check(source)).toEqual([
      { file: FILE, id: 'alpha', rule: 'section-duplicate', detail: '"Pitfalls" appears more than once' },
    ]);
  });

  it('should report section-unknown for a ## heading outside the template', () => {
    const source = VALID.replace('## Related\n', '## Notes\n\nExtra.\n\n## Related\n');
    expect(check(source)).toEqual([
      { file: FILE, id: 'alpha', rule: 'section-unknown', detail: expect.stringContaining('"Notes" is not a template section') },
    ]);
  });

  it('should report cost-row-missing when Trade-offs has no cost row', () => {
    const source = VALID.replace('| **Cost** | <Meter n={3} /> Low | <Meter n={2} /> High |', '| speed | <Meter n={3} /> Fast | <Meter n={2} /> Slow |');
    expect(check(source)).toEqual([
      { file: FILE, id: 'alpha', rule: 'cost-row-missing', detail: 'the Trade-offs table needs a row whose first cell is "cost"' },
    ]);
  });

  it('should still check body rules when the frontmatter is invalid', () => {
    const source = VALID.replace('title: Alpha', 'title: [unclosed').replace(sectionBody('Pitfalls'), '');
    const rules = check(source).map((f) => f.rule);
    expect(rules).toContain('frontmatter-invalid');
    expect(rules).toContain('section-missing');
  });
});
