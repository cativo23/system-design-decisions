import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The "CI provably fails on a broken card" proof: run the real CLI on fixtures.
const ROOT = new URL('../../', import.meta.url).pathname;

function validate(...args: string[]) {
  return validateWithEnv({ GITHUB_STEP_SUMMARY: '' }, ...args);
}

function validateWithEnv(env: Record<string, string>, ...args: string[]) {
  const result = spawnSync(process.execPath, ['scripts/validate-cards.ts', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

const fixture = (set: string) => ['--cards', `tests/fixtures/${set}/cards`, '--topics', `tests/fixtures/${set}/TOPICS.md`];

describe('validate-cards CLI', () => {
  it('should exit 0 on the valid fixtures', () => {
    const { code, stdout } = validate(...fixture('valid'), '--today', '2026-11-23');
    expect(stdout).toContain('✓ 1 card(s) valid');
    expect(code).toBe(0);
  });

  it('should exit 1 and report every seeded rule in a single run on the broken fixtures', () => {
    const { code, stdout } = validate(...fixture('broken'), '--today', '2026-11-23');
    expect(code).toBe(1);
    const seededRules = readdirSync(new URL('../fixtures/broken/cards/', import.meta.url))
      .map((f) => f.replace(/(-twin)?\.mdx$/, ''));
    // Card format v2 codes (SC-008): each needs its own failing fixture, so none can be dropped silently.
    const v2Rules = [
      'tldr-shape',
      'related-why-missing',
      'use-avoid-shape',
      'tradeoffs-shape',
      'meter-missing',
      'meter-range',
      'wild-entry-malformed',
      'pitfall-malformed',
      'source-malformed',
    ];
    for (const rule of v2Rules) expect(seededRules, `no fixture for ${rule}`).toContain(rule);
    for (const rule of new Set(seededRules)) {
      expect(stdout, `missing ${rule}`).toMatch(new RegExp(`^✗ \\S+/${rule}\\.mdx \\(\\S+\\) ${rule}: `, 'm'));
    }
  });

  it('should exit 2 when the topics file is missing', () => {
    const { code, stderr } = validate('--cards', 'tests/fixtures/valid/cards', '--topics', 'nope/TOPICS.md');
    expect(stderr).toContain('nope/TOPICS.md');
    expect(code).toBe(2);
  });

  it('should exit 2 on an unknown option', () => {
    const { code, stderr } = validate('--wat');
    expect(stderr).toMatch(/wat/);
    expect(code).toBe(2);
  });

  it('should list a stale card with its age and still exit 0', () => {
    const { code, stdout } = validate(...fixture('valid'), '--today', '2028-01-15');
    expect(stdout).toContain('Staleness report (run date 2028-01):');
    expect(stdout).toContain('  alpha  reviewed 2026-10  15 months old  tests/fixtures/valid/cards/alpha.mdx');
    expect(code).toBe(0);
  });

  it('should append the Markdown report to GITHUB_STEP_SUMMARY when it is set', () => {
    const summary = join(mkdtempSync(join(tmpdir(), 'sfg-')), 'summary.md');
    writeFileSync(summary, '# earlier step\n');
    const { code } = validateWithEnv({ GITHUB_STEP_SUMMARY: summary }, ...fixture('valid'), '--today', '2028-01-15');
    expect(code).toBe(0);
    const md = readFileSync(summary, 'utf8');
    expect(md.startsWith('# earlier step\n')).toBe(true);
    expect(md).toContain('### Card checks');
    expect(md).toContain('| alpha | 2026-10 | 15 months |');
  });
});

