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
}

const state: PickerState = {
  mouseX:  0,
  mouseY:  0,
  colors:  [],
  format:  'hex',
  rafId:   null,
  panelEl: null,
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

// ─── Panel DOM ────────────────────────────────────────────────────────────────

const PANEL_STYLE = `
  position: fixed;
  z-index: 2147483647;
  pointer-events: all;
  user-select: none;
  font-family: 'Neue Plak Text', Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 12px;
  background: rgba(15,15,18,0.97);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  padding: 10px;
  min-width: 210px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
`;

function buildPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.id    = 'calipers-color-panel';
  panel.setAttribute('style', PANEL_STYLE);

  // Format toggle
  const fmt = document.createElement('div');
  fmt.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;';
  (['hex', 'rgb', 'hsl'] as const).forEach((f) => {
    const btn = document.createElement('button');
    btn.textContent = f.toUpperCase();
    btn.dataset['fmt'] = f;
    btn.style.cssText = `
      flex:1; padding:3px 0; border-radius:4px; border:none; cursor:pointer;
      font-size:10px; font-weight:600; letter-spacing:0.04em;
      background: ${state.format === f ? 'rgba(255,69,0,0.2)' : 'rgba(255,255,255,0.06)'};
      color: ${state.format === f ? '#FF4500' : 'rgba(255,255,255,0.45)'};
    `;
    btn.addEventListener('click', () => {
      state.format = f;
      refreshPanel();
    });
    fmt.appendChild(btn);
  });
  panel.appendChild(fmt);

  // Color rows
  const rows = document.createElement('div');
  rows.id = 'calipers-color-rows';
  panel.appendChild(rows);

  return panel;
}

function refreshPanel(): void {
  if (!state.panelEl) return;

  // Rebuild format buttons
  const btns = state.panelEl.querySelectorAll<HTMLButtonElement>('button[data-fmt]');
  btns.forEach((btn) => {
    const f = btn.dataset['fmt'];
    btn.style.background = f === state.format ? 'rgba(255,69,0,0.2)' : 'rgba(255,255,255,0.06)';
    btn.style.color       = f === state.format ? '#FF4500' : 'rgba(255,255,255,0.45)';
  });

  // Rebuild rows
  const container = state.panelEl.querySelector('#calipers-color-rows') as HTMLDivElement;
  container.innerHTML = '';

  if (state.colors.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:rgba(255,255,255,0.3);font-size:11px;text-align:center;padding:6px 0;';
    empty.textContent = 'No colours found';
    container.appendChild(empty);
    return;
  }

  state.colors.forEach((c) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:5px;cursor:pointer;';
    row.title = 'Click to copy';

    const swatch = document.createElement('span');
    swatch.style.cssText = `
      width:20px;height:20px;border-radius:4px;flex-shrink:0;
      background:${c.raw};
      border:1px solid rgba(255,255,255,0.12);
    `;

    const info = document.createElement('span');
    info.style.cssText = 'flex:1;overflow:hidden;';

    const label = document.createElement('div');
    label.style.cssText = 'color:rgba(255,255,255,0.35);font-size:10px;letter-spacing:0.04em;text-transform:uppercase;';
    label.textContent = c.label;

    const value = document.createElement('div');
    value.style.cssText = 'color:rgba(255,255,255,0.87);font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:0.02em;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    value.textContent = state.format === 'rgb' ? c.rgb : state.format === 'hsl' ? c.hsl : c.hex;

    info.appendChild(label);
    info.appendChild(value);
    row.appendChild(swatch);
    row.appendChild(info);

    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.05)'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });
    row.addEventListener('click', async () => {
      const val = state.format === 'rgb' ? c.rgb : state.format === 'hsl' ? c.hsl : c.hex;
      await copyToClipboard(val);
      showToast(`Copied ${val}`);
    });

    container.appendChild(row);
  });
}

function positionPanel(): void {
  if (!state.panelEl) return;
  const { mouseX, mouseY } = state;
  const panelW = state.panelEl.offsetWidth  || 220;
  const panelH = state.panelEl.offsetHeight || 160;
  const vw = window.innerWidth; const vh = window.innerHeight;

  // Place below the cursor (clears the crosshair + coordinate text ~44px tall)
  let y = mouseY + 48;
  if (y + panelH > vh) y = mouseY - panelH - 14;

  let x = mouseX + 12;
  if (x + panelW > vw) x = mouseX - panelW - 12;

  state.panelEl.style.left = `${x}px`;
  state.panelEl.style.top  = `${y}px`;
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
  if (isCalipersElement(e.target as Element)) return;
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
}

function scheduleFrame(): void {
  if (!overlay) return;
  state.rafId = requestAnimationFrame(() => { render(); scheduleFrame(); });
}

function render(): void {
  if (!overlay) return;
  const { ctx } = overlay;
  clearCanvas(ctx);

  const el = getElementAtPoint(state.mouseX, state.mouseY);
  const newColors = el ? extractColors(el) : [];

  // Only refresh DOM if colours changed
  const newSig = newColors.map((c) => c.hex).join('|');
  const oldSig = state.colors.map((c) => c.hex).join('|');
  if (newSig !== oldSig) {
    state.colors = newColors;
    refreshPanel();
  }

  positionPanel();
  drawRulers(ctx, state.mouseX, state.mouseY);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initColorPickerMode(o: OverlayElements): void {
  overlay = o;

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

  overlay = null;
}
