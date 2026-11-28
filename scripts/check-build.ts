// Build-output check (specs/002-design-system-card-layout/contracts/build-budget.md).
// The pure core, checkPage, is tested. The CLI below it only walks dist/ and prints.
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

// Limits per HTML page (1 KB = 1024 bytes). Text is gzip level 6, as nginx serves it; fonts are raw woff2.
// Changing one needs a reason in plan.md § Performance budget (constitution VI).
export const BUDGETS = {
  js: 12 * 1024,
  css: 8 * 1024,
  fonts: 110 * 1024,
  html: 51200,
  page: 150 * 1024,
};

export type Assets = Record<string, Uint8Array | string>;
export interface PageSizes {
  js: number;
  css: number;
  fonts: number;
  html: number;
  page: number;
}

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

const gzip = (data: Uint8Array | string) => gzipSync(data, { level: 6 }).length;
const text = (data: Uint8Array | string) => (typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
const bare = (url: string) => url.split(/[?#]/)[0];

interface Analysis {
  sizes: PageSizes;
  problems: string[];
}

function analyze(html: string, assets: Assets): Analysis {
  const problems: string[] = [];
  const offsite = (what: string, url: string) => problems.push(`${what} from another origin: ${url}`);
  const missing = (what: string, url: string) => problems.push(`${what} ${url} not found in the build output`);

  let css = 0;
  let js = 0;
  const cssTexts: { base: string; css: string }[] = [];

  // CSS: inline <style> and same-origin stylesheets.
  for (const [, body] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    css += gzip(body);
    cssTexts.push({ base: '/', css: body });
  }
  for (const link of tags(html, 'link')) {
    const rels = (link.rel ?? '').toLowerCase().split(/\s+/);
    const href = link.href ?? '';
    if (!rels.some((r) => RESOURCE_RELS.has(r))) continue;
    if (OFFSITE.test(href)) {
      offsite(`<link rel="${link.rel}">`, href);
    } else if (rels.includes('stylesheet')) {
      const asset = assets[bare(href)];
      if (asset === undefined) missing('stylesheet', href);
      else {
        css += gzip(asset);
        cssTexts.push({ base: posix.dirname(bare(href)), css: text(asset) });
      }
    }
  }

  // Fonts: every same-origin woff2 a stylesheet points at, each counted once.
  const fontUrls = new Set<string>();
  for (const { base, css: body } of cssTexts) {
    for (const [, url] of body.matchAll(/url\(\s*["']?([^"')\s]+)/gi)) {
      if (OFFSITE.test(url)) offsite('style url()', url);
      else if (/\.woff2?$/i.test(bare(url))) fontUrls.add(url.startsWith('/') ? bare(url) : posix.join(base, bare(url)));
    }
  }
  let fonts = 0;
  for (const url of fontUrls) {
    const asset = assets[url];
    if (asset === undefined) missing('font', url);
    else fonts += asset.length;
  }

  // JS: inline scripts, plus same-origin scripts and every chunk they import, each chunk once.
  const seen = new Set<string>();
  const visit = (url: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    const asset = assets[url];
    if (asset === undefined) return missing('script', url);
    js += gzip(asset);
    // The bundler writes dynamic imports with backticks (import(`./x.js`)), so all three quote kinds count.
    for (const [, spec] of text(asset).matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'`](\.{1,2}\/[^"'`]+)["'`]/g)) {
      visit(posix.join(posix.dirname(url), bare(spec)));
    }
  };
  for (const script of tags(html, 'script')) {
    if (script.src === undefined) continue;
    if (OFFSITE.test(script.src)) offsite('<script>', script.src);
    else visit(bare(script.src));
  }
  for (const [, body] of html.matchAll(/<script\b(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi)) js += gzip(body);

  for (const { src } of tags(html, 'img')) if (src && OFFSITE.test(src)) offsite('<img>', src);

  const htmlBytes = Buffer.byteLength(html);
  const sizes = { js, css, fonts, html: htmlBytes, page: gzip(html) + js + css + fonts };

  const over = (what: string, n: number, budget: number) => {
    if (n > budget) problems.push(`${what} is ${n} bytes (budget ${budget})`);
  };
  over('JavaScript', js, BUDGETS.js);
  over('CSS', css, BUDGETS.css);
  over('Fonts', fonts, BUDGETS.fonts);
  over('HTML', htmlBytes, BUDGETS.html);
  over('Page', sizes.page, BUDGETS.page);

  const robots = tags(html, 'meta').some((a) => a.name?.toLowerCase() === 'robots' && /noindex/i.test(a.content ?? ''));
  if (!robots) problems.push('robots meta tag with noindex missing');

  problems.push(...structureProblems(html, cssTexts.map((c) => c.css).join('\n')));
  return { sizes, problems };
}

// The text between the braces of the first block that starts at `from`, found by counting braces.
function block(css: string, from: number): string {
  let depth = 0;
  for (let i = css.indexOf('{', from); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(css.indexOf('{', from) + 1, i);
  }
  return '';
}

function structureProblems(html: string, css: string): string[] {
  const problems: string[] = [];

  const h1 = tags(html, 'h1').length;
  if (h1 !== 1) problems.push(`expected exactly one <h1>, found ${h1}`);

  // Every page, the home included, has the skip link and the landmarks.
  const body = html.slice(Math.max(0, html.search(/<body\b/i)));
  const firstLink = tags(body, 'a')[0];
  if (firstLink?.href !== '#main') problems.push('the first link in <body> must be the skip link (href="#main")');
  if (!tags(html, '[a-z]+').some((a) => a.id === 'main')) problems.push('no element with id="main" for the skip link to reach');
  if (tags(html, 'header').length === 0) problems.push('<header> landmark missing');
  if (tags(html, 'main').length === 0) problems.push('<main> landmark missing');
  for (const tag of ['nav', 'aside']) {
    if (tags(html, tag).some((a) => (a['aria-label'] ?? '').trim() === '')) problems.push(`a <${tag}> has no aria-label`);
  }

  // The palette lives in the shell: every page with the top bar needs a live trigger and exactly one dialog.
  if (/<header\b[^>]*\bclass=["'][^"']*\btopbar\b/i.test(html)) {
    const trigger = tags(html, 'button').some((b) => /\bsearch\b/.test(b.class ?? '') && b['aria-disabled'] === undefined);
    if (!trigger) problems.push('no search trigger: expected a <button class="search"> that is not aria-disabled');
    const dialogs = tags(html, 'dialog').filter((d) => d.id === 'palette').length;
    if (dialogs !== 1) problems.push(`expected exactly one <dialog id="palette">, found ${dialogs}`);
  }

  if (!/\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/i.test(css)) {
    problems.push('CSS lacks the [hidden] rule with display: none !important (constitution V)');
  }
  const motion = [...css.matchAll(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/gi)].map((m) => block(css, m.index));
  if (!motion.some((b) => /animation\s*:\s*none/i.test(b) && /transition\s*:\s*none/i.test(b))) {
    problems.push('CSS lacks a prefers-reduced-motion: reduce block that sets animation and transition to none (constitution V)');
  }
  return problems;
}

/** Returns one message per budget or noindex problem in a built page; [] when it's clean. */
export function checkPage(html: string, assets: Assets): string[] {
  return analyze(html, assets).problems;
}

export function measurePage(html: string, assets: Assets): PageSizes {
  return analyze(html, assets).sizes;
}

export function formatReport(rows: (PageSizes & { file: string })[]): string {
  const header = `${'page'.padEnd(28)}${['js', 'css', 'fonts', 'html', 'page'].map((h) => h.padStart(9)).join('')}`;
  const limits = `${'budget'.padEnd(28)}${[BUDGETS.js, BUDGETS.css, BUDGETS.fonts, BUDGETS.html, BUDGETS.page].map((n) => String(n).padStart(9)).join('')}`;
  const lines = rows.map(
    (r) => `${r.file.padEnd(28)}${[r.js, r.css, r.fonts, r.html, r.page].map((n) => String(n).padStart(9)).join('')}`,
  );
  return [header, limits, ...lines].join('\n');
}

function main() {
  const { positionals, values } = parseArgs({ strict: true, allowPositionals: true, options: { report: { type: 'boolean' } } });
  const dir = positionals[0] ?? 'dist';
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).sort();
  // URL path → content, for every asset the pages might reference.
  const assets: Assets = Object.fromEntries(
    files.filter((f) => /\.(css|m?js|woff2?)$/.test(f)).map((f) => ['/' + f.split(sep).join('/'), readFileSync(join(dir, f))]),
  );
  const pages = files.filter((f) => f.endsWith('.html'));
  if (pages.length === 0) {
    console.error(`✗ no HTML pages found in ${dir}`);
    process.exit(1);
  }

  if (values.report) {
    console.log(formatReport(pages.map((p) => ({ file: p, ...measurePage(readFileSync(join(dir, p), 'utf8'), assets) }))));
    return;
  }

  let failures = 0;
  for (const page of pages) {
    const path = join(dir, page);
    for (const problem of checkPage(readFileSync(path, 'utf8'), assets)) {
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
