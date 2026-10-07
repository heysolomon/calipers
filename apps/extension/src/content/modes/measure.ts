/**
 * Measure mode — click 2–5 elements to see distances between each consecutive pair.
 * Pinned measurements live on the persist layer and survive mode switches until cleared.
 */
import type { Rect } from '@raval/shared';
import type { OverlayElements } from '../overlay';
import { getElementAtPoint, getElementRect } from '../detector';
import {
  clearCanvas, drawElementHighlight, drawMeasurementLine,
  drawAlignmentGuideline, drawRulers, drawBadge, LINE_TRAVEL,
} from '../renderer';
import { setLabel, hideLabel, removeLabel, showToast } from '../labels';
import { formatDistance, formatDimensions, distanceBetweenRects, isRavalElement } from '../utils';
import { BoxSpring, boxToRect, tuning } from '../motion';
import { addRenderer, markActive } from '../frame';
import { onPageChange, createPageShelf } from '../page-scope';
import { setCursorResolver, refreshCursor } from '../cursor';
import { hoverSuppressed } from '../pointer';

const MAX_ELEMENTS = 5;
const BADGES = ['A', 'B', 'C', 'D', 'E'];

interface PinnedElement {
  el: Element;
  rect: Rect;
}

interface MeasureState {
  pinned: PinnedElement[];
  hoveredEl: Element | null;
  hoveredRect: Rect | null;
  lineProgress: number[];
  mouseX: number;
  mouseY: number;
  pending: boolean;
  interactive: boolean;
}

const state: MeasureState = {
  pinned: [],
  hoveredEl: null,
  hoveredRect: null,
  lineProgress: [],
  mouseX: 0,
  mouseY: 0,
  pending: false,
  interactive: false,
};

let overlay: OverlayElements | null = null;
let stopLoop: (() => void) | null = null;
let knownLabelIds = new Set<string>();
let lastPaint = 0;
const hoverBox = new BoxSpring();

export function initMeasureMode(o: OverlayElements): void {
  overlay = o;
  state.interactive = true;
  document.addEventListener('click', onClick, true);
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  // Over a pinned element the cursor becomes a minus: a click there unpins it.
  setCursorResolver(() => (isRemovable(state.hoveredEl) ? 'remove' : 'crosshair'));
  scheduleFrame();
}

/** Detach interaction only — pins stay on the persist layer. */
export function destroyMeasureMode(): void {
  state.interactive = false;
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('mousemove', onMouseMove);
  setCursorResolver(null);
  justPinned = null;
  stopLoop?.();
  stopLoop = null;
  state.hoveredEl = null;
  state.hoveredRect = null;
  hoverBox.reset();
  overlay = null;
}

// Pinned measurements stay with the page they were made on. Returning to a
// page restores the ones whose elements are still there.
const pinShelf = createPageShelf<PinnedElement>();
onPageChange((from, to) => {
  const leaving = state.pinned;
  history.length = 0;
  resetPins();
  state.pinned = pinShelf.swap(from, to, leaving).filter((p) => p.el.isConnected);
  state.lineProgress = state.pinned.slice(1).map(() => 1);
  markActive();
});

// ─── Unpinning ────────────────────────────────────────────────────────────────
// A removed pin does not just vanish: its lines draw back into the elements
// they came from, the reverse of how they were drawn.

interface Retracting {
  /** The end that stays: the edge of an element that is still pinned. */
  x1: number; y1: number;
  /** The end that pulls back: the edge of the element being removed. */
  x2: number; y2: number;
  progress: number;
}

/** Leaving is quicker than arriving. */
const RETRACT_SHARE = 0.7;
let retracting: Retracting[] = [];
let fadingPin: { rect: Rect; progress: number } | null = null;

function unpin(index: number): void {
  const prev = state.pinned[index - 1];
  const cur = state.pinned[index]!;
  const next = state.pinned[index + 1];

  retracting = [];
  if (prev) {
    const m = measurePair(prev.rect, cur.rect);
    retracting.push({ x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2, progress: 1 });
  }
  if (next) {
    // Drawn from the removed element to the next one, so it pulls back the other way.
    const m = measurePair(cur.rect, next.rect);
    retracting.push({ x1: m.x2, y1: m.y2, x2: m.x1, y2: m.y1, progress: 1 });
  }
  fadingPin = { rect: cur.rect, progress: 1 };

  state.pinned.splice(index, 1);
  // The neighbours are now joined directly; that line waits for the old ones to pull back.
  const bridge = prev && next ? index - 1 : -1;
  state.lineProgress = state.pinned.slice(1).map((_, i) => (i === bridge ? -RETRACT_SHARE : 1));
  lastPaint = performance.now();
  markActive();
}

// ─── Undo ─────────────────────────────────────────────────────────────────────

const HISTORY_LIMIT = 50;
const history: PinnedElement[][] = [];

