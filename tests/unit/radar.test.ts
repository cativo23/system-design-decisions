import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../../src/lib/discovery/catalog.ts';
import { radarGroups } from '../../src/lib/discovery/radar.ts';
import { CARDS, TOPICS } from '../helpers/discovery-fixtures.ts';

const groups = radarGroups(buildCatalog(TOPICS, CARDS));
const group = (status: string) => groups.find((g) => g.status === status)!;

describe('radarGroups', () => {
  it('should always give four groups in the order adopt, trial, assess, hold', () => {
    expect(groups.map((g) => g.status)).toEqual(['adopt', 'trial', 'assess', 'hold']);
  });

  it('should keep an empty group present with no cards', () => {
    const onlyAdopt = radarGroups(buildCatalog(TOPICS, CARDS.filter((c) => c.status === 'adopt')));
    expect(onlyAdopt.map((g) => [g.status, g.cards.length])).toEqual([
      ['adopt', 2],
      ['trial', 0],
      ['assess', 0],
      ['hold', 0],
    ]);
    expect(radarGroups(buildCatalog(TOPICS, [])).map((g) => g.cards)).toEqual([[], [], [], []]);
  });

  it('should put each published card in exactly the group of its status', () => {
    expect(group('adopt').cards.map((c) => c.id)).toEqual(['quality-attributes', 'saga']);
    expect(group('trial').cards.map((c) => c.id)).toEqual(['consistency']);
    expect(group('assess').cards.map((c) => c.id)).toEqual(['microservices']);
    expect(group('hold').cards.map((c) => c.id)).toEqual(['outbox-cdc']);
    const all = groups.flatMap((g) => g.cards.map((c) => c.id));
    expect(all.sort()).toEqual(CARDS.map((c) => c.id).sort());
  });

  it('should order the cards of a group by learning path, not by review date or title', () => {
    // saga (domain 5) comes after quality-attributes (domain 1) although both were reviewed in different months.
    expect(group('adopt').cards.map((c) => c.id)).toEqual(['quality-attributes', 'saga']);
  });

  it('should give each card its title, link, domain name and reviewed month', () => {
    expect(group('adopt').cards[1]).toEqual({
      id: 'saga',
      title: 'Saga',
      href: '/cards/saga/',
      domain: 'Distributed data & workflows',
      reviewed: '2026-11',
    });
  });

  it('should leave out topics that are not published', () => {
    expect(groups.flatMap((g) => g.cards.map((c) => c.id))).not.toContain('idempotency');
  });
});
