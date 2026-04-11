/**
 * Inspect mode — hover over elements to see their dimensions and box model.
 */
import type { Rect } from '@calipers/shared';
import type { OverlayElements } from '../overlay';
import { getElementAtPoint, getElementRect, getBoxModel } from '../detector';
import { clearCanvas, drawElementHighlight, drawBoxModel } from '../renderer';
import { setLabel, hideLabel } from '../labels';
import { formatDimensions } from '../utils';
import { showBoxModelPanel, hideBoxModelPanel, isBoxModelPanel } from '../box-model-panel';

interface InspectState {
  hoveredEl: Element | null;
  hoveredRect: Rect | null;
  opacity: number;
  rafId: number | null;
  showBoxModel: boolean;
  mouseX: number;
  mouseY: number;
  pending: boolean;
}

const state: InspectState = {
  hoveredEl: null,
  hoveredRect: null,
  opacity: 0,
  rafId: null,
  showBoxModel: false,
  mouseX: 0,
  mouseY: 0,
  pending: false,
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
  state.rafId = null;
  state.hoveredEl = null;
  state.hoveredRect = null;
}

export function setShowBoxModel(enabled: boolean): void {
  state.showBoxModel = enabled;
}

function onDocumentClick(e: MouseEvent): void {
  // If clicking on the panel itself, let it through (dismiss button, etc.)
  if (isBoxModelPanel(e.target as Element)) return;

  // Always intercept clicks in inspect mode to prevent page navigation, etc.
  e.preventDefault();
  e.stopPropagation();

  if (!state.showBoxModel) return;

  const el = getElementAtPoint(e.clientX, e.clientY);
  if (!el) {
    hideBoxModelPanel();
    return;
  }

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
    state.hoveredEl = el;
    state.hoveredRect = el ? getElementRect(el) : null;
    // Reset opacity for fade-in
    if (el) state.opacity = 0;
  }

  render();
}

function scheduleFrame(): void {
  if (!overlay) return;
  state.rafId = requestAnimationFrame(() => {
    render();
    scheduleFrame();
  });
}

function render(): void {
  if (!overlay) return;
  const { ctx, labelContainer } = overlay;

  clearCanvas(ctx);

  if (!state.hoveredEl || !state.hoveredRect) {
    hideLabel('dimension');
    return;
  }

  // Lerp opacity toward 1
  state.opacity = Math.min(1, state.opacity + 0.12);

  const rect = state.hoveredRect;

  drawElementHighlight(ctx, rect, false, state.opacity);

  if (state.showBoxModel && state.opacity > 0.5) {
    const box = getBoxModel(state.hoveredEl);
    drawBoxModel(ctx, box);
  }

  // Position the label just above the element, or below if too close to top
  const LABEL_OFFSET = 8;
  const labelY =
    rect.top > 30
      ? rect.top - LABEL_OFFSET - 24
      : rect.bottom + LABEL_OFFSET;
  const labelX = rect.left;

  const text = formatDimensions(rect.width, rect.height);
  setLabel(
    labelContainer,
    'dimension',
    text,
    labelX,
    labelY,
    text,
  );
}
