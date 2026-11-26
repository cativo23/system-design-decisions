import { parse as parseYaml } from 'yaml';
import type { CheckFailure } from '../check-failure.ts';

// A line scanner instead of an MDX AST: the rules only need ## headings and
// table rows (research.md R4).

export interface Section {
  title: string;
  /** 1-based line of the heading in the file. */
  line: number;
  lines: string[];
  /** No line other than blanks or ### (and deeper) headings. */
  empty: boolean;
}

export interface ParsedCard {
  file: string;
  data: Record<string, unknown> | null;
  sections: Section[];
  failures: CheckFailure[];
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const H2 = /^## +(.*?)\s*$/;
const SUBHEADING = /^#{3,}\s/;

export function parseCard(file: string, source: string): ParsedCard {
  const lines = source.split('\n');
  const failures: CheckFailure[] = [];
  const fail = (detail: string) => failures.push({ file, id: null, rule: 'frontmatter-invalid', detail });

  let data: Record<string, unknown> | null = null;
  let bodyStart = 0;

  if (lines[0]?.trim() !== '---') {
    fail('missing frontmatter: the file must start with a --- fenced YAML block');
  } else {
    const close = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
    if (close === -1) {
      fail('frontmatter block is not closed (no second --- line)');
      bodyStart = 1;
    } else {
      bodyStart = close + 1;
      data = parseFrontmatter(lines.slice(1, close).join('\n'), fail);
    }
  }

  return { file, data, sections: scanSections(lines, bodyStart), failures };
}

function parseFrontmatter(yaml: string, fail: (detail: string) => void): Record<string, unknown> | null {
  let value: unknown;
  try {
    value = parseYaml(yaml);
  } catch (error) {
    fail(`invalid YAML: ${(error as Error).message.split('\n')[0]}`);
    return null;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('frontmatter must be a mapping of fields (key: value)');
    return null;
  }
  return value as Record<string, unknown>;
}

function scanSections(lines: string[], start: number): Section[] {
  const sections: Section[] = [];
  let fence: string | null = null;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(FENCE);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      // A fence closes only with the same character and at least the same length.
      if (fence === null) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
    }

    const heading = fence === null && !fenceMatch ? line.match(H2) : null;
    if (heading) {
      sections.push({ title: heading[1], line: i + 1, lines: [], empty: true });
    } else if (sections.length > 0) {
      const current = sections[sections.length - 1];
      current.lines.push(line);
      if (line.trim() !== '' && !(fence === null && SUBHEADING.test(line))) current.empty = false;
    }
  }
  return sections;
}

const SEPARATOR_ROW = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function firstCell(row: string): string {
  const cells = row.trim().replace(/^\|/, '').split('|');
  return cells[0].replace(/[*_`]/g, '').trim().toLowerCase();
}

/** True when a GFM table data row (not the header) has `cost` as its first cell. */
export function hasCostRow(lines: string[]): boolean {
  return lines.some((line, i) => {
    if (!line.includes('|') || SEPARATOR_ROW.test(line)) return false;
    const isHeader = i + 1 < lines.length && SEPARATOR_ROW.test(lines[i + 1]);
    const inTable = lines.slice(0, i).some((l) => SEPARATOR_ROW.test(l));
    return !isHeader && inTable && firstCell(line) === 'cost';
  });
}
