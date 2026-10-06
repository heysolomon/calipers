/**
 * Custom crosshair cursor — replaces the native browser cursor when Calipers is active.
 * Minimal mark only (no live X/Y readout) so the page stays readable.
 */
import { isCalipersElement } from './utils';

const CURSOR_ID = 'calipers-cursor';

let cursorEl: HTMLDivElement | null = null;
let rafId: number | null = null;

const pos = { x: -200, y: -200 };

function onMove(e: MouseEvent): void {
  const overUI = isCalipersElement(e.target as Element);
  if (overUI) {
    pos.x = -200;
    pos.y = -200;
    document.documentElement.style.cursor = '';
  } else {
    pos.x = e.clientX;
    pos.y = e.clientY;
    document.documentElement.style.cursor = 'none';
  }
}

function tick(): void {
  if (!cursorEl) return;
  cursorEl.style.left = `${pos.x}px`;
  cursorEl.style.top  = `${pos.y}px`;
  rafId = requestAnimationFrame(tick);
}

export function initCursor(): void {
  if (cursorEl) return;

  const el = document.createElement('div');
  el.id = CURSOR_ID;
  Object.assign(el.style, {
    position:      'fixed',
    left:          '-200px',
    top:           '-200px',
    transform:     'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex:        '2147483647',
    willChange:    'left, top',
    userSelect:    'none',
  });

  el.innerHTML = `
    <svg width="18" height="18" viewBox="-9 -9 18 18" style="display:block;overflow:visible;">
      <line x1="-9" y1="0" x2="-4" y2="0" stroke="#FF4500" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="4"  y1="0" x2="9"  y2="0" stroke="#FF4500" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="0" y1="-9" x2="0" y2="-4" stroke="#FF4500" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="0" y1="4"  x2="0" y2="9"  stroke="#FF4500" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="2.5" stroke="#FF4500" stroke-width="1.5" fill="none"/>
    </svg>
  `;

  document.documentElement.appendChild(el);
  cursorEl = el;

  document.documentElement.style.cursor = 'none';
  document.addEventListener('mousemove', onMove, { passive: true });
  rafId = requestAnimationFrame(tick);
}

export function destroyCursor(): void {
  document.removeEventListener('mousemove', onMove);
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  cursorEl?.remove();
  cursorEl = null;
  document.documentElement.style.cursor = '';
}
