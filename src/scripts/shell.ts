// DOM glue only: every decision comes from src/lib/layout/. Text and attributes only, no HTML strings.
import { nextFocusIndex, nextMenuState, type MenuEvent, type MenuState } from '../lib/layout/menu.ts';
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
  document.documentElement.dataset.js = ''; // the swap replaces <html> attributes
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
  // Marks that scripts run, so the phone menu button (useless without them) only shows then.
  document.documentElement.dataset.js = '';
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

// ---------- phone menu (research.md R7, R8) ----------
// Delegated listeners, bound once: the top bar re-renders on every page, the tree does not.
let menu: MenuState = 'closed';
const INERT_REGIONS = 'header, main, .toc';

function dispatch(event: MenuEvent) {
  const next = nextMenuState(menu, event);
  if (next === menu) return;
  menu = next;
  const open = menu === 'open';
  document.body.dataset.menu = menu;
  document.querySelector<HTMLElement>('.backdrop')!.hidden = !open;
  for (const region of document.querySelectorAll<HTMLElement>(INERT_REGIONS)) region.inert = open;
  const button = document.querySelector<HTMLElement>('.menu-btn');
  button?.setAttribute('aria-expanded', String(open));
  if (open) document.querySelector<HTMLElement>('.tree-close')?.focus();
  else button?.focus();
}

document.addEventListener('click', (e) => {
  const target = e.target as Element;
  if (target.closest('.menu-btn')) dispatch('open');
  else if (target.closest('.tree-close')) dispatch('close');
  else if (target.closest('.backdrop')) dispatch('backdrop');
  else if (target.closest('#tree a')) dispatch('navigate');
});

document.addEventListener('keydown', (e) => {
  if (menu !== 'open') return;
  if (e.key === 'Escape') return dispatch('escape');
  if (e.key !== 'Tab') return;
  const items = [...document.querySelectorAll<HTMLElement>('#tree .tree-close, #tree summary, #tree a')].filter((el) => el.offsetParent !== null);
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next = nextFocusIndex(index, items.length, e.shiftKey);
  // Only take over at the ends; everywhere else the browser's own Tab order is the right one.
  if (next >= 0 && (e.shiftKey ? index <= 0 : index === items.length - 1)) {
    e.preventDefault();
    items[next].focus();
  }
});

document.addEventListener('astro:before-swap', () => dispatch('navigate'));
window.matchMedia('(min-width: 881px)').addEventListener('change', (e) => e.matches && dispatch('close'));

// Related spotlight: the glow follows the pointer through two custom properties (set via the CSSOM, no HTML).
document.addEventListener('pointermove', (e) => {
  const card = (e.target as Element).closest?.<HTMLElement>('.rel');
  if (!card) return;
  const box = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${e.clientX - box.left}px`);
  card.style.setProperty('--my', `${e.clientY - box.top}px`);
});
