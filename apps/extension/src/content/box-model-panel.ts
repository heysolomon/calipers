/**
 * Box model detail panel — a glassmorphic DOM popup shown when the user clicks
 * an element in inspect mode with box model enabled.
 */
import type { BoxModel } from '@calipers/shared';

const PANEL_ID = 'calipers-bm-panel';

const PANEL_CSS = `
  position: fixed;
  z-index: 2147483646;
  background: rgba(15, 15, 20, 0.92);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 10px 12px 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.3);
  font-family: 'Inter var', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 11px;
  color: rgba(255,255,255,0.85);
  pointer-events: all;
  user-select: none;
  min-width: 220px;
`;

const COLORS = {
  margin:  'rgba(255,130,80,0.9)',
  border:  'rgba(255,200,80,0.9)',
  padding: 'rgba(80,200,140,0.9)',
  content: 'rgba(74,158,255,0.9)',
};

function fmt(v: number): string {
  return v === 0 ? '–' : `${Math.round(v)}`;
}

function row(
  label: string,
  color: string,
  t: number, r: number, b: number, l: number,
): string {
  const swatch = `
    display:inline-block;width:8px;height:8px;border-radius:2px;
    background:${color};margin-right:6px;vertical-align:middle;flex-shrink:0;
  `;
  const cell = (v: number) => `
    <td style="text-align:right;padding:1px 6px;color:rgba(255,255,255,0.65);
      font-variant-numeric:tabular-nums;letter-spacing:0.01em;">
      ${fmt(v)}
    </td>
  `;
  return `
    <tr>
      <td style="padding:3px 8px 3px 0;white-space:nowrap;color:rgba(255,255,255,0.45);font-size:10px;">
        <span style="${swatch}"></span>${label}
      </td>
      ${cell(t)}${cell(r)}${cell(b)}${cell(l)}
    </tr>
  `;
}

function buildHTML(box: BoxModel): string {
  const { margin: m, border: b, padding: p, content: c } = box;
  const headerCell = (txt: string) => `
    <th style="text-align:right;padding:0 6px 4px;color:rgba(255,255,255,0.25);
      font-weight:400;font-size:10px;">${txt}</th>
  `;
  return `
    <div style="font-size:10px;color:rgba(255,255,255,0.3);
      letter-spacing:0.06em;margin-bottom:6px;font-weight:600;">
      BOX MODEL
    </div>
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr>
          <th style="padding:0 8px 4px 0;text-align:left;color:rgba(255,255,255,0.25);
            font-weight:400;font-size:10px;"></th>
          ${headerCell('T')}${headerCell('R')}${headerCell('B')}${headerCell('L')}
        </tr>
      </thead>
      <tbody>
        ${row('margin',  COLORS.margin,  m.top, m.right, m.bottom, m.left)}
        ${row('border',  COLORS.border,  b.top, b.right, b.bottom, b.left)}
        ${row('padding', COLORS.padding, p.top, p.right, p.bottom, p.left)}
      </tbody>
    </table>
    <div style="margin-top:6px;padding-top:6px;
      border-top:1px solid rgba(255,255,255,0.06);
      display:flex;align-items:center;gap:6px;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
        background:${COLORS.content};flex-shrink:0;"></span>
      <span style="color:rgba(255,255,255,0.45);font-size:10px;">content</span>
      <span style="margin-left:auto;color:rgba(255,255,255,0.75);
        font-variant-numeric:tabular-nums;">
        ${Math.round(c.width)} × ${Math.round(c.height)}
      </span>
    </div>
    <div style="margin-top:6px;color:rgba(255,255,255,0.2);font-size:9px;text-align:center;">
      click elsewhere to dismiss
    </div>
  `;
}

/** Show (or update) the box model detail panel near the given element rect */
export function showBoxModelPanel(box: BoxModel, anchorRect: DOMRect | { left: number; bottom: number; top: number; right: number }): void {
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('style', PANEL_CSS);
    document.documentElement.appendChild(panel);
  }

  panel.innerHTML = buildHTML(box);

  // Position: below the element if there's room, else above
  const MARGIN = 8;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  // Temporarily place off-screen to measure
  panel.style.left = '-9999px';
  panel.style.top = '-9999px';
  panel.style.visibility = 'hidden';

  requestAnimationFrame(() => {
    if (!panel) return;
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;

    let top = anchorRect.bottom + MARGIN;
    if (top + ph > vpH - MARGIN) top = anchorRect.top - ph - MARGIN;
    top = Math.max(MARGIN, top);

    let left = anchorRect.left;
    if (left + pw > vpW - MARGIN) left = vpW - pw - MARGIN;
    left = Math.max(MARGIN, left);

    panel!.style.left = `${left}px`;
    panel!.style.top = `${top}px`;
    panel!.style.visibility = 'visible';
  });
}

/** Remove the box model detail panel if present */
export function hideBoxModelPanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}

/** Returns true if the given element is part of the box model panel */
export function isBoxModelPanel(el: Element | null): boolean {
  if (!el) return false;
  return el.id === PANEL_ID || el.closest(`#${PANEL_ID}`) !== null;
}
