// The status line's position field (FR-006).
export function scrollLabel(scrollY: number, maxScroll: number): string {
  if (maxScroll <= 0 || scrollY <= 0) return 'top';
  if (scrollY >= maxScroll) return 'bot';
  return `${Math.round((scrollY / maxScroll) * 100)}%`;
}
