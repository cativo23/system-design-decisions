// Post-deploy health gate (contracts/http-contract.md § Health gate). The pure core, checkResponse,
// is tested. The CLI below it only fetches, retries and picks the exit code.
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

export type Kind = 'version' | 'index' | 'card';

export interface GateResponse {
  status: number;
  headers: Headers;
  body: string;
}

export const PATHS: Record<Kind, string> = { version: '/version.txt', index: '/', card: '/cards/saga/' };

const ROBOTS_META = /<meta\b(?=[^>]*\bname=["']?robots\b)(?=[^>]*\bcontent=["'][^"']*noindex)[^>]*>/i;
const SAGA_LINK = /\bhref=["']?\/cards\/saga\/(?=["'\s>])/;
const SAGA_H1 = /<h1\b[^>]*>\s*Saga\s*<\/h1>/i;

/** Returns one message per failed assertion, each naming the URL path; [] when the response passes. */
export function checkResponse(kind: Kind, { status, headers, body }: GateResponse, expectedVersion: string): string[] {
  const problems: string[] = [];
  const fail = (message: string) => problems.push(`GET ${PATHS[kind]}: ${message}`);

  if (status !== 200) {
    fail(
      status >= 300 && status < 400
        ? `redirect ${status} to ${headers.get('location') ?? '(no Location)'}; redirects are not followed`
        : `status ${status}, expected 200`,
    );
    return problems;
  }

  if (kind === 'version') {
    const version = body.trim();
    if (version !== expectedVersion) fail(`serves version "${version}", expected "${expectedVersion}"`);
    return problems;
  }

  const robotsTag = headers.get('x-robots-tag');
  if (robotsTag === null) fail('X-Robots-Tag missing');
  else if (!/noindex/i.test(robotsTag)) fail(`X-Robots-Tag "${robotsTag}" lacks noindex`);
  if (!ROBOTS_META.test(body)) fail('robots meta tag with noindex missing');
  if (kind === 'index' && !SAGA_LINK.test(body)) fail('no link to /cards/saga/');
  if (kind === 'card' && !SAGA_H1.test(body)) fail('H1 "Saga" missing');
  return problems;
}

/** The reason a fetch rejected. Node hides it in `cause`; on dual-stack hosts the cause is an
 * AggregateError with an empty message, so the individual attempts are listed instead. */
export function describeFetchError(error: unknown): string {
  const err = error as Error & { cause?: Error & { errors?: Error[] } };
  const attempts = err.cause?.errors?.map((e) => e.message).join('; ');
  return err.cause?.message || attempts || err.message;
}

const USAGE ='usage: node scripts/health-gate.ts --origin <https://host> --expect-version <short-sha>';
const REQUEST_TIMEOUT_MS = 10_000;
const ROUND_INTERVAL_MS = 10_000;
const DEADLINE_MS = 180_000;

function readArgs(): { origin: URL; version: string } {
  try {
    const { values } = parseArgs({
      strict: true,
      options: { origin: { type: 'string' }, 'expect-version': { type: 'string' } },
    });
    const origin = new URL(values.origin ?? '');
    const version = values['expect-version'] ?? '';
    if (!/^https?:$/.test(origin.protocol) || version === '') throw new Error('--origin (http/https) and --expect-version are required');
    return { origin, version };
  } catch (error) {
    console.error(`${(error as Error).message}\n${USAGE}`);
    process.exit(2);
  }
}

async function request(origin: URL, kind: Kind, version: string) {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  try {
    // Node's fetch verifies TLS by default; no insecure flag is ever set.
    const res = await fetch(new URL(PATHS[kind], origin), {
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await res.text();
    return { kind, ms: elapsed(), problems: checkResponse(kind, { status: res.status, headers: res.headers, body }, version) };
  } catch (error) {
    return { kind, ms: elapsed(), problems: [`GET ${PATHS[kind]}: ${describeFetchError(error)}`] };
  }
}

async function main() {
  const { origin, version } = readArgs();
  const kinds: Kind[] = ['version', 'index', 'card'];
  const deadline = Date.now() + DEADLINE_MS;

  for (;;) {
    const results = await Promise.all(kinds.map((k) => request(origin, k, version)));
    const problems = results.flatMap((r) => r.problems);
    if (problems.length === 0) {
      console.log(`✓ site responds (version ${version})`);
      for (const r of results) console.log(`  GET ${PATHS[r.kind]}  ${r.ms} ms`);
      return;
    }
    if (Date.now() + ROUND_INTERVAL_MS > deadline) {
      console.log(`✗ site did not respond within ${DEADLINE_MS / 1000}s`);
      for (const p of problems) console.log(`  ${p}`);
      process.exit(1);
    }
    await sleep(ROUND_INTERVAL_MS);
  }
}

if (import.meta.main) await main();