/** Snapshot the pins before changing them. */
function remember(): void {
  history.push([...state.pinned]);
  if (history.length > HISTORY_LIMIT) history.shift();
}

/** Existing lines are shown complete; only a newly added one animates. */
function settleLines(): void {
  state.lineProgress = state.pinned.slice(1).map(() => 1);
}

/** Step back one change. Returns false when there is nothing to undo. */
export function undoMeasurement(): boolean {
  const previous = history.pop();
  if (!previous) return false;
  for (const name of knownLabelIds) removeLabel(name);
  knownLabelIds.clear();
  retracting = [];
  fadingPin = null;
  state.pinned = previous.filter((p) => p.el.isConnected);
  settleLines();
  markActive();
  return true;
}

function resetPins(): void {
  retracting = [];
  fadingPin = null;
  for (const name of knownLabelIds) removeLabel(name);
  knownLabelIds.clear();
  state.pinned = [];
  state.lineProgress = [];
  state.hoveredEl = null;
  state.hoveredRect = null;
}

export function clearMeasurements(): void {
  if (state.pinned.length > 0) remember();
  resetPins();
  showToast('Measurements cleared');
}

/** Boxes of the pinned elements, for guides to snap to. */
export function getPinnedRects(): Rect[] {
  return state.pinned.filter((p) => p.el.isConnected).map((p) => getElementRect(p.el));
}

export function hasPinnedMeasurements(): boolean {
  return state.pinned.length > 0;
}

/**
 * The element you just pinned is still under the pointer. Like a just-placed
 * guide, it only becomes removable once you have moved off it and come back,
 * so a double click cannot pin and immediately unpin it.
 */
let justPinned: Element | null = null;

function isRemovable(el: Element | null): boolean {
  return el !== null && el !== justPinned && state.pinned.some((p) => p.el === el);
}

function onClick(e: MouseEvent): void {
  if (isRavalElement(e.target as Element)) return;
  const el = getElementAtPoint(e.clientX, e.clientY);
  if (!el || el === justPinned) return;

  remember();

  // Clicking a pinned element removes just that pin, not the whole set.
  const existing = state.pinned.findIndex((p) => p.el === el);
  if (existing >= 0) {
    unpin(existing);
    refreshCursor();
    return;
  }

  // At the limit, the oldest pin makes room instead of everything being wiped.
  if (state.pinned.length >= MAX_ELEMENTS) {
    state.pinned.shift();
    settleLines();
  }

  state.pinned.push({ el, rect: getElementRect(el) });
  // The next step is said once, in a toast, instead of sitting on the page next to the measurements.
  state.hoveredEl = el;
  justPinned = el;
  refreshCursor();
  if (state.pinned.length === 1) showToast('Click another element to measure');
  if (state.pinned.length >= 2) {
    state.lineProgress.push(0);
    // Start the clock now. Rendering is on demand, so the time since the last
    // paint could otherwise be counted as progress and skip the line's start.
    lastPaint = performance.now();
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
      if (state.hoveredEl !== justPinned) justPinned = null;
      state.hoveredRect = state.hoveredEl ? getElementRect(state.hoveredEl) : null;
      refreshCursor();
    });
  }
}

function scheduleFrame(): void {
  if (!overlay || !state.interactive) return;
  stopLoop?.();
  stopLoop = addRenderer(renderInteractive);
}

/**
 * Where on the shared axis the line should run. Inside the stretch both
 * elements cover, so it leaves one edge and lands on the other; when they do
 * not overlap at all, through the first element's centre so it still starts on
 * that element's edge.
 */
function crossAxis(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const from = Math.max(aStart, bStart);
  const to = Math.min(aEnd, bEnd);
  return to > from ? (from + to) / 2 : (aStart + aEnd) / 2;
}

function measurePair(
  a: Rect,
  b: Rect,
): { x1: number; y1: number; x2: number; y2: number; distance: number; direction: 'horizontal' | 'vertical' } {
  const { distance, direction } = distanceBetweenRects(a, b);

  let x1: number, y1: number, x2: number, y2: number;

  if (direction === 'horizontal') {
    y1 = y2 = crossAxis(a.top, a.bottom, b.top, b.bottom);
    x1 = a.right <= b.left ? a.right : a.left;
    x2 = a.right <= b.left ? b.left : b.right;
  } else {
    x1 = x2 = crossAxis(a.left, a.right, b.left, b.right);
    y1 = a.bottom <= b.top ? a.bottom : a.top;
    y2 = a.bottom <= b.top ? b.top : b.bottom;
  }

  return { x1, y1, x2, y2, distance, direction };
}

