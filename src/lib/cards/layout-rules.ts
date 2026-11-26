import type { RuleCode } from '../check-failure.ts';
import type { Section } from './parse-card.ts';

// Card format v2 rules for the five sections the layout reads (contracts/card-format.md).
// A line scanner over Section.lines, no AST, like parse-card.ts. An empty section is skipped:
// section-empty already reports it.

export interface LayoutFailure {
  rule: RuleCode;
  detail: string;
}

type Out = LayoutFailure[];
const BULLET = /^\s{0,3}[-*+]\s+(.*)$/;
const DIRECTORY_NAME = /^[a-z0-9][a-z0-9.-]*$/;

export function layoutFailures(sections: Section[]): Out {
  const out: Out = [];
  for (const section of sections) {
    if (section.empty) continue;
    const lines = section.lines;
    switch (section.title) {
      case 'TL;DR':
        out.push(...checkTldr(lines));
        break;
      case 'Use it when / Avoid it when':
        out.push(...checkUseAvoid(lines));
        break;
      case 'Trade-offs':
        out.push(...checkTradeoffs(lines));
        break;
      case 'In the wild':
        out.push(...checkWild(lines));
        break;
      case 'Pitfalls':
        out.push(...checkPitfalls(lines));
        break;
      case 'Go deeper':
        out.push(...checkSources(lines));
        break;
    }
  }
  return out;
}

const fail = (rule: RuleCode, detail: string): LayoutFailure => ({ rule, detail });

function checkTldr(lines: string[]): Out {
  let paragraphs = 0;
  let inside = false;
  for (const line of lines) {
    if (line.trim() === '') inside = false;
    else if (!inside) {
      paragraphs++;
      inside = true;
    }
  }
  return paragraphs === 1 ? [] : [fail('tldr-shape', `TL;DR must be exactly one paragraph; found ${paragraphs} paragraphs`)];
}

