import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { cardSchema } from './lib/cards/schema.ts';

// The entry id (and so the URL) comes from the frontmatter `id`, not the file
// name or title, so it stays permanent (FR-003, constitution IV).
const cards = defineCollection({
  loader: glob({
    pattern: '*.mdx',
    base: './src/content/cards',
    generateId: ({ data }) => String(data.id),
  }),
  schema: cardSchema,
});

export const collections = { cards };
