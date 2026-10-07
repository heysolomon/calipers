/**
 * Shared design tokens for every Calipers surface (toolbar, cards, labels,
 * toasts, tooltips). The UI is light, so elevation is carried mostly by a
 * hairline border with only a faint shadow underneath.
 */
export const UI = {
  font: `'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  mono: `'JetBrains Mono', 'SF Mono', ui-monospace, monospace`,

  bg:            '#ffffff',
  /** Recessed areas such as segmented-control tracks. */
  track:         'rgba(0, 0, 0, 0.05)',
  hover:         'rgba(0, 0, 0, 0.04)',
  border:        'rgba(0, 0, 0, 0.08)',
  borderSubtle:  'rgba(0, 0, 0, 0.06)',

  textPrimary:   '#000000',
  textSecondary: '#737373',
  textMuted:     '#A3A3A3',

  accent:        '#FF4500',
  accentTint:    'rgba(255, 69, 0, 0.12)',

  /** Floating cards: toolbar, option cards, menus, the inspect panel. */
  shadow:   '0 1px 2px rgba(0, 0, 0, 0.04), 0 6px 20px rgba(0, 0, 0, 0.06)',
  /** Small chips: labels, tooltips, toasts. */
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.04)',
  /** The pill inside a segmented control. */
  shadowPill: '0 1px 2px rgba(0, 0, 0, 0.08)',

  radiusCard: 14,
  radiusChip: 8,

  /** Sliding tab indicators and other on-screen movement. */
  easeMove: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Things entering or leaving. */
  easeOut:  'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
} as const;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface SegmentItem {
  id:     string;
  label:  string;
  title?: string;
}

/**
 * Segmented control with a pill that slides to the active item. Every tab row
 * in Calipers is built from this so they all look and move the same way.
 * `attr` is the data attribute the buttons carry, e.g. `data-fmt="hex"`.
 */
export function segmentedHTML(attr: string, items: SegmentItem[], activeId: string): string {
  const n = items.length;
  const idx = Math.max(0, items.findIndex((i) => i.id === activeId));
  return `
    <div data-segmented="${attr}" style="
      position:relative;display:grid;grid-template-columns:repeat(${n},1fr);gap:0;
      background:${UI.track};border-radius:7px;padding:2px;
    ">
      <div data-segmented-pill style="
        position:absolute;top:2px;bottom:2px;
        width:calc((100% - 4px) / ${n});left:calc(2px + ${idx} * ((100% - 4px) / ${n}));
        background:${UI.bg};border-radius:5px;box-shadow:${UI.shadowPill};pointer-events:none;
        transition:left 0.22s ${UI.easeMove};
      "></div>
      ${items.map((item) => {
        const on = item.id === activeId;
        return `<button type="button" data-${attr}="${item.id}" aria-pressed="${on}"${item.title ? ` title="${item.title}"` : ''} style="
          position:relative;z-index:1;display:flex;align-items:center;justify-content:center;
          height:24px;padding:0;margin:0;border:none;border-radius:5px;background:transparent;
          color:${on ? UI.textPrimary : UI.textSecondary};cursor:pointer;outline:none;
          font-family:inherit;font-size:10px;font-weight:500;letter-spacing:-0.01em;
          transition:color 0.22s ${UI.easeMove};
        ">${item.label}</button>`;
      }).join('')}
    </div>
  `;
}

/** Move a segmented control's pill to `activeId` (animated) and update the button states. */
export function setSegmented(root: ParentNode, attr: string, activeId: string): void {
  const bar = root.querySelector<HTMLElement>(`[data-segmented="${attr}"]`);
  if (!bar) return;
  const buttons = [...bar.querySelectorAll<HTMLElement>(`[data-${attr}]`)];
  const n = buttons.length;
  const idx = Math.max(0, buttons.findIndex((b) => b.getAttribute(`data-${attr}`) === activeId));

  const pill = bar.querySelector<HTMLElement>('[data-segmented-pill]');
  if (pill) {
    pill.style.transition = prefersReducedMotion() ? 'none' : `left 0.22s ${UI.easeMove}`;
    pill.style.left = `calc(2px + ${idx} * ((100% - 4px) / ${n}))`;
  }
  buttons.forEach((b, i) => {
    b.style.color = i === idx ? UI.textPrimary : UI.textSecondary;
    b.setAttribute('aria-pressed', String(i === idx));
  });
}

// ─── Colour swatches ──────────────────────────────────────────────────────────
// Selection is shown the way Agentation does it: the dot shrinks slightly while
// a ring of the same colour fades in around it, with a sliver of the surface
// between them. Both layers move together over 200ms.

const SWATCH_MOTION = 'opacity 0.2s ease, transform 0.2s ease';
const SWATCH_EDGE = 'inset 0 0 0 1px rgba(0, 0, 0, 0.1)';

export function swatchHTML(attr: string, hex: string, label: string, selected: boolean): string {
  const layer = 'position:absolute;inset:0;border-radius:50%;pointer-events:none;';
  return `<button type="button" data-${attr}="${hex}" title="${label}" aria-label="${label}" aria-pressed="${selected}" style="
    position:relative;width:20px;height:20px;padding:0;margin:0;border:none;border-radius:50%;
    background:transparent;cursor:pointer;outline:none;flex-shrink:0;
  ">
    <span data-swatch-ring style="${layer}background:${hex};box-shadow:${SWATCH_EDGE};
      transform:scale(1.2);opacity:${selected ? 1 : 0};transition:${SWATCH_MOTION};"></span>
    <span style="${layer}background:${UI.bg};"></span>
    <span data-swatch-dot style="${layer}background:${hex};box-shadow:${SWATCH_EDGE};
      transform:scale(${selected ? 0.8 : 1});transition:${SWATCH_MOTION};"></span>
  </button>`;
}

/** Move the selection to `activeHex`, animating the swatch it leaves and the one it lands on. */
export function setSwatches(root: ParentNode, attr: string, activeHex: string): void {
  const reduce = prefersReducedMotion();
  root.querySelectorAll<HTMLElement>(`[data-${attr}]`).forEach((btn) => {
    const on = btn.getAttribute(`data-${attr}`)?.toLowerCase() === activeHex.toLowerCase();
    btn.setAttribute('aria-pressed', String(on));
    const ring = btn.querySelector<HTMLElement>('[data-swatch-ring]');
    const dot = btn.querySelector<HTMLElement>('[data-swatch-dot]');
    for (const el of [ring, dot]) if (el) el.style.transition = reduce ? 'none' : SWATCH_MOTION;
    if (ring) ring.style.opacity = on ? '1' : '0';
    if (dot) dot.style.transform = `scale(${on ? 0.8 : 1})`;
  });
}
