/**
 * Measure mode — click two elements to see the distance between them.
 */
import type { Rect } from '@calipers/shared';
import type { OverlayElements } from '../overlay';
import { getElementAtPoint, getElementRect } from '../detector';
import { clearCanvas, drawElementHighlight, drawMeasurementLine, drawAlignmentGuideline } from '../renderer';
import { setLabel } from '../labels';
import { formatDistance, formatDimensions, distanceBetweenRects } from '../utils';
import { enablePointerEvents, disablePointerEvents } from '../overlay';

interface MeasureState {
  elementA: Element | null;
  rectA: Rect | null;
  elementB: Element | null;
  rectB: Rect | null;
  hoveredEl: Element | null;
  hoveredRect: Rect | null;
  lineProgress: number;
  rafId: number | null;
  mouseX: number;
  mouseY: number;
  pending: boolean;
}

const state: MeasureState = {
  elementA: null,
  rectA: null,
  elementB: null,
  rectB: null,
  hoveredEl: null,
  hoveredRect: null,
  lineProgress: 0,
  rafId: null,
  mouseX: 0,
  mouseY: 0,
  pending: false,
};

let overlay: OverlayElements | null = null;

export function initMeasureMode(o: OverlayElements): void {
  overlay = o;
  enablePointerEvents();
  overlay.canvas.addEventListener('click', onClick);
  overlay.canvas.addEventListener('mousemove', onMouseMove);
  scheduleFrame();
}

export function destroyMeasureMode(): void {
  if (overlay) {
    overlay.canvas.removeEventListener('click', onClick);
    overlay.canvas.removeEventListener('mousemove', onMouseMove);
  }
  disablePointerEvents();
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  resetState();
}

function resetState(): void {
  state.elementA = null;
  state.rectA = null;
  state.elementB = null;
  state.rectB = null;
  state.hoveredEl = null;
  state.hoveredRect = null;
  state.lineProgress = 0;
}

function onClick(e: MouseEvent): void {
  const el = getElementAtPoint(e.clientX, e.clientY);
  if (!el) return;
  const rect = getElementRect(el);

  if (!state.elementA) {
    state.elementA = el;
    state.rectA = rect;
    state.lineProgress = 0;
  } else if (!state.elementB && el !== state.elementA) {
    state.elementB = el;
    state.rectB = rect;
    state.lineProgress = 0;
  } else {
    // Third click — reset
    resetState();
    state.elementA = el;
    state.rectA = rect;
  }
}

function onMouseMove(e: MouseEvent): void {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  if (!state.pending) {
    state.pending = true;
    requestAnimationFrame(() => {
      state.pending = false;
      state.hoveredEl = getElementAtPoint(state.mouseX, state.mouseY);
      state.hoveredRect = state.hoveredEl ? getElementRect(state.hoveredEl) : null;
    });
  }
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

  // Animate line progress toward 1
  if (state.elementB && state.lineProgress < 1) {
    state.lineProgress = Math.min(1, state.lineProgress + 0.08);
  }

  // Draw hovered element hint (only if no element A yet, or B not set)
  if (state.hoveredRect && state.hoveredEl !== state.elementA && state.hoveredEl !== state.elementB) {
    drawElementHighlight(ctx, state.hoveredRect, false, 0.6);
  }

  // Element A
  if (state.rectA) {
    drawElementHighlight(ctx, state.rectA, true, 1);
    setLabel(
      labelContainer,
      'dim-a',
      formatDimensions(state.rectA.width, state.rectA.height),
      state.rectA.left,
      state.rectA.top - 28,
    );
  }

  // Element B + measurement
  if (state.rectA && state.rectB && state.elementB) {
    drawElementHighlight(ctx, state.rectB, true, 1);
    setLabel(
      labelContainer,
      'dim-b',
      formatDimensions(state.rectB.width, state.rectB.height),
      state.rectB.left,
      state.rectB.top - 28,
    );

    const { distance, direction } = distanceBetweenRects(state.rectA, state.rectB);

    // Calculate line endpoints (closest edges)
    let x1: number, y1: number, x2: number, y2: number;

    if (direction === 'horizontal') {
      y1 = (state.rectA.top + state.rectA.bottom) / 2;
      y2 = (state.rectB.top + state.rectB.bottom) / 2;
      const midY = (y1 + y2) / 2;
      y1 = midY;
      y2 = midY;

      if (state.rectA.right <= state.rectB.left) {
        x1 = state.rectA.right;
        x2 = state.rectB.left;
      } else {
        x1 = state.rectA.left;
        x2 = state.rectB.right;
      }

      // Alignment guidelines
      drawAlignmentGuideline(ctx, state.rectA.right, state.rectA.top, state.rectA.right, state.rectA.bottom);
      drawAlignmentGuideline(ctx, state.rectB.left, state.rectB.top, state.rectB.left, state.rectB.bottom);
    } else {
      x1 = (state.rectA.left + state.rectA.right) / 2;
      x2 = (state.rectB.left + state.rectB.right) / 2;
      const midX = (x1 + x2) / 2;
      x1 = midX;
      x2 = midX;

      if (state.rectA.bottom <= state.rectB.top) {
        y1 = state.rectA.bottom;
        y2 = state.rectB.top;
      } else {
        y1 = state.rectA.top;
        y2 = state.rectB.bottom;
      }

      // Alignment guidelines
      drawAlignmentGuideline(ctx, state.rectA.left, state.rectA.bottom, state.rectA.right, state.rectA.bottom);
      drawAlignmentGuideline(ctx, state.rectB.left, state.rectB.top, state.rectB.right, state.rectB.top);
    }

    drawMeasurementLine(ctx, x1, y1, x2, y2, state.lineProgress);

    // Distance label at midpoint
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const distText = formatDistance(distance);
    setLabel(labelContainer, 'distance', distText, midX - 20, midY - 12, distText);
  }
}
