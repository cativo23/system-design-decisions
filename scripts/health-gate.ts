// Post-deploy health gate (contracts/http-contract.md § Health gate). The pure core, checkResponse,
// is tested. The CLI below it only fetches, retries and picks the exit code.
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

export type Kind = 'version' | 'index' | 'card' | 'font';

export interface GateResponse {
  status: number;
  headers: Headers;
  body: string;
}

// The font's path is read from the index response, so it has no fixed entry here.
export const PATHS: Record<Exclude<Kind, 'font'>, string> = { version: '/version.txt', index: '/', card: '/cards/saga/' };

const ROBOTS_META = /<meta\b(?=[^>]*\bname=["']?robots\b)(?=[^>]*\bcontent=["'][^"']*noindex)[^>]*>/i;
const SAGA_LINK = /\bhref=["']?\/cards\/saga\/(?=["'\s>])/;
// Inline elements inside the heading are allowed (the typed title wraps the text in a <span>).
const SAGA_H1 = /<h1\b[^>]*>(?:\s|<[^>]+>)*Saga(?:\s|<\/?[^>]+>)*<\/h1>/i;

/** The first `<link rel="preload" as="font">` href in a page, or null. */
export function findFontHref(html: string): string | null {
  for (const [, attrs] of html.matchAll(/<link\b([^>]*)>/gi)) {
    if (!/\brel=["']?preload\b/i.test(attrs) || !/\bas=["']?font\b/i.test(attrs)) continue;
    const href = attrs.match(/\bhref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (href) return href[1] ?? href[2] ?? href[3];
  }
  return null;
}

/** Returns one message per failed assertion, each naming the URL path; [] when the response passes.
 * `path` names the URL for the `font` kind, whose path is only known at run time. */
export function checkResponse(kind: Kind, { status, headers, body }: GateResponse, expectedVersion: string, path?: string): string[] {
  const problems: string[] = [];
  const where = kind === 'font' ? (path ?? '(font)') : PATHS[kind];
  const fail = (message: string) => problems.push(`GET ${where}: ${message}`);

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
  if (kind === 'font') {
    // Proves the /_astro/ location kept X-Robots-Tag and the long cache (R12, R13).
    if (!/\bimmutable\b/i.test(headers.get('cache-control') ?? '')) fail(`Cache-Control "${headers.get('cache-control') ?? ''}" lacks immutable`);
    return problems;
  }
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

async function request(origin: URL, kind: Kind, version: string, path: string = kind === 'font' ? '' : PATHS[kind]) {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  try {
    // Node's fetch verifies TLS by default; no insecure flag is ever set.
    const res = await fetch(new URL(path, origin), {
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await res.text();
    return { kind, path, body, ms: elapsed(), problems: checkResponse(kind, { status: res.status, headers: res.headers, body }, version, path) };
  } catch (error) {
    return { kind, path, body: '', ms: elapsed(), problems: [`GET ${path}: ${describeFetchError(error)}`] };
  }
}

async function main() {
  const { origin, version } = readArgs();
  const kinds: Kind[] = ['version', 'index', 'card'];
  const deadline = Date.now() + DEADLINE_MS;

  for (;;) {
    const results = await Promise.all(kinds.map((k) => request(origin, k, version)));
    // Fourth request: a font file named by the index page (R13).
    const fontHref = findFontHref(results.find((r) => r.kind === 'index')?.body ?? '');
    if (fontHref === null) results.push({ kind: 'font', path: '/', body: '', ms: 0, problems: ['GET /: no font preload found'] });
    else results.push(await request(origin, 'font', version, new URL(fontHref, origin).pathname));
    const problems = results.flatMap((r) => r.problems);
    if (problems.length === 0) {
      console.log(`✓ site responds (version ${version})`);
      for (const r of results) console.log(`  GET ${r.path}  ${r.ms} ms`);
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
