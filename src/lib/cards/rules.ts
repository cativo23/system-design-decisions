import type { CheckFailure, RuleCode } from '../check-failure.ts';
import type { TopicEntry } from '../topics.ts';
import { hasCostRow, type ParsedCard, type Section } from './parse-card.ts';
import { cardSchema } from './schema.ts';
import { TEMPLATE } from './template.ts';

// Required section titles, derived from the single template definition.
export const TEMPLATE_SECTIONS = TEMPLATE.map((s) => s.title);

const REQUIRED_FIELDS = Object.keys(cardSchema.shape);

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Every failure across all cards in one pass (FR-013). `today` is the run date
 * (YYYY-MM-DD), injected so date rules are deterministic.
 */
export function validateCards(cards: ParsedCard[], topics: TopicEntry[], today: string, cardsDir: string): CheckFailure[] {
  if (cards.length === 0) {
    return [{ file: cardsDir, id: null, rule: 'no-cards', detail: `no *.mdx cards in ${cardsDir}` }];
  }

  const filesById = new Map<string, string[]>();
  for (const card of cards) {
    const id = cardId(card);
    if (id !== null) filesById.set(id, [...(filesById.get(id) ?? []), card.file]);
  }
  const topicIds = new Set(topics.map((t) => t.id));
  const runMonth = today.slice(0, 7);

  return cards.flatMap((card) => {
    const failures = checkCard(card);
    const id = cardId(card);
    const fail = (rule: RuleCode, detail: string) => failures.push({ file: card.file, id, rule, detail });

    const reviewed = card.data?.reviewed;
    if (typeof reviewed === 'string' && MONTH.test(reviewed) && reviewed > runMonth) {
      fail('metadata-invalid', `reviewed "${reviewed}" is in the future (run month ${runMonth})`);
    }

    if (id !== null) {
      const others = (filesById.get(id) ?? []).filter((f) => f !== card.file);
      if (others.length > 0) fail('id-duplicate', `id "${id}" is also used by ${others.join(', ')}`);
      if (!topicIds.has(id)) fail('id-not-in-topics', `id "${id}" is not listed in the master topic list (TOPICS.md)`);
    }

    const related = card.data?.related;
    if (Array.isArray(related)) {
      for (const ref of related) {
        if (typeof ref !== 'string' || ref.trim() === '') continue; // the schema reports these
        if (ref === id) fail('related-self', `related lists the card's own id "${ref}"`);
        else if (!filesById.has(ref) && !topicIds.has(ref)) {
          fail('related-unknown', `related id "${ref}" is neither a written card nor a topic in TOPICS.md`);
        }
      }
    }
    return failures;
  });
}

function cardId(card: ParsedCard): string | null {
  return typeof card.data?.id === 'string' ? card.data.id : null;
}

function checkCard(card: ParsedCard): CheckFailure[] {
  const id = cardId(card);
  const failures: CheckFailure[] = [...card.failures];
  const fail = (rule: RuleCode, detail: string) => failures.push({ file: card.file, id, rule, detail });

  if (card.data) checkMetadata(card.data, fail);
  checkSections(card.sections, fail);
  return failures;
}

type Fail = (rule: RuleCode, detail: string) => void;

function checkMetadata(data: Record<string, unknown>, fail: Fail) {
  const missing = REQUIRED_FIELDS.filter((field) => data[field] === undefined || data[field] === null);
  for (const field of missing) fail('metadata-missing', `${field} is required`);

  const result = cardSchema.safeParse(data);
  if (result.success) return;
  for (const issue of result.error.issues) {
    if (missing.includes(String(issue.path[0]))) continue;
    const value = issue.path.reduce<unknown>((v, key) => (v as Record<PropertyKey, unknown>)?.[key as PropertyKey], data);
    fail('metadata-invalid', `${issue.message} (got ${JSON.stringify(value)})`);
  }
}

function checkSections(sections: Section[], fail: Fail) {
  const seen = new Set<string>();
  for (const section of sections) {
    if (!TEMPLATE_SECTIONS.includes(section.title)) {
      fail('section-unknown', `"${section.title}" is not a template section (allowed: ${TEMPLATE_SECTIONS.join(', ')})`);
    } else if (seen.has(section.title)) {
      fail('section-duplicate', `"${section.title}" appears more than once`);
    }
    seen.add(section.title);
  }

  for (const title of TEMPLATE_SECTIONS) {
    if (!seen.has(title)) fail('section-missing', `"${title}" is required (template order: ${TEMPLATE_SECTIONS.join(', ')})`);
  }

  const firsts = TEMPLATE_SECTIONS.map((title) => sections.find((s) => s.title === title)).filter(
    (s): s is Section => s !== undefined,
  );
  for (const section of firsts) {
    if (section.empty) fail('section-empty', `"${section.title}" has no content`);
  }

  const actual = sections.filter((s) => TEMPLATE_SECTIONS.includes(s.title) && firsts.includes(s)).map((s) => s.title);
  const expected = firsts.map((s) => s.title);
  if (actual.join('\n') !== expected.join('\n')) {
    fail('section-order', `expected ${expected.join(', ')}; found ${actual.join(', ')}`);
  }

  const tradeOffs = firsts.find((s) => s.title === 'Trade-offs');
  if (tradeOffs && !tradeOffs.empty && !hasCostRow(tradeOffs.lines)) {
    fail('cost-row-missing', 'the Trade-offs table needs a row whose first cell is "cost"');
  }
}
