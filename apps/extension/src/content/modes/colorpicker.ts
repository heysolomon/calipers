/**
 * Colour picker mode — sample element colours and copy as HEX / RGB / HSL.
 * Phase 3 feature.
 */
import type { OverlayElements } from '../overlay';
import { clearCanvas, drawRulers } from '../renderer';
import { getElementAtPoint } from '../detector';
import { isCalipersElement, copyToClipboard } from '../utils';
import { showToast } from '../labels';

interface ColorEntry {
  label: string;
  raw:   string;     // raw computed value
  hex:   string;
  rgb:   string;
  hsl:   string;
  alpha: number;
}

interface PickerState {
  mouseX:  number;
  mouseY:  number;
  colors:  ColorEntry[];
  format:  'hex' | 'rgb' | 'hsl';
  rafId:   number | null;
  panelEl: HTMLDivElement | null;
  /** True while the pointer is over the colour panel — freezes follow + resampling. */
  pinned:  boolean;
}

const state: PickerState = {
  mouseX:  0,
  mouseY:  0,
  colors:  [],
  format:  'hex',
  rafId:   null,
  panelEl: null,
  pinned:  false,
};

let overlay: OverlayElements | null = null;

// ─── Colour math ──────────────────────────────────────────────────────────────

function parseRgb(css: string): [number, number, number, number] | null {
  const m =
    css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,/\s]+([\d.]+))?\s*\)/) ??
    css.match(/rgba?\(\s*(\d+)%[,\s]+(\d+)%[,\s]+(\d+)%(?:[,/\s]+([\d.]+))?\s*\)/);
  if (!m) return null;
  const r = Number(m[1]); const g = Number(m[2]); const b = Number(m[3]);
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  return [r, g, b, a > 1 ? a / 100 : a];
}

function rgbToHex(r: number, g: number, b: number, a: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  const base = `#${h(r)}${h(g)}${h(b)}`;
  return a < 1 ? `${base}${h(Math.round(a * 255))}` : base;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255; const gn = g / 255; const bn = b / 255;
  const max = Math.max(rn, gn, bn); const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function cssColorToEntry(label: string, css: string): ColorEntry | null {
  if (!css || css === 'transparent' || css === 'rgba(0, 0, 0, 0)') return null;
  const parsed = parseRgb(css);
  if (!parsed) return null;
  const [r, g, b, a] = parsed;
  const [h, s, l] = rgbToHsl(r, g, b);
  return {
    label,
    raw:  css,
    hex:  rgbToHex(r, g, b, a),
    rgb:  a < 1 ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})` : `rgb(${r}, ${g}, ${b})`,
    hsl:  a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a.toFixed(2)})` : `hsl(${h}, ${s}%, ${l}%)`,
    alpha: a,
  };
}

// ─── Panel DOM (matches main Calipers control panel design system) ────────────

const T = {
  bg:            '#F7F7F7',
  border:        'rgba(0, 0, 0, 0.08)',
  borderSubtle:  'rgba(0, 0, 0, 0.06)',
  textPrimary:   '#000',
  textSecondary: '#737373',
  textMuted:     '#D4D4D4',
  accent:        '#FF4500',
  shadow:        '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
};

const FORMATS = ['hex', 'rgb', 'hsl'] as const;

const PANEL_STYLE = `
  position: fixed;
  z-index: 2147483647;
  pointer-events: all;
  user-select: none;
  font-family: 'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: ${T.textPrimary};
  background: ${T.bg};
  border: 1px solid ${T.border};
  border-radius: 14px;
  box-shadow: ${T.shadow};
  padding: 12px 14px;
  min-width: 220px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
`;

function formatButtonStyle(active: boolean): string {
  return `
    position:relative;z-index:1;display:flex;align-items:center;justify-content:center;
    padding:4px 0;height:24px;background:transparent;border:none;border-radius:5px;
    color:${active ? T.textPrimary : T.textSecondary};cursor:pointer;
    font-family:inherit;font-size:10px;font-weight:500;outline:none;letter-spacing:-0.01em;
    transition:color 0.22s cubic-bezier(0.4,0,0.2,1);
  `;
}

function updateFormatIndicator(): void {
  if (!state.panelEl) return;
  const idx = Math.max(0, FORMATS.indexOf(state.format));
  const indicator = state.panelEl.querySelector<HTMLElement>('[data-fmt-indicator]');
  if (indicator) {
    indicator.style.left = `calc(2px + ${idx} * ((100% - 4px) / 3))`;
  }
  state.panelEl.querySelectorAll<HTMLButtonElement>('button[data-fmt]').forEach((btn) => {
    const active = btn.dataset['fmt'] === state.format;
    btn.style.color = active ? T.textPrimary : T.textSecondary;
  });
}

function buildPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.id = 'calipers-color-panel';
  panel.setAttribute('style', PANEL_STYLE);

  const title = document.createElement('div');
  title.style.cssText = `
    font-size:10px;font-weight:500;color:${T.textMuted};
    letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;
  `;
  title.textContent = 'Colours';
  panel.appendChild(title);

  // Segmented format control — same sliding-pill pattern as mode tabs
  const fmt = document.createElement('div');
  fmt.style.cssText = `
    position:relative;display:grid;grid-template-columns:repeat(3,1fr);
    background:rgba(0,0,0,0.06);border-radius:7px;padding:2px;gap:0;margin-bottom:10px;
  `;

  const indicator = document.createElement('div');
  indicator.dataset['fmtIndicator'] = '';
  const activeIdx = Math.max(0, FORMATS.indexOf(state.format));
  indicator.style.cssText = `
    position:absolute;top:2px;bottom:2px;
    width:calc((100% - 4px) / 3);
    left:calc(2px + ${activeIdx} * ((100% - 4px) / 3));
    background:#fff;border-radius:5px;
    box-shadow:0 1px 2px rgba(0,0,0,0.12);
    pointer-events:none;
    transition:left 0.22s cubic-bezier(0.4,0,0.2,1);
  `;
  fmt.appendChild(indicator);

  for (const f of FORMATS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = f.toUpperCase();
    btn.dataset['fmt'] = f;
    btn.style.cssText = formatButtonStyle(state.format === f);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.format = f;
      refreshPanel();
    });
    fmt.appendChild(btn);
  }
  panel.appendChild(fmt);

  const divider = document.createElement('div');
  divider.style.cssText = `height:1px;background:${T.borderSubtle};margin:0 -14px 6px;`;
  panel.appendChild(divider);

  const rows = document.createElement('div');
  rows.id = 'calipers-color-rows';
  panel.appendChild(rows);

  const hint = document.createElement('p');
  hint.style.cssText = `
    font-size:10px;color:${T.textMuted};text-align:center;
    letter-spacing:-0.01em;margin:8px 0 0;
  `;
  hint.innerHTML = `<kbd style="font-size:9px;font-family:inherit;background:#fff;border:1px solid ${T.border};border-bottom-width:2px;border-radius:3px;padding:0 4px;color:${T.textSecondary};">F</kbd> cycle format`;
  panel.appendChild(hint);

  return panel;
}

