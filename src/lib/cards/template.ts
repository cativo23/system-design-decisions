// The fixed decision-card template (constitution I, contracts/card-format.md), defined once:
// the validator takes the required titles from it, the layout takes ids and TOC labels.
export interface TemplateSection {
  title: string;
  /** Anchor id on the rendered heading. */
  id: string;
  /** Label in the table of contents; null for TL;DR, which is a panel, not an entry. */
  tocLabel: string | null;
}

export const TEMPLATE: readonly TemplateSection[] = [
  { title: 'TL;DR', id: 'tldr', tocLabel: null },
  { title: 'Problem it solves', id: 'problem', tocLabel: 'problem' },
  { title: 'How it works', id: 'how', tocLabel: 'how-it-works' },
  { title: 'Use it when / Avoid it when', id: 'when', tocLabel: 'use-avoid' },
  { title: 'Trade-offs', id: 'tradeoffs', tocLabel: 'trade-offs' },
  { title: 'In the wild', id: 'wild', tocLabel: 'in-the-wild' },
  { title: 'Pitfalls', id: 'pitfalls', tocLabel: 'pitfalls' },
  { title: 'Related', id: 'related', tocLabel: 'related' },
  { title: 'Go deeper', id: 'deeper', tocLabel: 'go-deeper' },
];

export function tocEntries(): { id: string; label: string }[] {
  return TEMPLATE.flatMap((s) => (s.tocLabel === null ? [] : [{ id: s.id, label: s.tocLabel }]));
}
