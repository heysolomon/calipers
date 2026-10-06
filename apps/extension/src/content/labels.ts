/**
 * DOM-based floating labels — glassmorphic pills that appear above the canvas.
 * Using DOM instead of canvas drawing enables real backdrop-filter blur.
 */
import { uid, copyToClipboard } from './utils';

const LABEL_STYLE = `
  position: absolute;
  background: rgba(247, 247, 247, 0.96);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  color: #000;
  font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.01em;
  padding: 3px 8px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  pointer-events: all;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity;
`;

const TOAST_STYLE = `
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%) translateY(0);
  background: rgba(80, 200, 140, 0.9);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.95);
  font-family: 'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  padding: 6px 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: 2147483647;
`;

type LabelEntry = { el: HTMLElement; id: string; text: string };
const labels = new Map<string, LabelEntry>();
let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let toastEl: HTMLElement | null = null;
let errorReportEl: HTMLElement | null = null;

const ERROR_REPORT_STYLE = `
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: min(420px, calc(100vw - 32px));
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.04);
  font-family: 'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #000;
  z-index: 2147483647;
  pointer-events: all;
  overflow: hidden;
`;

/** Create or update a named label at the given position */
export function setLabel(
  container: HTMLElement,
  name: string,
  text: string,
  x: number,
  y: number,
  copyValue?: string,
): void {
  let entry = labels.get(name);

  if (!entry) {
    const el = document.createElement('div');
    el.id = uid();
    el.setAttribute('style', LABEL_STYLE);
    el.setAttribute('data-calipers-label', name);
    container.appendChild(el);

    el.addEventListener('click', async () => {
      const val = el.dataset['copyValue'] ?? el.textContent ?? '';
      await copyToClipboard(val);
      showToast('Copied!');
    });

    entry = { el, id: el.id, text };
    labels.set(name, entry);
  }

  const { el } = entry;
  el.textContent = text;
  if (copyValue !== undefined) el.dataset['copyValue'] = copyValue;

  // Position: clamp within viewport
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const labelW = 100; // approx — DOM hasn't reflow'd yet
  const labelH = 24;

  const clampedX = Math.max(4, Math.min(vpW - labelW - 4, x));
  const clampedY = Math.max(4, Math.min(vpH - labelH - 4, y));

  el.style.left = `${clampedX}px`;
  el.style.top = `${clampedY}px`;
  el.style.opacity = '1';
}

/** Hide (but don't remove) a label */
export function hideLabel(name: string): void {
  const entry = labels.get(name);
  if (entry) {
    entry.el.style.opacity = '0';
  }
}

/** Fully remove a named label from the DOM and registry */
export function removeLabel(name: string): void {
  const entry = labels.get(name);
  if (!entry) return;
  entry.el.remove();
  labels.delete(name);
}

/** Remove labels that belong to the given container (leaves other layers alone). */
export function clearLabels(container: HTMLElement): void {
  for (const [name, entry] of [...labels.entries()]) {
    if (entry.el.parentNode === container) {
      entry.el.remove();
      labels.delete(name);
    }
  }
}

/** Show a brief "Copied!" toast notification */
export function showToast(message: string, duration = 1500): void {
  if (toastEl) {
    toastEl.remove();
    toastEl = null;
  }
  if (toastTimeout) clearTimeout(toastTimeout);

  const toast = document.createElement('div');
  toast.setAttribute('style', TOAST_STYLE);
  toast.textContent = message;
  document.documentElement.appendChild(toast);
  toastEl = toast;

  // Spring entrance
  requestAnimationFrame(() => {
    toast.style.transition =
      'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    toast.style.transform = 'translateX(-50%) translateY(-4px)';
    toast.style.opacity = '1';
  });

  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(4px)';
    setTimeout(() => toast.remove(), 300);
    toastEl = null;
    toastTimeout = null;
  }, duration);
}

function dismissErrorReport(): void {
  if (!errorReportEl) return;
  errorReportEl.remove();
  errorReportEl = null;
}

/** Build a paste-ready diagnostic blob for screenshot / capture failures. */
export function formatCaptureErrorReport(action: string, error: string): string {
  const manifest = chrome.runtime.getManifest();
  return [
    'Calipers capture error (paste this in chat)',
    `action: ${action}`,
    `error: ${error}`,
    `url: ${location.href}`,
    `version: ${manifest.version}`,
    `extensionId: ${chrome.runtime.id}`,
    `userAgent: ${navigator.userAgent}`,
    `time: ${new Date().toISOString()}`,
  ].join('\n');
}

/**
 * Log a paste-ready capture failure to the page console, and show a short toast.
 * DevTools → Console is more reliable than clipboard in content scripts.
 */
export function showErrorReport(action: string, error: string): void {
  dismissErrorReport();

  const report = formatCaptureErrorReport(action, error);

  // Always dump to console so the user can copy from DevTools
  console.error(`[Calipers] ${action} failed\n${report}`);
  console.error('[Calipers] error object:', { action, error, report });

  showToast(`${action} failed — see Console (F12) for details`, 4000);

  // Lightweight card pointing at the console (no clipboard dependency)
  const card = document.createElement('div');
  card.setAttribute('style', ERROR_REPORT_STYLE);
  card.setAttribute('role', 'alertdialog');
  card.setAttribute('aria-label', `${action} failed`);

  const header = document.createElement('div');
  header.style.cssText = `
    display:flex;align-items:flex-start;justify-content:space-between;gap:10px;
    padding:12px 14px;
  `;

  const titleWrap = document.createElement('div');
  const title = document.createElement('div');
  title.style.cssText = 'font-size:13px;font-weight:600;letter-spacing:-0.02em;';
  title.textContent = `${action} failed`;
  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:#737373;margin-top:4px;letter-spacing:-0.01em;line-height:1.4;';
  hint.innerHTML = 'Open DevTools (<kbd style="font:inherit;font-size:10px;background:#f5f5f5;border:1px solid #ddd;border-bottom-width:2px;border-radius:3px;padding:0 4px;">F12</kbd> / Console), copy the red <code style="font:inherit;font-size:10px;background:#f5f5f5;padding:0 3px;border-radius:3px;">[Calipers]</code> error, and paste it here.';
  titleWrap.appendChild(title);
  titleWrap.appendChild(hint);

  const close = document.createElement('button');
  close.type = 'button';
  close.title = 'Dismiss';
  close.textContent = '×';
  close.style.cssText = `
    width:28px;height:28px;border:none;border-radius:7px;background:transparent;
    color:#A3A3A3;font-size:18px;line-height:1;cursor:pointer;flex-shrink:0;
    font-family:inherit;
  `;
  close.addEventListener('click', dismissErrorReport);

  header.appendChild(titleWrap);
  header.appendChild(close);
  card.appendChild(header);
  document.documentElement.appendChild(card);
  errorReportEl = card;

  // Auto-dismiss the pointer card; the console log stays
  window.setTimeout(() => {
    if (errorReportEl === card) dismissErrorReport();
  }, 12000);
}
