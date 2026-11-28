import type { PublishedCard } from '../../src/lib/discovery/catalog.ts';
import type { TopicEntry } from '../../src/lib/topics.ts';

// Sample data shared by the discovery tests (tasks.md T002). Shapes follow data-model.md § Inputs.
// 5 published cards over domains 1, 2 and 5; all four radar statuses; `consistency` and `saga` share
// the review month 2026-11; domain 6 has topics but no published card; `saga` is `drafting` in the
// topic list yet published (as the real Saga is).
const topic = (id: string, title: string, domainNumber: number, state: TopicEntry['state'] = 'pending'): TopicEntry => ({
  id,
  title,
  domainNumber,
  state,
});

export const TOPICS: TopicEntry[] = [
  topic('quality-attributes', 'Quality attributes & trade-off analysis', 1, 'published'),
  topic('consistency', 'Consistency models & PACELC', 1, 'published'),
  topic('estimation', 'Back-of-envelope estimation', 1),
  topic('monolith', 'Monolith', 2),
  topic('microservices', 'Microservices (extract on evidence)', 2, 'published'),
  topic('idempotency', 'Idempotency', 5),
  topic('outbox-cdc', 'Transactional outbox & CDC', 5, 'published'),
  topic('saga', 'Saga (2PC covered inside)', 5, 'drafting'),
  topic('indexing', 'Indexing', 6),
  topic('replication', 'Replication', 6),
];

const card = (c: Omit<PublishedCard, 'order'> & { order: number }): PublishedCard => c;

export const CARDS: PublishedCard[] = [
  card({
    id: 'quality-attributes',
    title: 'Quality attributes',
    domain: 'foundations',
    order: 1,
    status: 'adopt',
    reviewed: '2026-09',
    tags: ['architecture', 'tradeoffs'],
    aliases: ['nonfunctional requirements', 'trade-off analysis'],
  }),
  card({
    id: 'consistency',
    title: 'Consistency models',
    domain: 'foundations',
    order: 2,
    status: 'trial',
    reviewed: '2026-11',
    tags: ['consistency', 'replication'],
    aliases: ['pacelc', 'cap theorem'],
  }),
  card({
    id: 'microservices',
    title: 'Microservices',
    domain: 'architecture-styles',
    order: 2,
    status: 'assess',
    reviewed: '2026-10',
    tags: ['architecture', 'distribution'],
    aliases: ['service oriented'],
  }),
  card({
    id: 'outbox-cdc',
    title: 'Transactional outbox',
    domain: 'distributed-data',
    order: 2,
    status: 'hold',
    reviewed: '2026-10',
    tags: ['messaging', 'reliability'],
    aliases: ['outbox pattern', 'change data capture'],
  }),
  card({
    id: 'saga',
    title: 'Saga',
    domain: 'distributed-data',
    order: 3,
    status: 'adopt',
    reviewed: '2026-11',
    tags: ['transactions', 'consistency', 'microservices'],
    aliases: ['distributed transactions', 'compensating transactions'],
  }),
];