function refreshPanel(): void {
  if (!state.panelEl) return;

  updateFormatIndicator();

  const container = state.panelEl.querySelector('#calipers-color-rows') as HTMLDivElement;
  container.innerHTML = '';

  if (state.colors.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `color:${T.textMuted};font-size:11px;text-align:center;padding:10px 0;`;
    empty.textContent = 'No colours found';
    container.appendChild(empty);
    return;
  }

  state.colors.forEach((c, i) => {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:7px 2px;cursor:pointer;
      border-bottom:${i === state.colors.length - 1 ? 'none' : `1px solid ${T.borderSubtle}`};
      transition:background 0.1s ease;border-radius:5px;margin:0 -2px;padding-left:4px;padding-right:4px;
    `;
    row.title = 'Click to copy';

    const swatch = document.createElement('span');
    swatch.style.cssText = `
      width:18px;height:18px;border-radius:5px;flex-shrink:0;
      background:${c.raw};
      border:1px solid ${T.border};
      box-shadow:inset 0 0 0 1px rgba(0,0,0,0.04);
    `;

    const info = document.createElement('span');
    info.style.cssText = 'flex:1;overflow:hidden;min-width:0;';

    const label = document.createElement('div');
    label.style.cssText = `
      color:${T.textMuted};font-size:10px;font-weight:500;
      letter-spacing:0.05em;text-transform:uppercase;
    `;
    label.textContent = c.label;

    const value = document.createElement('div');
    value.style.cssText = `
      color:${T.textPrimary};font-family:"JetBrains Mono",ui-monospace,monospace;
      font-size:11px;letter-spacing:-0.01em;margin-top:2px;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    `;
    value.textContent = state.format === 'rgb' ? c.rgb : state.format === 'hsl' ? c.hsl : c.hex;

    info.appendChild(label);
    info.appendChild(value);
    row.appendChild(swatch);
    row.appendChild(info);

    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(0,0,0,0.03)'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });
    row.addEventListener('click', async (e) => {
      e.stopPropagation();
      const val = state.format === 'rgb' ? c.rgb : state.format === 'hsl' ? c.hsl : c.hex;
      await copyToClipboard(val);
      showToast(`Copied ${val}`);
    });

    container.appendChild(row);
  });
}

/** Vertical/horizontal gap between cursor and panel — approach pad must stay smaller. */
const PANEL_OFFSET_Y = 48;
const PANEL_OFFSET_X = 12;
/** Freeze follow when the pointer enters this corridor toward the panel. */
const APPROACH_PAD = 40;

function positionPanel(): void {
  if (!state.panelEl || state.pinned) return;
  const { mouseX, mouseY } = state;
  const panelW = state.panelEl.offsetWidth  || 220;
  const panelH = state.panelEl.offsetHeight || 160;
  const vw = window.innerWidth; const vh = window.innerHeight;

  // Place below the cursor (clears the crosshair + coordinate text ~44px tall)
  let y = mouseY + PANEL_OFFSET_Y;
  if (y + panelH > vh) y = mouseY - panelH - 14;

  let x = mouseX + PANEL_OFFSET_X;
  if (x + panelW > vw) x = mouseX - panelW - PANEL_OFFSET_X;

  state.panelEl.style.left = `${x}px`;
  state.panelEl.style.top  = `${y}px`;
}

/** True when the pointer is on the panel or in the gap used to reach it. */
function isInPanelInteractionZone(x: number, y: number): boolean {
  if (!state.panelEl) return false;
  const r = state.panelEl.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;

  const inX = x >= r.left - 16 && x <= r.right + 16;
  if (!inX) return false;

  // On the panel itself
  if (y >= r.top && y <= r.bottom) return true;
  // Approaching from above (normal placement)
  if (y >= r.top - APPROACH_PAD && y < r.top) return true;
  // Approaching from below (flipped placement near viewport bottom)
  if (y > r.bottom && y <= r.bottom + APPROACH_PAD) return true;

  return false;
}

// ─── Colour extraction ────────────────────────────────────────────────────────

function extractColors(el: Element): ColorEntry[] {
  const css = window.getComputedStyle(el);
  const candidates: [string, string][] = [
    ['Background', css.backgroundColor],
    ['Color',      css.color],
    ['Border',     css.borderTopColor],
    ['Outline',    css.outlineColor],
    ['Fill',       css.getPropertyValue('fill')],
    ['Stroke',     css.getPropertyValue('stroke')],
  ];

  const result: ColorEntry[] = [];
  const seen = new Set<string>();

  for (const [label, raw] of candidates) {
    if (!raw) continue;
    const entry = cssColorToEntry(label, raw);
    if (entry && !seen.has(entry.hex)) {
      seen.add(entry.hex);
      result.push(entry);
    }
  }
  return result;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onMouseMove(e: MouseEvent): void {
  const x = e.clientX;
  const y = e.clientY;

  // Freeze when moving into the panel (or the gap toward it) so HEX/RGB/HSL
  // tabs and copy rows can be clicked instead of the panel fleeing.
  if (isInPanelInteractionZone(x, y) || isCalipersElement(e.target as Element)) {
    state.pinned = true;
    return;
  }

  state.pinned = false;
  state.mouseX = x;
  state.mouseY = y;
}

function scheduleFrame(): void {
  if (!overlay) return;
  state.rafId = requestAnimationFrame(() => { render(); scheduleFrame(); });
}

function render(): void {
  if (!overlay) return;
  const { ctx } = overlay;
  clearCanvas(ctx);

  // While the pointer is on the panel, keep the last sample so format tabs
  // and copy rows stay usable instead of the panel fleeing the cursor.
  if (!state.pinned) {
    const el = getElementAtPoint(state.mouseX, state.mouseY);
    const newColors = el ? extractColors(el) : [];

    const newSig = newColors.map((c) => c.hex).join('|');
    const oldSig = state.colors.map((c) => c.hex).join('|');
    if (newSig !== oldSig) {
      state.colors = newColors;
      refreshPanel();
    }

    positionPanel();
  }

  drawRulers(ctx, state.mouseX, state.mouseY);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Cycle HEX → RGB → HSL (also wired to the `F` key from the content script). */
export function cycleColorFormat(): void {
  const order = ['hex', 'rgb', 'hsl'] as const;
  const idx = order.indexOf(state.format);
  state.format = order[(idx + 1) % order.length] ?? 'hex';
  refreshPanel();
}

export function initColorPickerMode(o: OverlayElements): void {
  overlay = o;
  state.pinned = false;

  const panel = buildPanel();
  document.documentElement.appendChild(panel);
  state.panelEl = panel;

  document.addEventListener('mousemove', onMouseMove, { passive: true });
  scheduleFrame();
}

export function destroyColorPickerMode(): void {
  document.removeEventListener('mousemove', onMouseMove);
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;

  state.panelEl?.remove();
  state.panelEl = null;
  state.colors  = [];
  state.pinned  = false;

  overlay = null;
}
