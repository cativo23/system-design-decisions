import type { SearchEntry } from './search-index.ts';

// The palette's matcher (research.md R4): plain text in, ranked entries out, no DOM.

/** Lower-case, no diacritics, split on anything that is not a letter or digit (so regex and markup are plain text). */
export function normalize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Optimal string alignment: insert, delete, substitute, and swap of two adjacent letters each cost 1. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const WEIGHTS = { title: 3, alias: 2, tag: 1 } as const;
const EXACT = 3;
const PREFIX = 2;
const TYPO = 1;

// 1–2 letters: no typo; 3–7: one; 8 or more: two (looser matching is noise on a corpus this small).
const typoLimit = (length: number) => (length <= 2 ? 0 : length <= 7 ? 1 : 2);

interface Fields {
  title: string[];
  alias: string[];
  tag: string[];
}
const cache = new WeakMap<SearchEntry, Fields>();
function fieldsOf(entry: SearchEntry): Fields {
  let fields = cache.get(entry);
  if (!fields) {
    fields = { title: normalize(entry.title), alias: entry.aliases.flatMap(normalize), tag: entry.tags.flatMap(normalize) };
    cache.set(entry, fields);
  }
  return fields;
}

/** How well a query token matches a word: 0 none, 1 typo, 2 prefix, 3 exact. */
function quality(token: string, word: string, limit: number): number {
  if (word === token) return EXACT;
  if (word.startsWith(token)) return PREFIX;
  if (limit > 0 && (editDistance(token, word) <= limit || editDistance(token, word.slice(0, token.length)) <= limit)) return TYPO;
  return 0;
}

function tokenScore(token: string, fields: Fields): number {
  const limit = typoLimit(token.length);
  let best = 0;
  for (const kind of ['title', 'alias', 'tag'] as const) {
    for (const word of fields[kind]) best = Math.max(best, WEIGHTS[kind] * quality(token, word, limit));
  }
  return best;
}

/** Entries matching every query token, best first; ties by title so the order never flips between runs. */
export function search(entries: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const tokens = normalize(query);
  if (tokens.length === 0) return [];
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of entries) {
    const fields = fieldsOf(entry);
    let score = 0;
    for (const token of tokens) {
      const s = tokenScore(token, fields);
      if (s === 0) {
        score = 0;
        break;
      }
      score += s;
    }
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title) || a.entry.id.localeCompare(b.entry.id));
  return scored.slice(0, limit).map((s) => s.entry);
}
