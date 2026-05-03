/**
 * DOM-based floating labels — glassmorphic pills that appear above the canvas.
 * Using DOM instead of canvas drawing enables real backdrop-filter blur.
 */
import { uid, copyToClipboard } from './utils';

const LABEL_STYLE = `
  position: absolute;
  background: rgba(20, 20, 28, 0.85);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 450;
  letter-spacing: 0.01em;
  padding: 3px 8px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.2);
  pointer-events: all;
  cursor: pointer;
  user-select: none;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity;
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

/** Remove all labels from the container */
export function clearLabels(container: HTMLElement): void {
  for (const { el } of labels.values()) {
    if (el.parentNode === container) container.removeChild(el);
  }
  labels.clear();
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
