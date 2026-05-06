/**
 * Guides mode — place, drag, and manage alignment guides.
 * Phase 2: snap-to-element-edges, ruler overlay, cross-session persistence.
 */
import type { Guide } from '@calipers/shared';
import type { OverlayElements } from '../overlay';
import { clearCanvas, drawGuide, drawGuideHandle, drawRulers, RULER_SIZE } from '../renderer';
import { setLabel } from '../labels';
import { formatDistance, uid, isCalipersElement } from '../utils';
import { loadGuides, saveGuides } from '../storage';

interface GuidesState {
  guides:      Guide[];
  draggingId:  string | null;
  hoveredId:   string | null;
  rafId:       number | null;
  mouseX:      number;
  mouseY:      number;
  snapEnabled: boolean;
  snapTarget:  number | null; // highlighted snap position
}

const state: GuidesState = {
  guides:      [],
  draggingId:  null,
  hoveredId:   null,
  rafId:       null,
  mouseX:      0,
  mouseY:      0,
  snapEnabled: true,
  snapTarget:  null,
};

const HANDLE_HIT    = 16;  // px radius for handle hit area
const SNAP_THRESHOLD = 8;  // px — snap to element edges within this distance

let overlay: OverlayElements | null = null;

export function setSnapEnabled(enabled: boolean): void {
  state.snapEnabled = enabled;
}

export async function initGuidesMode(o: OverlayElements, snapEnabled = true): Promise<void> {
  overlay = o;
  state.snapEnabled = snapEnabled;
  document.addEventListener('click',       onClick,       true);
  document.addEventListener('mousemove',   onMouseMove,   { passive: true });
  document.addEventListener('mousedown',   onMouseDown,   true);
  document.addEventListener('mouseup',     onMouseUp);
  document.addEventListener('contextmenu', onContextMenu, true);

  // Load persisted guides
  const saved = await loadGuides();
  if (saved.length) state.guides.splice(0, state.guides.length, ...saved);

  scheduleFrame();
}

export function destroyGuidesMode(): void {
  document.removeEventListener('click',       onClick,       true);
  document.removeEventListener('mousemove',   onMouseMove);
  document.removeEventListener('mousedown',   onMouseDown,   true);
  document.removeEventListener('mouseup',     onMouseUp);
  document.removeEventListener('contextmenu', onContextMenu, true);
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;
}

export function getGuides(): Guide[] { return state.guides; }

export function setGuides(guides: Guide[]): void {
  state.guides.splice(0, state.guides.length, ...guides);
}

export function clearGuides(): void {
  state.guides.splice(0, state.guides.length);
  saveGuides([]);
}

// ─── Snap logic ───────────────────────────────────────────────────────────────

function findSnapPosition(
  axis: 'horizontal' | 'vertical',
  rawPosition: number,
  mouseX: number,
  mouseY: number,
): number {
  // Temporarily disable our overlay so elementsFromPoint hits the real page
  const root   = document.getElementById('calipers-overlay-root');
  const canvas = document.getElementById('calipers-canvas-overlay');
  const prevR  = root?.style.pointerEvents   ?? '';
  const prevC  = canvas?.style.pointerEvents ?? '';
  if (root)   root.style.pointerEvents   = 'none';
  if (canvas) canvas.style.pointerEvents = 'none';

  // Sample several points perpendicular to the guide to catch nearby elements
  const offsets = [-SNAP_THRESHOLD, 0, SNAP_THRESHOLD];
  const candidates = new Set<Element>();
  for (const off of offsets) {
    const x = axis === 'horizontal' ? mouseX + off : mouseX;
    const y = axis === 'horizontal' ? mouseY       : mouseY + off;
    for (const el of document.elementsFromPoint(x, y)) {
      if (!isCalipersElement(el)) candidates.add(el);
    }
  }

  if (root)   root.style.pointerEvents   = prevR;
  if (canvas) canvas.style.pointerEvents = prevC;

  let best = rawPosition;
  let minDist = SNAP_THRESHOLD + 1;

  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    const edges = axis === 'horizontal'
      ? [r.top, r.bottom]
      : [r.left, r.right];

    for (const edge of edges) {
      const d = Math.abs(edge - rawPosition);
      if (d < SNAP_THRESHOLD && d < minDist) {
        minDist = d;
        best    = edge;
      }
    }
  }

  state.snapTarget = best !== rawPosition ? best : null;
  return best;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function getHandlePosition(guide: Guide): { x: number; y: number } {
  const M = RULER_SIZE + 4;
  return guide.axis === 'horizontal'
    ? { x: M, y: guide.position }
    : { x: guide.position, y: M };
}

