// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://architecture.cativo.dev',
  integrations: [mdx()],
  // Self-hosted fonts (0 third-party origins): see specs/002-design-system-card-layout/research.md R2
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      weights: ['400 600'],
      styles: ['normal'],
      subsets: ['latin', 'symbols2'],
      fallbacks: ['ui-monospace', 'monospace']
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-sans',
      weights: ['400 600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif']
    }
  ]
});
