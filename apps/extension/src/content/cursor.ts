/**
 * Custom crosshair cursor — replaces the native browser cursor when Calipers is active.
 * Shows a precision crosshair SVG with live X/Y coordinates, hidden when hovering
 * over any Calipers UI element.
 */
import { isCalipersElement } from './utils';

const CURSOR_ID    = 'calipers-cursor';
const CURSOR_X_ID  = 'calipers-cursor-x';
const CURSOR_Y_ID  = 'calipers-cursor-y';

let cursorEl: HTMLDivElement | null = null;
let xEl: HTMLElement | null = null;
let yEl: HTMLElement | null = null;
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
  if (!cursorEl || !xEl || !yEl) return;
  cursorEl.style.left = `${pos.x}px`;
  cursorEl.style.top  = `${pos.y}px`;
  const px = String(Math.max(0, Math.round(pos.x))).padStart(4, '0');
  const py = String(Math.max(0, Math.round(pos.y))).padStart(4, '0');
  xEl.textContent = `X:${px}`;
  yEl.textContent = `Y:${py}`;
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
    <div style="position:absolute;top:12px;left:12px;font-family:'JetBrains Mono','SF Mono',ui-monospace,monospace;font-size:9px;line-height:1.4;letter-spacing:0.06em;color:#FF4500;white-space:nowrap;">
      <div id="${CURSOR_X_ID}">X:0000</div>
      <div id="${CURSOR_Y_ID}">Y:0000</div>
    </div>
  `;

  document.documentElement.appendChild(el);
  cursorEl = el;
  xEl = document.getElementById(CURSOR_X_ID);
  yEl = document.getElementById(CURSOR_Y_ID);

  document.documentElement.style.cursor = 'none';
  document.addEventListener('mousemove', onMove, { passive: true });
  rafId = requestAnimationFrame(tick);
}

export function destroyCursor(): void {
  document.removeEventListener('mousemove', onMove);
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  cursorEl?.remove();
  cursorEl = null;
  xEl = null;
  yEl = null;
  document.documentElement.style.cursor = '';
}