function checkUseAvoid(lines: string[]): Out {
  const WANT = ['Use it when', 'Avoid it when'];
  const out: Out = [];
  const headings: { title: string; bullets: number }[] = [];
  for (const line of lines) {
    const h = line.match(/^###\s+(.*?)\s*$/);
    if (h) headings.push({ title: h[1], bullets: 0 });
    else if (BULLET.test(line) && headings.length > 0) headings[headings.length - 1].bullets++;
  }

  const seen = new Set<string>();
  const known: typeof headings = [];
  for (const h of headings) {
    if (!WANT.includes(h.title)) out.push(fail('use-avoid-shape', `unexpected heading "### ${h.title}" (only "### Use it when" and "### Avoid it when" are allowed)`));
    else if (seen.has(h.title)) out.push(fail('use-avoid-shape', `"### ${h.title}" appears more than once`));
    else {
      seen.add(h.title);
      known.push(h);
    }
  }
  for (const title of WANT) if (!seen.has(title)) out.push(fail('use-avoid-shape', `missing "### ${title}"`));
  if (seen.size === 2 && known[0].title !== WANT[0]) {
    out.push(fail('use-avoid-shape', 'wrong order: "### Use it when" must come before "### Avoid it when"'));
  }
  for (const h of known) if (h.bullets === 0) out.push(fail('use-avoid-shape', `"### ${h.title}" needs at least one bullet`));
  return out;
}

const SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

function checkTradeoffs(lines: string[]): Out {
  const sep = lines.findIndex((l) => l.includes('|') && SEPARATOR.test(l));
  if (sep < 1) return [fail('tradeoffs-shape', 'no table found: Trade-offs needs a three-column table')];

  const header = cells(lines[sep - 1]);
  if (header.length !== 3) return [fail('tradeoffs-shape', `the table has ${header.length} columns; it needs exactly 3 (dimension, approach, alternative)`)];

  const out: Out = [];
  for (const line of lines.slice(sep + 1)) {
    if (!line.includes('|')) break;
    const row = cells(line);
    const dimension = row[0].replace(/[*_`]/g, '').trim();
    for (const col of [1, 2]) {
      const where = `row "${dimension}", column "${header[col]}"`;
      const m = (row[col] ?? '').match(/^<Meter\s+n=\{([^}]*)\}\s*\/>/);
      if (!m) {
        out.push(fail('meter-missing', `${where} must start with <Meter n={0–6} />`));
        continue;
      }
      const n = m[1].trim();
      if (!/^\d+$/.test(n) || Number(n) > 6) out.push(fail('meter-range', `${where}: n={${n}} is not an integer from 0 to 6`));
    }
  }
  return out;
}

function bullets(lines: string[]): string[] {
  return lines.filter((l) => BULLET.test(l)).map((l) => l.trim());
}

function checkWild(lines: string[]): Out {
  const items = bullets(lines);
  if (items.length === 0) return [fail('wild-entry-malformed', 'In the wild needs at least one bullet: "- **name** description"')];
  const out: Out = [];
  for (const item of items) {
    const m = item.match(/^[-*+]\s+\*\*([^*]+)\*\*\s+(\S.*)$/);
    if (!m) out.push(fail('wild-entry-malformed', `needs "- **name** description": ${item}`));
    else if (!DIRECTORY_NAME.test(m[1])) out.push(fail('wild-entry-malformed', `name "${m[1]}" must be in directory form (lowercase letters, digits, "." and "-"): ${item}`));
  }
  return out;
}

function attrs(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/([A-Za-z-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function checkPitfalls(lines: string[]): Out {
  const out: Out = [];
  const stray: string[] = [];
  let blocks = 0;
  let open: { title: string | undefined; body: number } | null = null;

  const closeBlock = () => {
    if (!open) return;
    if ((open.title ?? '').trim() === '') out.push(fail('pitfall-malformed', 'a <Pitfall> needs a non-blank title="…"'));
    if (open.body === 0) out.push(fail('pitfall-malformed', `<Pitfall title="${open.title ?? ''}"> has an empty body`));
    open = null;
  };

  for (const line of lines) {
    const start = line.match(/^\s*<Pitfall\b([^>]*)>\s*$/);
    if (open) {
      if (/^\s*<\/Pitfall>\s*$/.test(line)) closeBlock();
      else if (line.trim() !== '') open.body++;
    } else if (start) {
      blocks++;
      open = { title: attrs(start[1]).title, body: 0 };
    } else if (line.trim() !== '') {
      stray.push(line.trim());
    }
  }
  if (open) out.push(fail('pitfall-malformed', 'a <Pitfall> is never closed with </Pitfall>'));

  if (blocks === 0) return [fail('pitfall-malformed', 'Pitfalls needs at least one <Pitfall title="…"> block')];
  for (const line of stray) out.push(fail('pitfall-malformed', `only <Pitfall> blocks may appear here: ${line}`));
  return out;
}

function checkSources(lines: string[]): Out {
  const items = bullets(lines);
  if (items.length === 0) return [fail('source-malformed', 'Go deeper needs at least one bullet: - <Source kind="…" href="https://…">Title</Source>')];
  const out: Out = [];
  for (const item of items) {
    const m = item.match(/^[-*+]\s+<Source\b([^>]*)>(.*)<\/Source>\s*$/);
    if (!m) {
      out.push(fail('source-malformed', `needs <Source kind="…" href="https://…">Title</Source>: ${item}`));
      continue;
    }
    const a = attrs(m[1]);
    const problems = [
      /^[a-z][a-z0-9-]*$/.test(a.kind ?? '') ? null : 'kind must be a lowercase word',
      (a.href ?? '').startsWith('https://') ? null : 'href must start with https://',
      m[2].trim() === '' ? 'title must not be blank' : null,
    ].filter((p) => p !== null);
    if (problems.length > 0) out.push(fail('source-malformed', `${problems.join('; ')}: ${item}`));
  }
  return out;
}
