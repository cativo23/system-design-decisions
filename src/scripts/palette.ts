// The palette's behaviour (contracts/ui-contract.md § Palette). DOM glue only: every decision comes from
// src/lib/discovery/. Text and attributes only, no HTML strings. Loaded by shell.ts when the browser is idle.
//
// Shell renders the <dialog> again on every client-side navigation, so listeners sit on `document` and every
// element is looked up when needed; nothing from the first page load is kept (FR-022).
import { navigate } from 'astro:transitions/client';
import { search } from '../lib/discovery/match.ts';
import { moveCursor, nextPaletteState, selected, type PaletteEvent, type PaletteStatus } from '../lib/discovery/palette-state.ts';
import type { SearchEntry, SearchIndex } from '../lib/discovery/search-index.ts';

type IndexState = { state: 'pending' } | { state: 'ready'; entries: SearchEntry[] } | { state: 'failed' };

const MESSAGES = {
  hint: 'Type to search titles, aliases and tags.',
  loading: 'Loading…',
  error: 'Search is unavailable. Check your connection and try again.',
} as const;

let index: IndexState = { state: 'pending' };
let status: PaletteStatus = 'closed';
let results: SearchEntry[] = [];
let cursor = -1;
let returnTo: HTMLElement | null = null;

const el = {
  dialog: () => document.getElementById('palette') as HTMLDialogElement | null,
  input: () => document.getElementById('palette-input') as HTMLInputElement | null,
  list: () => document.getElementById('palette-results'),
  status: () => document.getElementById('palette-status'),
};

function dispatch(event: PaletteEvent) {
  status = nextPaletteState(status, event);
}

// ---------- the index: fetched once and kept in memory, so search keeps working offline (research.md R3) ----------
function loadIndex() {
  index = { state: 'pending' };
  fetch('/search-index.json')
    .then((response) => {
      if (!response.ok) throw new Error(`status ${response.status}`);
      return response.json() as Promise<SearchIndex>;
    })
    .then((data) => {
      // An unknown version is the error state, not a guess.
      if (data.version !== 1 || !Array.isArray(data.entries)) throw new Error('unknown index version');
      index = { state: 'ready', entries: data.entries };
      dispatch({ type: 'loaded' });
    })
    .catch(() => {
      index = { state: 'failed' };
      dispatch({ type: 'failed' });
    })
    .finally(render);
}
loadIndex(); // the module loads when the browser is idle, so this runs at idle too

// ---------- rendering ----------
function setStatus(text: string) {
  const line = el.status();
  if (line) line.textContent = text;
}

function option(entry: SearchEntry, position: number): HTMLLIElement {
  const li = document.createElement('li');
  li.id = `palette-opt-${position}`;
  li.setAttribute('role', 'option');
  const a = document.createElement('a');
  a.href = entry.href;
  a.tabIndex = -1;
  const title = document.createElement('span');
  title.className = 't';
  title.textContent = entry.title;
  const domain = document.createElement('span');
  domain.className = 'd';
  domain.textContent = entry.domain;
  const radar = document.createElement('span');
  radar.className = `radar sm ${entry.status}`;
  radar.textContent = entry.status.toUpperCase();
  a.append(title, domain, radar);
  li.append(a);
  return li;
}

function render() {
  const list = el.list();
  const input = el.input();
  if (!list || !input || status === 'closed') return;

  if (status === 'loading') return show([], MESSAGES.loading);
  if (status === 'error') return show([], MESSAGES.error);

  const query = input.value;
  if (query.trim() === '') return show([], MESSAGES.hint);
  const found = index.state === 'ready' ? search(index.entries, query) : [];
  if (found.length === 0) return show([], `No cards match “${query.trim()}”.`);
  show(found, `${found.length} result${found.length === 1 ? '' : 's'}`);
}

function show(found: SearchEntry[], message: string) {
  const list = el.list();
  const input = el.input();
  if (!list || !input) return;
  results = found;
  cursor = found.length > 0 ? 0 : -1;
  list.replaceChildren(...found.map(option));
  setStatus(message);
  input.setAttribute('aria-expanded', String(found.length > 0));
  highlight();
}

function highlight() {
  const list = el.list();
  const input = el.input();
  if (!list || !input) return;
  list.querySelectorAll('[role="option"]').forEach((li, i) => li.setAttribute('aria-selected', String(i === cursor)));
  if (cursor >= 0) {
    input.setAttribute('aria-activedescendant', `palette-opt-${cursor}`);
    document.getElementById(`palette-opt-${cursor}`)?.scrollIntoView({ block: 'nearest' });
  } else input.removeAttribute('aria-activedescendant');
}

// ---------- open and close (called by shell.ts) ----------
/** `opener` is the element that had focus before the palette appeared; shell.ts may already have shown the dialog. */
export function openPalette(opener: HTMLElement | null) {
  const dialog = el.dialog();
  const input = el.input();
  if (!dialog || !input) return;
  if (index.state === 'failed') loadIndex(); // a closed-then-reopened palette retries after a network failure
  if (status === 'closed') {
    returnTo = opener;
    input.value = ''; // a palette opens fresh: the last query is not kept

    dispatch({ type: 'open', index: index.state === 'ready' ? 'ready' : index.state === 'failed' ? 'failed' : 'pending' });
  }
  if (!dialog.open) dialog.showModal();
  input.focus();
  render();
}

// `close` does not bubble, so it is caught in the capture phase.
document.addEventListener(
  'close',
  (event) => {
    if ((event.target as Element)?.id !== 'palette') return;
    dispatch({ type: 'close' });
    results = [];
    cursor = -1;
    // After a navigation the old element is gone; the new page already moved focus to its title.
    if (returnTo?.isConnected) returnTo.focus();
    returnTo = null;
  },
  true,
);

// ---------- events, delegated ----------
document.addEventListener('input', (event) => {
  if ((event.target as Element)?.id === 'palette-input') render();
});

document.addEventListener('keydown', (event) => {
  if ((event.target as Element)?.id !== 'palette-input') return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    cursor = moveCursor(cursor, results.length, event.key === 'ArrowDown' ? 'down' : 'up');
    highlight();
  } else if (event.key === 'Escape') {
    // A search field's own Escape only clears its text; the palette must close on the first press.
    event.preventDefault();
    el.dialog()?.close();
  } else if (event.key === 'Enter') {
    const entry = selected(results, cursor);
    if (!entry) return;
    event.preventDefault();
    el.dialog()?.close();
    void navigate(entry.href);
  }
});

document.addEventListener('click', (event) => {
  const target = event.target as Element;
  if (target.id === 'palette') el.dialog()?.close(); // a click on the backdrop lands on the dialog itself
  else if (target.closest('#palette-results a')) el.dialog()?.close(); // the router follows the link
});
