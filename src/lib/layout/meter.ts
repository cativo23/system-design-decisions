// Value objects for the card's trade-off meter (0–6) and the tree's domain meter (4 segments).
export function meterString(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 6) throw new RangeError(`meter level must be an integer 0–6, got ${n}`);
  return '█'.repeat(n) + '░'.repeat(6 - n);
}

export function domainMeter(read: number, total: number): string {
  const filled = total > 0 ? Math.min(4, Math.max(0, Math.round((read / total) * 4))) : 0;
  return '▰'.repeat(filled) + '▱'.repeat(4 - filled);
}
