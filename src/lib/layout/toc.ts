type Tops = { id: string; top: number }[];

/** The last section whose heading is on screen (above the bottom edge), or null when none is. */
export function lastOnScreen(tops: Tops, viewport: number): string | null {
  return [...tops].reverse().find((t) => t.top < viewport)?.id ?? null;
}

/**
 * The TOC entry to highlight: the last section whose top is above the reading line.
 * `bottom` is given when the page cannot scroll further: the last headings can never reach the line there,
 * so the last one on screen counts as reached instead (otherwise the end of a card is never highlighted).
 */
export function currentSection(tops: Tops, line: number, bottom?: { viewport: number }): string | null {
  if (tops.length === 0) return null;
  const onScreen = bottom ? lastOnScreen(tops, bottom.viewport) : null;
  if (onScreen) return onScreen;
  let current = tops[0].id;
  for (const s of tops) if (s.top <= line) current = s.id;
  return current;
}
