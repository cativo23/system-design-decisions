import { z } from 'astro/zod';
import { DOMAINS } from '../domains.ts';

// One definition of "valid card metadata", shared by the content collection
// and the validator (research.md R3). Messages name the allowed values or
// format so a failure is fixable from the report alone (SC-003).

export const RADAR_STATUSES = ['adopt', 'trial', 'assess', 'hold'] as const;
export type RadarStatus = (typeof RADAR_STATUSES)[number];

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const ID_MSG = 'id must be a lowercase slug (a-z, 0-9, single hyphens), e.g. "outbox-cdc"';
const ORDER_MSG = 'order must be a whole number ≥ 1';
const REVIEWED_MSG = 'reviewed must be a month written YYYY-MM (month 01–12)';
const DOMAIN_MSG = `domain must be one of ${DOMAINS.map((d) => d.slug).join(', ')}`;
const STATUS_MSG = `status must be one of ${RADAR_STATUSES.join(', ')}`;

function nonBlankText(field: string) {
  return z
    .string({ error: `${field} must be text` })
    .refine((s) => s.trim() !== '', { error: `${field} must not be blank` });
}

// Required list that may be empty; entries must be non-blank and unique.
function uniqueList(field: string) {
  return z
    .array(nonBlankText(`${field} entry`), { error: `${field} must be a list (use [] for none)` })
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      const reported = new Set<string>();
      for (const item of items) {
        if (seen.has(item) && !reported.has(item)) {
          ctx.addIssue({ code: 'custom', message: `${field} has duplicate "${item}"` });
          reported.add(item);
        }
        seen.add(item);
      }
    });
}

// Each related card carries the reason it is related (card format v2, contracts/card-format.md).
const relatedList = z
  .array(
    z.object({
      id: z.string({ error: 'related id must be text' }).regex(SLUG, { error: 'related id must be a lowercase slug, e.g. "outbox-cdc"' }),
      why: nonBlankText('why'),
    }),
    { error: 'related must be a list (use [] for none)' },
  )
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    const reported = new Set<string>();
    for (const { id } of items) {
      if (seen.has(id) && !reported.has(id)) {
        ctx.addIssue({ code: 'custom', message: `related has duplicate "${id}"` });
        reported.add(id);
      }
      seen.add(id);
    }
  });

export const cardSchema = z.object({
  id: z.string({ error: ID_MSG }).regex(SLUG, { error: ID_MSG }),
  title: nonBlankText('title'),
  domain: z.enum(DOMAINS.map((d) => d.slug) as [string, ...string[]], { error: DOMAIN_MSG }),
  order: z.number({ error: ORDER_MSG }).int({ error: ORDER_MSG }).min(1, { error: ORDER_MSG }),
  status: z.enum(RADAR_STATUSES, { error: STATUS_MSG }),
  reviewed: z.string({ error: REVIEWED_MSG }).regex(MONTH, { error: REVIEWED_MSG }),
  tags: uniqueList('tags'),
  aliases: uniqueList('aliases'),
  related: relatedList,
});

export type CardData = z.infer<typeof cardSchema>;
