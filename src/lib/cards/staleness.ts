import type { ParsedCard } from './parse-card.ts';

// Freshness (FR-014, FR-015): a warning report, never a failure.

export interface StaleEntry {
  file: string;
  id: string;
  reviewed: string;
  ageInMonths: number;
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const REVIEW_WINDOW_MONTHS = 12;

/** Whole calendar months from `reviewed` (YYYY-MM) to `today` (YYYY-MM-DD). Day of month is ignored. */
export function ageInMonths(reviewed: string, today: string): number {
  const [ry, rm] = reviewed.split('-').map(Number);
  const [ty, tm] = today.split('-').map(Number);
  return (ty - ry) * 12 + (tm - rm);
}

/** Cards past the review window (exactly 12 months is not stale), oldest first. */
export function staleCards(cards: ParsedCard[], today: string): StaleEntry[] {
  const stale: StaleEntry[] = [];
  for (const { file, data } of cards) {
    const id = data?.id;
    const reviewed = data?.reviewed;
    if (typeof id !== 'string' || typeof reviewed !== 'string' || !MONTH.test(reviewed)) continue;
    const age = ageInMonths(reviewed, today);
    if (age > REVIEW_WINDOW_MONTHS) stale.push({ file, id, reviewed, ageInMonths: age });
  }
  return stale.sort((a, b) => b.ageInMonths - a.ageInMonths || a.file.localeCompare(b.file));
}
