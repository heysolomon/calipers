/**
 * Custom crosshair cursor — replaces the native browser cursor when Calipers is active.
 * Minimal mark only (no live X/Y readout) so the page stays readable.
 */
import { isCalipersElement } from './utils';
import { HIDE_CURSOR_CLASS } from './overlay';
import { trackPointerTarget } from './pointer';

const CURSOR_ID = 'calipers-cursor';

let cursorEl: HTMLDivElement | null = null;
const OFFSCREEN = -200;

/** What the custom cursor should look like at the current pointer position. */
export type CursorKind = 'crosshair' | 'text' | 'delete' | 'remove' | 'move-x' | 'move-y';

/**
 * Modes can override cursor appearance (e.g. colour picker shows a native
 * text I-beam over text runs, the crosshair mark everywhere else).
 */
let resolveCursor: (() => CursorKind) | null = null;

export function setCursorResolver(fn: (() => CursorKind) | null): void {
  resolveCursor = fn;
}

let nativeHidden: boolean | null = null;

/** Hide or show the page's own cursor. Only touches the DOM when the state actually changes. */
function hideNativeCursor(hide: boolean): void {
  if (nativeHidden === hide) return;
  nativeHidden = hide;
  document.documentElement.classList.toggle(HIDE_CURSOR_CLASS, hide);
}

/** Move with a transform (no layout), written in the event itself so the mark never trails by a frame. */
function place(x: number, y: number): void {
  if (cursorEl) cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

let shownKind: CursorKind | null = null;
let last = { x: OFFSCREEN, y: OFFSCREEN, overUI: true };

const GLYPH_OF: Record<CursorKind, string | null> = {
  crosshair: 'crosshair', text: null, delete: 'delete', remove: 'remove', 'move-x': 'move', 'move-y': 'move',
};

/** Swap the visible mark. Glyphs cross-fade and scale so a change of meaning is noticeable. */
function setKind(kind: CursorKind): void {
  if (!cursorEl || shownKind === kind) return;
  shownKind = kind;
  const active = GLYPH_OF[kind];
  cursorEl.querySelectorAll<HTMLElement>('[data-glyph]').forEach((g) => {
    const on = g.dataset['glyph'] === active;
    g.style.opacity = on ? '1' : '0';
    const turn = g.dataset['glyph'] === 'move' && kind === 'move-x' ? ' rotate(90deg)' : '';
    g.style.transform = `scale(${on ? 1 : 0.6})${turn}`;
  });
}

function apply(): void {
  if (last.overUI) {
    place(OFFSCREEN, OFFSCREEN);
    hideNativeCursor(false);
    return;
  }

  const kind = resolveCursor ? resolveCursor() : 'crosshair';
  setKind(kind);
  if (kind === 'text') {
    // Hide the mark and defer to the browser's native I-beam.
    place(OFFSCREEN, OFFSCREEN);
    hideNativeCursor(false);
  } else {
    place(last.x, last.y);
    hideNativeCursor(true);
  }
}

function onMove(e: MouseEvent): void {
  last = { x: e.clientX, y: e.clientY, overUI: isCalipersElement(e.target as Element) };
  trackPointerTarget(e.target as Element);
  apply();
}

/** Re-evaluate the cursor without waiting for the pointer to move (e.g. after a click changes what is under it). */
export function refreshCursor(): void {
  apply();
}

export function initCursor(): void {
  if (cursorEl) return;

  const el = document.createElement('div');
  el.id = CURSOR_ID;
  Object.assign(el.style, {
    position:      'fixed',
    left:          '0',
    top:           '0',
    // Centre the 18px mark on the pointer without a second transform
    margin:        '-9px 0 0 -9px',
    transform:     `translate3d(${OFFSCREEN}px, ${OFFSCREEN}px, 0)`,
    pointerEvents: 'none',
    zIndex:        '2147483647',
    willChange:    'transform',
    userSelect:    'none',
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Slight overshoot so the change reads as a "pop"; glyphs are stacked and cross-fade.
  const glyph = (name: string, visible: boolean, svg: string): string => `
    <div data-glyph="${name}" style="
      position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      opacity:${visible ? 1 : 0};transform:scale(${visible ? 1 : 0.6});
      transition:${reduce ? 'none' : 'opacity 0.14s ease-out, transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1)'};
    ">${svg}</div>`;

  const ARROWS = 'M0 -8.5V8.5M-3.5 -5L0 -8.5L3.5 -5M-3.5 5L0 8.5L3.5 5';

  el.innerHTML = `
    <div style="position:relative;width:18px;height:18px;">
      ${glyph('crosshair', true, `
        <svg width="18" height="18" viewBox="-9 -9 18 18" style="display:block;overflow:visible;">
          <line x1="-9" y1="0" x2="-4" y2="0" stroke="#FF4500" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="4"  y1="0" x2="9"  y2="0" stroke="#FF4500" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="0" y1="-9" x2="0" y2="-4" stroke="#FF4500" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="0" y1="4"  x2="0" y2="9"  stroke="#FF4500" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="0" cy="0" r="2.5" stroke="#FF4500" stroke-width="1.5" fill="none"/>
        </svg>`)}
      ${glyph('delete', false, `
        <svg width="22" height="22" viewBox="-11 -11 22 22" style="display:block;overflow:visible;flex-shrink:0;">
          <circle r="9.5" fill="#FF4500" stroke="#fff" stroke-width="1.5"/>
          <path d="M-3.25 -3.25L3.25 3.25M3.25 -3.25L-3.25 3.25" stroke="#fff" stroke-width="1.75" stroke-linecap="round"/>
        </svg>`)}
      ${glyph('remove', false, `
        <svg width="22" height="22" viewBox="-11 -11 22 22" style="display:block;overflow:visible;flex-shrink:0;">
          <circle r="9.5" fill="#FF4500" stroke="#fff" stroke-width="1.5"/>
          <path d="M-4.25 0H4.25" stroke="#fff" stroke-width="1.75" stroke-linecap="round"/>
        </svg>`)}
      ${glyph('move', false, `
        <svg width="22" height="22" viewBox="-11 -11 22 22" style="display:block;overflow:visible;flex-shrink:0;" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="${ARROWS}" stroke="#fff" stroke-width="4.5"/>
          <path d="${ARROWS}" stroke="#FF4500" stroke-width="1.75"/>
        </svg>`)}
    </div>
  `;

  document.documentElement.appendChild(el);
  cursorEl = el;
  shownKind = 'crosshair';

  hideNativeCursor(true);
  document.addEventListener('mousemove', onMove, { passive: true });
}

export function destroyCursor(): void {
  document.removeEventListener('mousemove', onMove);
  cursorEl?.remove();
  cursorEl = null;
  trackPointerTarget(null);
  shownKind = null;
  resolveCursor = null;
  hideNativeCursor(false);
  nativeHidden = null;
}
