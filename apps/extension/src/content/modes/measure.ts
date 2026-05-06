/**
 * Measure mode — click 2–5 elements to see distances between each consecutive pair.
 * Phase 2: multi-element selection, ruler overlay.
 */
import type { Rect } from '@calipers/shared';
import type { OverlayElements } from '../overlay';
import { getElementAtPoint, getElementRect } from '../detector';
import {
  clearCanvas, drawElementHighlight, drawMeasurementLine,
  drawAlignmentGuideline, drawRulers,
} from '../renderer';
import { setLabel, hideLabel } from '../labels';
import { formatDistance, formatDimensions, distanceBetweenRects, isCalipersElement } from '../utils';

const MAX_ELEMENTS = 5;
const BADGES       = ['A', 'B', 'C', 'D', 'E'];

interface PinnedElement {
  el:   Element;
  rect: Rect;
}

interface MeasureState {
  pinned:     PinnedElement[];
  hoveredEl:  Element | null;
  hoveredRect: Rect | null;
  lineProgress: number[];  // one per pair, animates 0→1
  rafId:       number | null;
  mouseX:      number;
  mouseY:      number;
  pending:     boolean;
}

const state: MeasureState = {
  pinned:       [],
  hoveredEl:    null,
  hoveredRect:  null,
  lineProgress: [],
  rafId:        null,
  mouseX:       0,
  mouseY:       0,
  pending:      false,
};

let overlay: OverlayElements | null = null;

export function initMeasureMode(o: OverlayElements): void {
  overlay = o;
  document.addEventListener('click',     onClick,     true);
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  scheduleFrame();
}

export function destroyMeasureMode(): void {
  document.removeEventListener('click',     onClick,     true);
  document.removeEventListener('mousemove', onMouseMove);
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  resetState();
}

function resetState(): void {
  state.pinned       = [];
  state.hoveredEl    = null;
  state.hoveredRect  = null;
  state.lineProgress = [];
}

function onClick(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  const el = getElementAtPoint(e.clientX, e.clientY);
  if (!el) return;

  // Clicking an already-pinned element resets
  if (state.pinned.some((p) => p.el === el)) {
    resetState();
    return;
  }

  // At the max, reset and start over with this element
  if (state.pinned.length >= MAX_ELEMENTS) {
    resetState();
  }

  const rect = getElementRect(el);
  state.pinned.push({ el, rect });

  // Add a fresh progress value for the new pair (if 2+ elements)
  if (state.pinned.length >= 2) {
    state.lineProgress.push(0);
  }
}

function onMouseMove(e: MouseEvent): void {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  if (!state.pending) {
    state.pending = true;
    requestAnimationFrame(() => {
      state.pending    = false;
      state.hoveredEl  = getElementAtPoint(state.mouseX, state.mouseY);
      state.hoveredRect = state.hoveredEl ? getElementRect(state.hoveredEl) : null;
    });
  }
}

function scheduleFrame(): void {
  if (!overlay) return;
  state.rafId = requestAnimationFrame(() => { render(); scheduleFrame(); });
}

// ─── Measurement line geometry ────────────────────────────────────────────────

function measurePair(
  a: Rect,
  b: Rect,
): { x1: number; y1: number; x2: number; y2: number; distance: number; direction: 'horizontal' | 'vertical' } {
  const { distance, direction } = distanceBetweenRects(a, b);

  let x1: number, y1: number, x2: number, y2: number;

  if (direction === 'horizontal') {
    const midY = ((a.top + a.bottom) / 2 + (b.top + b.bottom) / 2) / 2;
    y1 = midY; y2 = midY;
    x1 = a.right <= b.left ? a.right : a.left;
    x2 = a.right <= b.left ? b.left  : b.right;
  } else {
    const midX = ((a.left + a.right) / 2 + (b.left + b.right) / 2) / 2;
    x1 = midX; x2 = midX;
    y1 = a.bottom <= b.top ? a.bottom : a.top;
    y2 = a.bottom <= b.top ? b.top    : b.bottom;
  }

  return { x1, y1, x2, y2, distance, direction };
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(): void {
  if (!overlay) return;
  const { ctx, labelContainer } = overlay;

  clearCanvas(ctx);

  // Animate line progress
  for (let i = 0; i < state.lineProgress.length; i++) {
    state.lineProgress[i] = Math.min(1, (state.lineProgress[i] ?? 0) + 0.08);
  }

  // Hover hint (only when no element pinned yet, or waiting for next)
  const isHoverPinned = state.pinned.some((p) => p.el === state.hoveredEl);
  if (state.hoveredRect && !isHoverPinned) {
    drawElementHighlight(ctx, state.hoveredRect, false, 0.5);
  }

  // Pinned elements
  for (let i = 0; i < state.pinned.length; i++) {
    const { rect } = state.pinned[i]!;
    drawElementHighlight(ctx, rect, true, 1);

    const badge = BADGES[i] ?? String(i + 1);
    setLabel(
      labelContainer, `dim-${i}`,
      `${badge}  ${formatDimensions(rect.width, rect.height)}`,
      rect.left, rect.top - 28,
    );
  }

  // Measurements between each consecutive pair
  for (let i = 0; i < state.pinned.length - 1; i++) {
    const a = state.pinned[i]!.rect;
    const b = state.pinned[i + 1]!.rect;
    const progress = state.lineProgress[i] ?? 1;

    const { x1, y1, x2, y2, distance, direction } = measurePair(a, b);

    // Alignment guidelines
    if (direction === 'horizontal') {
      drawAlignmentGuideline(ctx, a.right, a.top, a.right, a.bottom);
      drawAlignmentGuideline(ctx, b.left,  b.top, b.left,  b.bottom);
    } else {
      drawAlignmentGuideline(ctx, a.left, a.bottom, a.right, a.bottom);
      drawAlignmentGuideline(ctx, b.left, b.top,    b.right, b.top);
    }

    drawMeasurementLine(ctx, x1, y1, x2, y2, progress);

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const distText = formatDistance(distance);
    setLabel(labelContainer, `dist-${i}`, distText, midX - 20, midY - 12, distText);
  }

  // Hint label
  if (state.pinned.length === 0) {
    hideLabel('hint');
  } else if (state.pinned.length < MAX_ELEMENTS) {
    const last = state.pinned[state.pinned.length - 1]!.rect;
    setLabel(
      labelContainer, 'hint',
      state.pinned.length === 1
        ? 'Click a second element →'
        : `Click to add more · click pinned element to reset`,
      last.left, last.bottom + 8,
    );
  } else {
    setLabel(labelContainer, 'hint', 'Click any element to reset', 20, 60);
  }

  drawRulers(ctx, state.mouseX, state.mouseY);
}
