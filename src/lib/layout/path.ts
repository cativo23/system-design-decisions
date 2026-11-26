import type { RadarStatus } from '../cards/schema.ts';
import type { TopicEntry } from '../topics.ts';

// The learning path: every topic in file order (data-model.md PathEntry).
export interface PathEntry {
  id: string;
  title: string;
  domainNumber: number;
  written: boolean;
  status: RadarStatus | null;
}

/** `written` maps each existing card id to its radar status. */
export function buildPath(topics: TopicEntry[], written: ReadonlyMap<string, RadarStatus>): PathEntry[] {
  return topics.map((t) => ({
    id: t.id,
    title: t.title,
    domainNumber: t.domainNumber,
    written: written.has(t.id),
    status: written.get(t.id) ?? null,
  }));
}

export function neighbors(path: PathEntry[], id: string): { prev: PathEntry | null; next: PathEntry | null } {
  const i = path.findIndex((e) => e.id === id);
  if (i < 0) throw new Error(`"${id}" is not in the learning path`);
  return { prev: path[i - 1] ?? null, next: path[i + 1] ?? null };
}
