import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The "CI provably fails on a broken card" proof: run the real CLI on fixtures.
const ROOT = new URL('../../', import.meta.url).pathname;

function validate(...args: string[]) {
  const result = spawnSync(process.execPath, ['scripts/validate-cards.ts', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
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
});
