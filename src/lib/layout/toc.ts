// The TOC entry to highlight: the last section whose top is above the reading line.
export function currentSection(tops: { id: string; top: number }[], line: number): string | null {
  if (tops.length === 0) return null;
  let current = tops[0].id;
  for (const s of tops) if (s.top <= line) current = s.id;
  return current;
}
