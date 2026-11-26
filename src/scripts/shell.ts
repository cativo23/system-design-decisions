// DOM glue only: every decision comes from src/lib/layout/. Text and attributes only, no HTML strings.
import { scrollLabel } from '../lib/layout/scroll.ts';
import { currentSection } from '../lib/layout/toc.ts';
import { treeCurrent } from '../lib/layout/tree.ts';

// A section is "current" once its heading passes this line: below the sticky bar plus the heading's scroll margin
// (about 135 px), with slack so the last sections still win on short pages that cannot scroll further.
const READING_LINE = 200;

// A persisted element is moved in the DOM during the swap, which resets its scrollTop
// (verified in T058), so the tree's position is saved before and restored after (research.md R5).
let treeScroll = 0;
document.addEventListener('astro:before-swap', () => {
  treeScroll = document.getElementById('tree')?.scrollTop ?? 0;
});
document.addEventListener('astro:after-swap', () => {
  const tree = document.getElementById('tree');
  if (tree) tree.scrollTop = treeScroll;
});

let teardown: (() => void) | null = null;
let firstLoad = true;

// Runs on the first load and after every client-side navigation.
document.addEventListener('astro:page-load', () => {
  teardown?.();
  teardown = init(!firstLoad);
  firstLoad = false;
});

function init(navigated: boolean): () => void {
  const pct = document.getElementById('sl-pct');
  const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')];

  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (pct) pct.textContent = scrollLabel(window.scrollY, max);

    const tops = tocLinks.flatMap((a) => {
      const heading = document.getElementById(a.hash.slice(1));
      return heading ? [{ id: heading.id, top: heading.getBoundingClientRect().top }] : [];
    });
    const current = currentSection(tops, READING_LINE);
    for (const a of tocLinks) {
      const on = a.hash === `#${current}`;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };
  const schedule = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();

  markCurrentCard();
  if (navigated) focusTitle();

  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}

// The persisted tree still shows the previous card as current: re-mark it and open its domain,
// leaving the reader's other open/closed domains alone.
function markCurrentCard() {
  const tree = document.getElementById('tree');
  if (!tree) return;

  const domains = [...tree.querySelectorAll<HTMLDetailsElement>('details[data-domain]')].map((d) => ({
    number: Number(d.dataset.domain),
    cards: [...d.querySelectorAll<HTMLAnchorElement>('a[data-id]')].map((a) => ({ id: a.dataset.id!, href: a.getAttribute('href')! })),
  }));
  const current = treeCurrent(window.location.pathname, domains);

  for (const a of tree.querySelectorAll<HTMLAnchorElement>('a[data-id]')) {
    const here = a.dataset.id === current?.id;
    a.classList.toggle('here', here);
    if (here) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
    const glyph = a.querySelector<HTMLElement>('.st');
    if (glyph) glyph.textContent = here ? '◀' : (glyph.dataset.glyph ?? '○');
  }
  if (!current) return;

  const details = tree.querySelector<HTMLDetailsElement>(`details[data-domain="${current.domain}"]`);
  if (details) details.open = true;
  tree.querySelector('a[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
}

// After a navigation the new title gets focus so keyboard and screen-reader users start at the top.
function focusTitle() {
  const h1 = document.querySelector('h1');
  if (!h1) return;
  h1.setAttribute('tabindex', '-1');
  h1.focus({ preventScroll: true });
}
