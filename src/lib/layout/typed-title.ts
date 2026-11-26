// The typing animation only suits short titles (research.md R9).
export const MAX_TYPED_LENGTH = 14;

export function isTypable(title: string): boolean {
  const t = title.trim();
  return t.length > 0 && t.length <= MAX_TYPED_LENGTH;
}
