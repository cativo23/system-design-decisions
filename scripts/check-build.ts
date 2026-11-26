// Build-output check (contracts/http-contract.md § Build-output checks, plan.md § Performance budget).
// The pure core, checkPage, is tested. The CLI below it only walks dist/ and prints.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';

const CSS_BUDGET = 2048;
const HTML_BUDGET = 51200;

// Link rels that make the browser fetch something. Plain navigation (<a>, canonical) is not a page resource.
const RESOURCE_RELS = new Set(['stylesheet', 'preload', 'modulepreload', 'prefetch', 'icon', 'apple-touch-icon', 'manifest']);
const OFFSITE = /^(https?:)?\/\//i;

function attributes(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

function tags(html: string, name: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'gi'))].map((m) => attributes(m[1]));
}

/** Returns one message per budget or noindex problem in a built page; [] when it's clean. */
export function checkPage(html: string, assetSizes: Record<string, number>): string[] {
  const problems: string[] = [];
  const offsite = (what: string, url: string) => problems.push(`${what} from another origin: ${url}`);

  const scripts = tags(html, 'script').length;
  if (scripts > 0) problems.push(`${scripts} <script> tag(s) found (JS budget is 0 bytes)`);

  const htmlBytes = Buffer.byteLength(html);
  if (htmlBytes > HTML_BUDGET) problems.push(`HTML is ${htmlBytes} bytes (budget ${HTML_BUDGET})`);

  const robots = tags(html, 'meta').some((a) => a.name?.toLowerCase() === 'robots' && /noindex/i.test(a.content ?? ''));
  if (!robots) problems.push('robots meta tag with noindex missing');

  let cssBytes = 0;
  for (const [, css] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    cssBytes += Buffer.byteLength(css);
    for (const [, url] of css.matchAll(/url\(\s*["']?([^"')\s]+)/gi)) if (OFFSITE.test(url)) offsite('style url()', url);
  }

  for (const link of tags(html, 'link')) {
    const rels = (link.rel ?? '').toLowerCase().split(/\s+/);
    const href = link.href ?? '';
    if (!rels.some((r) => RESOURCE_RELS.has(r))) continue;
    if (OFFSITE.test(href)) {
      offsite(`<link rel="${link.rel}">`, href);
    } else if (rels.includes('stylesheet')) {
      const size = assetSizes[href.split(/[?#]/)[0]];
      if (size === undefined) problems.push(`stylesheet ${href} not found in the build output`);
      else cssBytes += size;
    }
  }
  if (cssBytes > CSS_BUDGET) problems.push(`CSS is ${cssBytes} bytes (budget ${CSS_BUDGET})`);

  for (const tag of ['script', 'img']) {
    for (const { src } of tags(html, tag)) if (src && OFFSITE.test(src)) offsite(`<${tag}>`, src);
  }

  return problems;
}

function main() {
  const { positionals } = parseArgs({ strict: true, allowPositionals: true, options: {} });
  const dir = positionals[0] ?? 'dist';
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).sort();
  // URL path → size, for every stylesheet the pages might link.
  const assetSizes = Object.fromEntries(
    files.filter((f) => f.endsWith('.css')).map((f) => ['/' + f.split(sep).join('/'), statSync(join(dir, f)).size]),
  );
  const pages = files.filter((f) => f.endsWith('.html'));
  if (pages.length === 0) {
    console.error(`✗ no HTML pages found in ${dir}`);
    process.exit(1);
  }

  let failures = 0;
  for (const page of pages) {
    const path = join(dir, page);
    for (const problem of checkPage(readFileSync(path, 'utf8'), assetSizes)) {
      console.log(`✗ ${relative('.', path)}: ${problem}`);
      failures++;
    }
  }
  if (failures > 0) {
    console.log(`${failures} problem(s) in the build output`);
    process.exit(1);
  }
  console.log(`✓ ${pages.length} page(s) within budget and noindexed`);
}

if (import.meta.main) main();
