/**
 * Inspect mode — hover to see element size with a quiet highlight.
 * Detail (box model) stays behind the Box model toggle + click.
 */
import type { Rect } from '@calipers/shared';
import type { OverlayElements } from '../overlay';
import { getElementAtPoint, getElementRect, getBoxModel } from '../detector';
import {
  clearCanvas, drawElementHighlight, drawBoxModel, drawRulers,
} from '../renderer';
import { setLabel, hideLabel } from '../labels';
import { formatDimensions, isCalipersElement } from '../utils';
import { showBoxModelPanel, hideBoxModelPanel } from '../box-model-panel';

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
  state.rafId       = null;
  state.hoveredEl   = null;
  state.hoveredRect = null;
}

export function setShowBoxModel(enabled: boolean): void {
  state.showBoxModel = enabled;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onDocumentClick(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  if (!state.showBoxModel) return;

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

  // Hide legacy inspect labels that may linger after mode switches
  hideLabel('selector');
  hideLabel('typography');
  hideLabel('vp-top');
  hideLabel('vp-bottom');
  hideLabel('vp-left');
  hideLabel('vp-right');

  if (!state.hoveredEl || !state.hoveredRect) {
    hideLabel('dimension');
    drawRulers(ctx, state.mouseX, state.mouseY);
    return;
  }

  state.opacity = Math.min(1, state.opacity + 0.12);
  const rect = state.hoveredRect;

  drawElementHighlight(ctx, rect, false, state.opacity);

  if (state.showBoxModel && state.opacity > 0.5) {
    drawBoxModel(ctx, getBoxModel(state.hoveredEl));
  }

  // Single size label — no selector path, viewport rays, or typography stack
  const OFFSET = 8;
  const labelY = rect.top > 28 ? rect.top - OFFSET - 22 : rect.bottom + OFFSET;
  const dimText = formatDimensions(rect.width, rect.height);
  setLabel(labelContainer, 'dimension', dimText, rect.left, labelY, dimText);

  drawRulers(ctx, state.mouseX, state.mouseY);
}
