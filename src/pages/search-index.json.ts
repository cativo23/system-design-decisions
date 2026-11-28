// The palette's data (contracts/search-index.md): one static JSON file, built once, fetched at idle.
import type { APIRoute } from 'astro';
import { loadSite } from '../lib/discovery/load.ts';
import { buildSearchIndex } from '../lib/discovery/search-index.ts';

export const GET: APIRoute = async () => {
  const { topics, cards } = await loadSite();
  return Response.json(buildSearchIndex(topics, cards));
};