function findGuideAtPoint(x: number, y: number): Guide | null {
  for (const guide of state.guides) {
    const hp   = getHandlePosition(guide);
    const dist = Math.hypot(x - hp.x, y - hp.y);
    if (dist <= HANDLE_HIT) return guide;
    if (guide.axis === 'horizontal' && Math.abs(y - guide.position) <= 4) return guide;
    if (guide.axis === 'vertical'   && Math.abs(x - guide.position) <= 4) return guide;
  }
  return null;
}

function onClick(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  if (state.hoveredId) return; // clicking existing guide — don't create new one

  const x = e.clientX;
  const y = e.clientY;

  // Don't place guides in the ruler strip
  if (x < RULER_SIZE || y < RULER_SIZE) return;

  state.guides.push({ id: uid(), axis: 'horizontal', position: y });
  state.guides.push({ id: uid(), axis: 'vertical',   position: x });
  saveGuides(state.guides);
}

function onMouseMove(e: MouseEvent): void {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;

  if (state.draggingId) {
    const guide = state.guides.find((g) => g.id === state.draggingId);
    if (guide) {
      const raw = guide.axis === 'horizontal' ? e.clientY : e.clientX;
      guide.position = state.snapEnabled
        ? findSnapPosition(guide.axis, raw, e.clientX, e.clientY)
        : raw;
      state.snapTarget = state.snapEnabled ? state.snapTarget : null;
    }
  } else {
    state.snapTarget = null;
    const hovered = findGuideAtPoint(e.clientX, e.clientY);
    state.hoveredId = hovered?.id ?? null;
  }
}

function onMouseDown(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  const guide = findGuideAtPoint(e.clientX, e.clientY);
  if (guide) {
    state.draggingId = guide.id;
    e.preventDefault();
  }
}

function onMouseUp(): void {
  if (state.draggingId) {
    saveGuides(state.guides);
    state.draggingId = null;
    state.snapTarget  = null;
  }
}

function onContextMenu(e: MouseEvent): void {
  const guide = findGuideAtPoint(e.clientX, e.clientY);
  if (guide) {
    e.preventDefault();
    state.guides.splice(state.guides.findIndex((g) => g.id === guide.id), 1);
    saveGuides(state.guides);
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────

function scheduleFrame(): void {
  if (!overlay) return;
  state.rafId = requestAnimationFrame(() => { render(); scheduleFrame(); });
}

function render(): void {
  if (!overlay) return;
  const { ctx, labelContainer } = overlay;

  clearCanvas(ctx);

  // Live crosshair
  drawGuide(ctx, 'horizontal', state.mouseY, false);
  drawGuide(ctx, 'vertical',   state.mouseX, false);

  // Snap indicator — bright tick on the snapped axis
  if (state.snapTarget !== null && state.draggingId) {
    const guide = state.guides.find((g) => g.id === state.draggingId);
    if (guide) drawGuide(ctx, guide.axis, state.snapTarget, true);
  }

  // Cursor position label
  setLabel(
    labelContainer, 'crosshair-pos',
    `${Math.round(state.mouseX)}, ${Math.round(state.mouseY)}`,
    state.mouseX + 10, state.mouseY - 22,
  );

  // Persistent placed guides
  for (const guide of state.guides) {
    const hovered = guide.id === state.hoveredId || guide.id === state.draggingId;
    drawGuide(ctx, guide.axis, guide.position, hovered);

    const hp = getHandlePosition(guide);
    drawGuideHandle(ctx, hp.x, hp.y, hovered);

    const labelX = guide.axis === 'horizontal' ? hp.x + 12 : hp.x - 12;
    const labelY = guide.axis === 'horizontal' ? hp.y - 12 : hp.y + 12;
    setLabel(labelContainer, `guide-pos-${guide.id}`, formatDistance(guide.position), labelX, labelY);
  }

  drawRulers(ctx, state.mouseX, state.mouseY);
}
