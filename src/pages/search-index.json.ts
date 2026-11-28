// The palette's data (contracts/search-index.md): one static JSON file, built once, fetched at idle.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { toPublished } from '../lib/discovery/catalog.ts';
import { buildSearchIndex } from '../lib/discovery/search-index.ts';
import { parseTopics } from '../lib/topics.ts';
import topicsMarkdown from '../../docs/TOPICS.md?raw';

export const GET: APIRoute = async () => {
  // Topic list errors are the validator's job; the index only needs ids, titles and domains.
  const { topics } = parseTopics(topicsMarkdown, 'docs/TOPICS.md');
  const cards = toPublished(await getCollection('cards'));
  return Response.json(buildSearchIndex(topics, cards));
};
