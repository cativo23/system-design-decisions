import { RADAR_STATUSES, type RadarStatus } from '../cards/schema.ts';
import type { DomainSummary } from './catalog.ts';

// The radar page (FR-011): published cards grouped by status, always all four groups in the fixed order.

export interface RadarCard {
  id: string;
  title: string;
  href: string;
  /** The domain name the reader sees. */
  domain: string;
  reviewed: string;
}

export interface RadarGroup {
  status: RadarStatus;
  cards: RadarCard[];
}

/** Cards keep learning-path order inside a group; unpublished topics have no status and are left out. */
export function radarGroups(catalog: DomainSummary[]): RadarGroup[] {
  const published = catalog.flatMap((d) => d.entries.filter((e) => e.published).map((e) => ({ entry: e, domain: d.domain.name })));
  return RADAR_STATUSES.map((status) => ({
    status,
    cards: published
      .filter(({ entry }) => entry.status === status)
      .map(({ entry, domain }) => ({ id: entry.id, title: entry.title, href: entry.href!, domain, reviewed: entry.reviewed! })),
  }));
}
