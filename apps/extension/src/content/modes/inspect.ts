/**
 * Inspect mode — hover over elements to see their dimensions, box model,
 * viewport distances, CSS selector path, and typography data.
 */
import type { Rect } from '@calipers/shared';
import type { OverlayElements } from '../overlay';
import { getElementAtPoint, getElementRect, getBoxModel } from '../detector';
import {
  clearCanvas, drawElementHighlight, drawBoxModel,
  drawViewportDistances, drawRulers,
} from '../renderer';
import { setLabel, hideLabel } from '../labels';
import { formatDimensions } from '../utils';
import { showBoxModelPanel, hideBoxModelPanel } from '../box-model-panel';
import { isCalipersElement } from '../utils';

interface InspectState {
  hoveredEl:    Element | null;
  hoveredRect:  Rect | null;
  opacity:      number;
  rafId:        number | null;
  showBoxModel: boolean;
  mouseX:       number;
  mouseY:       number;
  pending:      boolean;
}

const state: InspectState = {
  hoveredEl:    null,
  hoveredRect:  null,
  opacity:      0,
  rafId:        null,
  showBoxModel: false,
  mouseX:       0,
  mouseY:       0,
  pending:      false,
};

let overlay: OverlayElements | null = null;

export function initInspectMode(o: OverlayElements, showBoxModel: boolean): void {
  overlay = o;
  state.showBoxModel = showBoxModel;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('click', onDocumentClick, true);
  scheduleFrame();
}

export function destroyInspectMode(): void {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('click', onDocumentClick, true);
  hideBoxModelPanel();
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId      = null;
  state.hoveredEl  = null;
  state.hoveredRect = null;
}

export function setShowBoxModel(enabled: boolean): void {
  state.showBoxModel = enabled;
}

// ─── Element path (CSS selector) ──────────────────────────────────────────────

function getElementPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;

  while (node && node.tagName !== 'BODY' && node.tagName !== 'HTML' && depth < 4) {
    let seg = node.tagName.toLowerCase();
    if (node.id) {
      seg += `#${node.id}`;
    } else if (node.classList.length > 0) {
      seg += Array.from(node.classList).slice(0, 2).map((c) => `.${c}`).join('');
    }
    parts.unshift(seg);
    node = node.parentElement;
    depth++;
  }

  return parts.join(' › ');
}

// ─── Typography ───────────────────────────────────────────────────────────────

function getTypographyLabel(el: Element): string | null {
  // Only relevant for elements containing direct text
  const hasText = Array.from(el.childNodes).some(
    (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
  );
  if (!hasText) return null;

  const css = window.getComputedStyle(el);
  const family = (css.fontFamily.split(',')[0] ?? '').trim().replace(/['"]/g, '');
  const size   = css.fontSize;
  const weight = css.fontWeight;
  const lh     = css.lineHeight;
  const ls     = css.letterSpacing !== 'normal' ? ` · ls ${css.letterSpacing}` : '';
  return `${family} · ${size} · ${weight} · lh ${lh}${ls}`;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onDocumentClick(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  if (!state.showBoxModel) return;

  // Only intercept the click when box model panel is being shown
  e.preventDefault();
  e.stopPropagation();

  const el = getElementAtPoint(e.clientX, e.clientY);
  if (!el) { hideBoxModelPanel(); return; }

  const box = getBoxModel(el);
  showBoxModelPanel(box, el.getBoundingClientRect());
}

function onMouseMove(e: MouseEvent): void {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  if (!state.pending) {
    state.pending = true;
    requestAnimationFrame(processMouseMove);
  }
}

function processMouseMove(): void {
  state.pending = false;
  const { mouseX, mouseY } = state;
  const el = getElementAtPoint(mouseX, mouseY);

  if (el !== state.hoveredEl) {
    state.hoveredEl   = el;
    state.hoveredRect = el ? getElementRect(el) : null;
    if (el) state.opacity = 0;
  }

  render();
}

function scheduleFrame(): void {
  if (!overlay) return;
  state.rafId = requestAnimationFrame(() => { render(); scheduleFrame(); });
}

function render(): void {
  if (!overlay) return;
  const { ctx, labelContainer } = overlay;

  clearCanvas(ctx);

  if (!state.hoveredEl || !state.hoveredRect) {
    hideLabel('dimension');
    hideLabel('selector');
    hideLabel('typography');
    hideLabel('vp-top'); hideLabel('vp-bottom');
    hideLabel('vp-left'); hideLabel('vp-right');
    drawRulers(ctx, state.mouseX, state.mouseY);
    return;
  }

  state.opacity = Math.min(1, state.opacity + 0.12);

  const rect = state.hoveredRect;

  // Viewport edge distances (drawn before highlight so highlight is on top)
  if (state.opacity > 0.3) {
    drawViewportDistances(ctx, rect, labelContainer, setLabel);
  }

  drawElementHighlight(ctx, rect, false, state.opacity);

  if (state.showBoxModel && state.opacity > 0.5) {
    drawBoxModel(ctx, getBoxModel(state.hoveredEl));
  }

  // Dimension label (just above element)
  const OFFSET = 8;
  const labelY = rect.top > 30 ? rect.top - OFFSET - 24 : rect.bottom + OFFSET;
  const dimText = formatDimensions(rect.width, rect.height);
  setLabel(labelContainer, 'dimension', dimText, rect.left, labelY, dimText);

  // CSS selector path (below dimension label)
  const pathText = getElementPath(state.hoveredEl);
  const pathY = rect.top > 30 ? rect.top - OFFSET - 46 : rect.bottom + OFFSET + 24;
  setLabel(labelContainer, 'selector', pathText, rect.left, pathY);

  // Typography (only for text-bearing elements)
  const typoText = getTypographyLabel(state.hoveredEl);
  if (typoText) {
    const typoY = rect.top > 30 ? rect.top - OFFSET - 68 : rect.bottom + OFFSET + 48;
    setLabel(labelContainer, 'typography', typoText, rect.left, typoY);
  } else {
    hideLabel('typography');
  }

  drawRulers(ctx, state.mouseX, state.mouseY);
}
