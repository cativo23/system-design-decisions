// Reads the two sources every discovery page derives from (FR-016): the topic list and the cards collection.
// Pages only; the pure modules next to it take the data as arguments so tests need no Astro runtime.
import { getCollection } from 'astro:content';
import { buildCatalog, toPublished } from './catalog.ts';
import { parseTopics } from '../topics.ts';
import topicsMarkdown from '../../../docs/TOPICS.md?raw';

export async function loadSite() {
  // Topic list errors are the validator's job; pages only need ids, titles and domains.
  const { topics } = parseTopics(topicsMarkdown, 'docs/TOPICS.md');
  const cards = toPublished(await getCollection('cards'));
  return { topics, cards, catalog: buildCatalog(topics, cards) };
}
