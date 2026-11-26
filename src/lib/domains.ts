export interface Domain {
  number: number;
  slug: string;
  name: string;
}

// The 13 domains in learning-path order (data-model.md § Domain).
// Authors write the slug; readers see the name.
export const DOMAINS: readonly Domain[] = [
  { number: 1, slug: 'foundations', name: 'Foundations' },
  { number: 2, slug: 'architecture-styles', name: 'Architecture styles' },
  { number: 3, slug: 'compute-runtime', name: 'Compute & runtime' },
  { number: 4, slug: 'communication-apis', name: 'Communication & APIs' },
  { number: 5, slug: 'distributed-data', name: 'Distributed data & workflows' },
  { number: 6, slug: 'storage', name: 'Storage' },
  { number: 7, slug: 'traffic', name: 'Traffic' },
  { number: 8, slug: 'data-platforms', name: 'Data platforms' },
  { number: 9, slug: 'reliability-operations', name: 'Reliability & operations' },
  { number: 10, slug: 'security-privacy-compliance', name: 'Security, privacy & compliance' },
  { number: 11, slug: 'ai-systems', name: 'AI systems' },
  { number: 12, slug: 'architects-craft', name: "Architect's craft" },
  { number: 13, slug: 'reference-architectures', name: 'Reference architectures' },
];

export function domainBySlug(slug: string): Domain | undefined {
  return DOMAINS.find((d) => d.slug === slug);
}

export function domainByNumber(n: number): Domain | undefined {
  return DOMAINS.find((d) => d.number === n);
}