/** Paint pinned measurements onto the persist canvas. */
export function paintPinnedMeasurements(
  ctx: CanvasRenderingContext2D,
  labelContainer: HTMLElement,
): void {
  // Drop elements that left the DOM
  state.pinned = state.pinned.filter((p) => p.el.isConnected);
  state.lineProgress = state.lineProgress.slice(0, Math.max(0, state.pinned.length - 1));

  // Keep rects live so marks follow scroll / layout
  for (const p of state.pinned) {
    p.rect = getElementRect(p.el);
  }

  // Animate while interactive; freeze at 1 when browsing other modes
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastPaint) / 1000);
  lastPaint = now;
  if (state.interactive) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inc = !tuning.enabled || reduce || tuning.lineDraw <= 0 ? 1 : dt / tuning.lineDraw;
    for (let i = 0; i < state.lineProgress.length; i++) {
      state.lineProgress[i] = Math.min(1, (state.lineProgress[i] ?? 0) + inc);
      if ((state.lineProgress[i] ?? 1) < 1) markActive();
    }

    // Lines of a pin that was just removed, drawing back into what they came from.
    const dec = inc / RETRACT_SHARE;
    retracting = retracting.filter((r) => (r.progress -= dec) > 0);
    for (const r of retracting) drawMeasurementLine(ctx, r.x1, r.y1, r.x2, r.y2, r.progress);
    if (fadingPin) {
      fadingPin.progress -= dec;
      if (fadingPin.progress <= 0) fadingPin = null;
      else drawElementHighlight(ctx, fadingPin.rect, true, fadingPin.progress);
    }
    if (retracting.length > 0 || fadingPin) markActive();
  } else {
    retracting = [];
    fadingPin = null;
  }

  const liveIds = new Set<string>();

  for (let i = 0; i < state.pinned.length; i++) {
    const { el, rect } = state.pinned[i]!;
    drawElementHighlight(ctx, rect, true, 1);

    // Size is shown only for the pinned element under the pointer; the rest
    // carry just their letter, so labels do not pile up over the distances.
    if (state.interactive && state.hoveredEl === el && !hoverSuppressed()) {
      const dimName = `persist-dim-${i}`;
      liveIds.add(dimName);
      knownLabelIds.add(dimName);
      const dims = formatDimensions(rect.width, rect.height);
      setLabel(labelContainer, dimName, dims, rect.left + 14, rect.top - 28, dims);
    }
  }

  for (let i = 0; i < state.pinned.length - 1; i++) {
    const a = state.pinned[i]!.rect;
    const b = state.pinned[i + 1]!.rect;
    // Below zero means the line is waiting its turn.
    const progress = Math.max(0, state.lineProgress[i] ?? 1);
    if (progress <= 0) continue;

    const { x1, y1, x2, y2, distance, direction } = measurePair(a, b);

    // The second element's edge and the distance appear as the line arrives.
    const arrived = Math.max(0, Math.min(1, (progress - LINE_TRAVEL) / (1 - LINE_TRAVEL)));

    // Dashed edges the line runs between. The far one stretches to meet the
    // line when the elements do not overlap on that axis.
    if (direction === 'horizontal') {
      drawAlignmentGuideline(ctx, x1, a.top, x1, a.bottom);
      ctx.globalAlpha = arrived;
      drawAlignmentGuideline(ctx, x2, Math.min(b.top, y2), x2, Math.max(b.bottom, y2));
    } else {
      drawAlignmentGuideline(ctx, a.left, y1, a.right, y1);
      ctx.globalAlpha = arrived;
      drawAlignmentGuideline(ctx, Math.min(b.left, x2), y2, Math.max(b.right, x2), y2);
    }
    ctx.globalAlpha = 1;

    drawMeasurementLine(ctx, x1, y1, x2, y2, progress);

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const distText = formatDistance(distance);
    const distName = `persist-dist-${i}`;
    liveIds.add(distName);
    knownLabelIds.add(distName);
    if (arrived <= 0) {
      hideLabel(distName);
      continue;
    }
    setLabel(labelContainer, distName, distText, midX - 20, midY - 12, distText);
  }

  // Drawn last so the lines never cover them.
  for (let i = 0; i < state.pinned.length; i++) {
    const { rect } = state.pinned[i]!;
    drawBadge(ctx, rect.left, rect.top, BADGES[i] ?? String(i + 1));
  }

  for (const name of [...knownLabelIds]) {
    if (!liveIds.has(name)) {
      removeLabel(name);
      knownLabelIds.delete(name);
    }
  }
}

/** Ephemeral hover while measure mode is active. */
function renderInteractive(): void {
  if (!overlay) return;
  const { ctx } = overlay;

  clearCanvas(ctx);

  const isHoverPinned = state.pinned.some((p) => p.el === state.hoveredEl);
  const box = hoverBox.step(isHoverPinned || hoverSuppressed() ? null : state.hoveredRect);
  if (box) drawElementHighlight(ctx, boxToRect(box), false, box.opacity);

  drawRulers(ctx, state.mouseX, state.mouseY);
}
