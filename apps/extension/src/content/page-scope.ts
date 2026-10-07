/**
 * Everything drawn with Calipers belongs to the page it was drawn on. This
 * module names the current page and tells the modes when it changes, which on
 * single-page apps happens without a reload.
 */

/**
 * Identity of the current page: site + path. The query string is left out
 * (filters and tracking params are still the same page); a hash is included
 * only when it is a route (`#/settings`), as hash-routed apps use.
 */
export function pageId(): string {
  const { origin, pathname, hash } = window.location;
  const route = hash.startsWith('#/') || hash.startsWith('#!') ? hash : '';
  return `${origin}${pathname}${route}`;
}

type PageListener = (from: string, to: string) => void;

const listeners = new Set<PageListener>();
let current: string | null = null;

/** Run `listener` whenever the page changes while Calipers is open. */
export function onPageChange(listener: PageListener): void {
  listeners.add(listener);
}

let lastSeen: string | null = null;

function notify(from: string, to: string): void {
  for (const listener of listeners) listener(from, to);
}

/** Start tracking from the page Calipers is opened on. */
export function startPageTracking(): void {
  const now = pageId();
  // The page may have changed while Calipers was closed.
  if (lastSeen !== null && lastSeen !== now) notify(lastSeen, now);
  current = now;
}

export function stopPageTracking(): void {
  lastSeen = current ?? lastSeen;
  current = null;
}

/** Cheap enough to call every painted frame: one string compare unless the page actually changed. */
export function checkPage(): void {
  if (current === null) return;
  const now = pageId();
  if (now === current) return;
  const from = current;
  current = now;
  notify(from, now);
}

/**
 * Per-page memory for work that is not written to storage. Leaving a page
 * shelves what was on it; coming back to it during the same visit restores it.
 */
export function createPageShelf<T>(): { swap: (from: string, to: string, items: T[]) => T[] } {
  const shelf = new Map<string, T[]>();
  return {
    swap(from, to, items) {
      if (items.length > 0) shelf.set(from, items);
      else shelf.delete(from);
      const restored = shelf.get(to) ?? [];
      shelf.delete(to);
      return restored;
    },
  };
}
