import { describe, expect, it } from 'vitest';
import { hasCostRow, parseCard } from '../../src/lib/cards/parse-card.ts';

const FILE = 'src/content/cards/x.mdx';

describe('parseCard: frontmatter', () => {
  it('should split the frontmatter on its --- fences and parse the YAML', () => {
    const card = parseCard(FILE, '---\nid: saga\nreviewed: 2026-11\ntags: [a, b]\n---\n\n## TL;DR\n\nText\n');
    expect(card.failures).toEqual([]);
    expect(card.file).toBe(FILE);
    expect(card.data).toEqual({ id: 'saga', reviewed: '2026-11', tags: ['a', 'b'] });
  });

  it('should report frontmatter-invalid when the frontmatter block is missing', () => {
    const card = parseCard(FILE, '## TL;DR\n\nText\n');
    expect(card.data).toBeNull();
    expect(card.failures).toEqual([
      { file: FILE, id: null, rule: 'frontmatter-invalid', detail: expect.stringContaining('---') },
    ]);
  });

  it('should report frontmatter-invalid when the closing fence is missing', () => {
    const card = parseCard(FILE, '---\nid: saga\n\n## TL;DR\n\nText\n');
    expect(card.failures).toEqual([
      expect.objectContaining({ rule: 'frontmatter-invalid', detail: expect.stringContaining('not closed') }),
    ]);
  });

  it('should report frontmatter-invalid with the parser message on a YAML syntax error', () => {
    const card = parseCard(FILE, '---\ntitle: [unclosed\n---\n## TL;DR\n\nText\n');
    expect(card.data).toBeNull();
    expect(card.failures).toEqual([
      { file: FILE, id: null, rule: 'frontmatter-invalid', detail: expect.stringMatching(/\S/) },
    ]);
  });

  it('should report frontmatter-invalid when the YAML is not a mapping', () => {
    const card = parseCard(FILE, '---\n- a\n- b\n---\n## TL;DR\n\nText\n');
    expect(card.failures).toEqual([
      expect.objectContaining({ rule: 'frontmatter-invalid', detail: expect.stringContaining('mapping') }),
    ]);
  });

  it('should still scan the body when the frontmatter is invalid', () => {
    const card = parseCard(FILE, '---\ntitle: [unclosed\n---\n## TL;DR\n\nText\n');
    expect(card.sections.map((s) => s.title)).toEqual(['TL;DR']);
  });
});

describe('parseCard: sections', () => {
  const body = (text: string) => parseCard(FILE, `---\nid: x\n---\n${text}`).sections;

  it('should list ## headings in order with their file line numbers', () => {
    const sections = body('\n## TL;DR\n\nOne\n\n## Pitfalls\n\nTwo\n');
    expect(sections.map((s) => [s.title, s.line])).toEqual([
      ['TL;DR', 5],
      ['Pitfalls', 9],
    ]);
  });

  it('should ignore headings inside ``` and ~~~ fences', () => {
    const sections = body('## A\n\n```md\n## Not one\n```\n\n~~~\n## Nor this\n~~~\n');
    expect(sections.map((s) => s.title)).toEqual(['A']);
    expect(sections[0].empty).toBe(false);
  });

  it('should not treat ### or # headings as sections', () => {
    const sections = body('## A\n\n### Sub\n\ntext\n\n#### Deeper\n');
    expect(sections.map((s) => s.title)).toEqual(['A']);
  });

  it('should mark a section with only blank lines as empty', () => {
    expect(body('## A\n\n   \n\n## B\n\nx\n').map((s) => s.empty)).toEqual([true, false]);
  });

  it('should mark a section holding only a ### heading as empty', () => {
    expect(body('## A\n\n### Only a subheading\n').map((s) => s.empty)).toEqual([true]);
  });

  it('should keep the lines of each section', () => {
    expect(body('## A\n\nline one\nline two\n')[0].lines).toEqual(['', 'line one', 'line two', '']);
  });
});

describe('hasCostRow', () => {
  const table = (...rows: string[]) => ['| dimension | a | b |', '|---|---|---|', ...rows];

  it('should find a data row whose first cell is cost', () => {
    expect(hasCostRow(table('| cost | low | high |'))).toBe(true);
  });

  it.each(['| Cost | x | y |', '| **cost** | x | y |', '| _COST_ | x | y |', '| `cost` | x | y |', 'cost | x | y'])(
    'should match %j case-insensitively, ignoring emphasis and backticks',
    (row) => {
      expect(hasCostRow(table(row))).toBe(true);
    },
  );

  it('should not count the header row', () => {
    expect(hasCostRow(['| cost | a | b |', '|---|---|---|', '| speed | x | y |'])).toBe(false);
  });

  it('should not match a first cell that only contains cost', () => {
    expect(hasCostRow(table('| total cost | x | y |'))).toBe(false);
  });

  it('should be false without a table', () => {
    expect(hasCostRow(['cost is high'])).toBe(false);
  });
});
