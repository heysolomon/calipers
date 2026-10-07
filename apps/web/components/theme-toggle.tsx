'use client';

import { THEME_COLOUR, THEME_KEY } from '../lib/theme';

/**
 * Switches between the light and dark themes. The theme lives on <html> and
 * the icon is chosen in CSS from it, so nothing here depends on state that
 * the server could not know.
 */
export function ThemeToggle() {
  const toggle = (): void => {
    const root = document.documentElement;
    const next = root.dataset['theme'] === 'dark' ? 'light' : 'dark';
    root.dataset['theme'] = next;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOUR[next]);
    // Private windows can refuse storage; the theme still changes for this visit.
    try { localStorage.setItem(THEME_KEY, next); } catch { /* not saved */ }
  };

  return (
    <button type="button" onClick={toggle} data-demo-ui="true" aria-label="Switch between light and dark theme" className="lp-icon-button lp-tip theme-toggle" data-tip="Switch theme">
      <svg className="theme-moon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
      <svg className="theme-sun" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
    </button>
  );
}
