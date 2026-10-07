/**
 * Calipers' own controls should not appear in screenshots. Guides, measurements,
 * annotations and labels stay — they are the reason for the screenshot — but
 * the toolbar, toasts, the cursor mark and dev tools are hidden while the
 * browser captures the tab.
 */

const CHROME_SELECTOR = [
  '#calipers-panel',
  '#calipers-toaster',
  '#calipers-cursor',
  '#calipers-dialkit',
  '#calipers-shortcuts-panel',
].join(',');

let hidden: { el: HTMLElement; visibility: string }[] = [];

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/** Run `capture` with the controls hidden, and bring them back whatever happens. */
export async function withChromeHidden<T>(capture: () => Promise<T>): Promise<T> {
  hidden = [...document.querySelectorAll<HTMLElement>(CHROME_SELECTOR)].map((el) => {
    const visibility = el.style.visibility;
    el.style.visibility = 'hidden';
    return { el, visibility };
  });
  // The capture reads what is on screen, so wait until the hidden state has actually painted.
  await nextPaint();
  try {
    return await capture();
  } finally {
    for (const { el, visibility } of hidden) el.style.visibility = visibility;
    hidden = [];
  }
}
