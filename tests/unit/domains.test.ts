import { describe, expect, it } from 'vitest';
import { DOMAINS, domainByNumber, domainBySlug } from '../../src/lib/domains.ts';

// data-model.md § Domain
const EXPECTED = [
  [1, 'foundations', 'Foundations'],
  [2, 'architecture-styles', 'Architecture styles'],
  [3, 'compute-runtime', 'Compute & runtime'],
  [4, 'communication-apis', 'Communication & APIs'],
  [5, 'distributed-data', 'Distributed data & workflows'],
  [6, 'storage', 'Storage'],
  [7, 'traffic', 'Traffic'],
  [8, 'data-platforms', 'Data platforms'],
  [9, 'reliability-operations', 'Reliability & operations'],
  [10, 'security-privacy-compliance', 'Security, privacy & compliance'],
  [11, 'ai-systems', 'AI systems'],
  [12, 'architects-craft', "Architect's craft"],
  [13, 'reference-architectures', 'Reference architectures'],
] as const;

describe('domains', () => {
  it('should list the 13 domains in learning-path order with number, slug and name', () => {
    expect(DOMAINS.map((d) => [d.number, d.slug, d.name])).toEqual(EXPECTED);
  });

  it('should find a domain by slug', () => {
    expect(domainBySlug('distributed-data')).toEqual({
      number: 5,
      slug: 'distributed-data',
      name: 'Distributed data & workflows',
    });
  });

  it('should find a domain slug by number', () => {
    expect(domainByNumber(12)?.slug).toBe('architects-craft');
  });

  it('should return undefined for an unknown slug or number', () => {
    expect(domainBySlug('frontend')).toBeUndefined();
    expect(domainByNumber(14)).toBeUndefined();
  });
});
