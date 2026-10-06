/**
 * Guides mode — place H / V / both alignment guides.
 * Placed guides live on the persist layer and survive mode switches until cleared.
 */
import type { Guide } from '@calipers/shared';
import type { OverlayElements } from '../overlay';
import { clearCanvas, drawGuide, drawRulers, RULER_SIZE } from '../renderer';
import { setLabel, removeLabel } from '../labels';
import { formatDistance, uid, isCalipersElement, toPageX, toPageY, toViewX, toViewY } from '../utils';
import { loadGuides, saveGuides } from '../storage';

export type GuidePlacement = 'both' | 'horizontal' | 'vertical';

interface GuidesState {
  guides: Guide[];
  draggingId: string | null;
  hoveredId: string | null;
  rafId: number | null;
  mouseX: number;
  mouseY: number;
  snapEnabled: boolean;
  snapTarget: number | null;
  placement: GuidePlacement;
  interactive: boolean;
  visible: boolean;
  showLabels: boolean;
}

const state: GuidesState = {
  guides: [],
  draggingId: null,
  hoveredId: null,
  rafId: null,
  mouseX: 0,
  mouseY: 0,
  snapEnabled: true,
  snapTarget: null,
  placement: 'both',
  interactive: false,
  visible: true,
  showLabels: false,
};

const HANDLE_HIT = 16;
const SNAP_THRESHOLD = 8;
const SNAP_SAMPLE_STEP = 48;

let overlay: OverlayElements | null = null;
let sessionId = 0;
let knownLabelIds = new Set<string>();

export function setSnapEnabled(enabled: boolean): void {
  state.snapEnabled = enabled;
}

export function setGuidesVisible(visible: boolean): void {
  state.visible = visible;
}

export function isGuidesVisible(): boolean {
  return state.visible;
}

export function setGuideLabelsVisible(visible: boolean): void {
  state.showLabels = visible;
}

export function isGuideLabelsVisible(): boolean {
  return state.showLabels;
}

export function setGuidePlacement(placement: GuidePlacement): void {
  state.placement = placement;
}

export function getGuidePlacement(): GuidePlacement {
  return state.placement;
}

/** Load saved guides into memory so the persist layer can paint them in any mode. */
export async function hydrateGuides(): Promise<void> {
  const saved = await loadGuides();
  state.guides.splice(0, state.guides.length, ...saved);
}

export async function initGuidesMode(o: OverlayElements, snapEnabled = true): Promise<void> {
  const sid = ++sessionId;
  overlay = o;
  state.snapEnabled = snapEnabled;
  state.draggingId = null;
  state.hoveredId = null;
  state.snapTarget = null;
  state.interactive = true;

  document.addEventListener('click', onClick, true);
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('keydown', onKeyDown, true);

  await hydrateGuides();
  if (sid !== sessionId) return;

  scheduleFrame();
}

/** Detach interaction only — placed guides stay on the persist layer. */
export function destroyGuidesMode(): void {
  sessionId++;
  state.interactive = false;
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('contextmenu', onContextMenu, true);
  document.removeEventListener('keydown', onKeyDown, true);
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  state.draggingId = null;
  state.hoveredId = null;
  state.snapTarget = null;
  overlay = null;
}

export function getGuides(): Guide[] {
  return state.guides;
}

export function setGuides(guides: Guide[]): void {
  state.guides.splice(0, state.guides.length, ...guides);
}

function removeGuideLabels(ids: string[]): void {
  for (const id of ids) {
    removeLabel(`persist-guide-${id}`);
    removeLabel(`guide-pos-${id}`);
    knownLabelIds.delete(`persist-guide-${id}`);
  }
}

export function clearGuides(): void {
  const ids = state.guides.map((g) => g.id);
  state.guides.splice(0, state.guides.length);
  removeGuideLabels(ids);
  void saveGuides([]);
}

function removeGuide(guide: Guide): void {
  const idx = state.guides.findIndex((g) => g.id === guide.id);
  if (idx === -1) return;
  state.guides.splice(idx, 1);
  removeGuideLabels([guide.id]);
  if (state.hoveredId === guide.id) state.hoveredId = null;
  if (state.draggingId === guide.id) state.draggingId = null;
  void saveGuides(state.guides);
}

/** Paint placed guides onto the persist canvas (called every frame while Calipers is open). */
export function paintPlacedGuides(
  ctx: CanvasRenderingContext2D,
  labelContainer: HTMLElement,
): void {
  const liveIds = new Set<string>();

  for (const guide of state.guides) {
    const hovered = guide.id === state.hoveredId || guide.id === state.draggingId;
    const viewPos = guideViewPos(guide);
    drawGuide(ctx, guide.axis, viewPos, hovered);

    const labelName = `persist-guide-${guide.id}`;
    if (!state.showLabels) continue;

    const hp = getHandlePosition(guide);
    liveIds.add(labelName);
    knownLabelIds.add(labelName);

    const labelX = guide.axis === 'horizontal' ? hp.x + 12 : hp.x - 12;
    const labelY = guide.axis === 'horizontal' ? hp.y - 12 : hp.y + 12;
    setLabel(labelContainer, labelName, formatDistance(guide.position), labelX, labelY);
  }

  for (const name of [...knownLabelIds]) {
    if (!liveIds.has(name)) {
      removeLabel(name);
      knownLabelIds.delete(name);
    }
  }
}

// ─── Snap logic ───────────────────────────────────────────────────────────────

function collectSnapCandidates(
  axis: 'horizontal' | 'vertical',
  rawPosition: number,
  mouseX: number,
  mouseY: number,
): Set<Element> {
  const candidates = new Set<Element>();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const band = [-SNAP_THRESHOLD, 0, SNAP_THRESHOLD];

  const addAt = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= vw || y >= vh) return;
    for (const el of document.elementsFromPoint(x, y)) {
      if (!isCalipersElement(el) && el !== document.documentElement && el !== document.body) {
        candidates.add(el);
      }
    }
  };

  for (const off of band) {
    if (axis === 'horizontal') addAt(mouseX + off, rawPosition);
    else addAt(rawPosition, mouseY + off);
  }

  if (axis === 'horizontal') {
    for (let x = RULER_SIZE; x < vw; x += SNAP_SAMPLE_STEP) {
      for (const dy of band) addAt(x, rawPosition + dy);
    }
    addAt(vw - 1, rawPosition);
  } else {
    for (let y = RULER_SIZE; y < vh; y += SNAP_SAMPLE_STEP) {
      for (const dx of band) addAt(rawPosition + dx, y);
    }
    addAt(rawPosition, vh - 1);
  }

  return candidates;
}

function withPageHitTesting<T>(fn: () => T): T {
  const root = document.getElementById('calipers-overlay-root');
  const canvas = document.getElementById('calipers-canvas-overlay');
  const persist = document.getElementById('calipers-persist-canvas');
  const panel = document.getElementById('calipers-panel');
  const labels = document.getElementById('calipers-labels');
  const persistLabels = document.getElementById('calipers-persist-labels');
  const annotate = document.getElementById('calipers-annotate-root');

  const targets = [root, canvas, persist, panel, labels, persistLabels, annotate]
    .filter(Boolean) as HTMLElement[];
  const prev = targets.map((el) => el.style.pointerEvents);
  for (const el of targets) el.style.pointerEvents = 'none';

  try {
    return fn();
  } finally {
    targets.forEach((el, i) => { el.style.pointerEvents = prev[i] ?? ''; });
  }
}

function findSnapPosition(
  axis: 'horizontal' | 'vertical',
  rawPosition: number,
  mouseX: number,
  mouseY: number,
): number {
  const candidates = withPageHitTesting(() =>
    collectSnapCandidates(axis, rawPosition, mouseX, mouseY),
  );

  let best = rawPosition;
  let minDist = SNAP_THRESHOLD + 1;

  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.width >= window.innerWidth - 2 && r.height >= window.innerHeight - 2) continue;

    const edges = axis === 'horizontal' ? [r.top, r.bottom] : [r.left, r.right];
    for (const edge of edges) {
      const d = Math.abs(edge - rawPosition);
      if (d <= SNAP_THRESHOLD && d < minDist) {
        minDist = d;
        best = edge;
      }
    }
  }

  state.snapTarget = best !== rawPosition ? best : null;
  return best;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/** Guide position in viewport space (for hit-testing / drawing). */
function guideViewPos(guide: Guide): number {
  return guide.axis === 'horizontal'
    ? toViewY(guide.position)
    : toViewX(guide.position);
}

/** Convert a viewport position to document space for the given axis. */
function toGuidePagePos(axis: 'horizontal' | 'vertical', viewPos: number): number {
  return axis === 'horizontal' ? toPageY(viewPos) : toPageX(viewPos);
}

function getHandlePosition(guide: Guide): { x: number; y: number } {
  const M = RULER_SIZE + 4;
  const viewPos = guideViewPos(guide);
  return guide.axis === 'horizontal'
    ? { x: M, y: viewPos }
    : { x: viewPos, y: M };
}

function findGuideAtPoint(x: number, y: number): Guide | null {
  for (const guide of state.guides) {
    const hp = getHandlePosition(guide);
    const dist = Math.hypot(x - hp.x, y - hp.y);
    if (dist <= HANDLE_HIT) return guide;
    const viewPos = guideViewPos(guide);
    if (guide.axis === 'horizontal' && Math.abs(y - viewPos) <= 4) return guide;
    if (guide.axis === 'vertical' && Math.abs(x - viewPos) <= 4) return guide;
  }
  return null;
}

function onKeyDown(e: KeyboardEvent): void {
  if (!state.interactive) return;
  const t = e.target as HTMLElement;
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const key = e.key.toLowerCase();
  if (key === 'h') {
    e.preventDefault();
    e.stopPropagation();
    setGuidePlacement('horizontal');
    syncPlacementUi();
  } else if (key === 'v') {
    e.preventDefault();
    e.stopPropagation();
    setGuidePlacement('vertical');
    syncPlacementUi();
  } else if (key === 'c') {
    e.preventDefault();
    e.stopPropagation();
    setGuidePlacement('both');
    syncPlacementUi();
  }
}

function syncPlacementUi(): void {
  const idx = state.placement === 'horizontal' ? 1 : state.placement === 'vertical' ? 2 : 0;
  const indicator = document.querySelector<HTMLElement>('[data-guide-placement-indicator]');
  if (indicator) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    indicator.style.transition = reduce ? 'none' : 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
    indicator.style.left = `calc(3px + ${idx} * ((100% - 6px) / 3))`;
  }
  document.querySelectorAll<HTMLElement>('[data-guide-placement]').forEach((btn) => {
    const on = btn.dataset['guidePlacement'] === state.placement;
    btn.style.color = on ? '#000' : '#737373';
    btn.setAttribute('aria-pressed', String(on));
  });
}

function onClick(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  if (state.hoveredId) return;
  if (e.button !== 0) return;

  let x = e.clientX;
  let y = e.clientY;
  if (x < RULER_SIZE || y < RULER_SIZE) return;

  if (state.snapEnabled) {
    if (state.placement !== 'vertical') {
      y = findSnapPosition('horizontal', y, e.clientX, e.clientY);
    }
    if (state.placement !== 'horizontal') {
      x = findSnapPosition('vertical', x, e.clientX, e.clientY);
    }
  }

  if (state.placement === 'both' || state.placement === 'horizontal') {
    state.guides.push({ id: uid(), axis: 'horizontal', position: toGuidePagePos('horizontal', y) });
  }
  if (state.placement === 'both' || state.placement === 'vertical') {
    state.guides.push({ id: uid(), axis: 'vertical', position: toGuidePagePos('vertical', x) });
  }
  void saveGuides(state.guides);
}

function onMouseMove(e: MouseEvent): void {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;

  if (state.draggingId) {
    const guide = state.guides.find((g) => g.id === state.draggingId);
    if (guide) {
      const raw = guide.axis === 'horizontal' ? e.clientY : e.clientX;
      const viewPos = state.snapEnabled
        ? findSnapPosition(guide.axis, raw, e.clientX, e.clientY)
        : raw;
      guide.position = toGuidePagePos(guide.axis, viewPos);
      state.snapTarget = state.snapEnabled ? state.snapTarget : null;
    }
  } else {
    state.snapTarget = null;
    const hovered = findGuideAtPoint(e.clientX, e.clientY);
    state.hoveredId = hovered?.id ?? null;
  }
}

function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  if (isCalipersElement(e.target as Element)) return;
  const guide = findGuideAtPoint(e.clientX, e.clientY);
  if (guide) {
    state.draggingId = guide.id;
    e.preventDefault();
  }
}

function onMouseUp(): void {
  if (state.draggingId) {
    void saveGuides(state.guides);
    state.draggingId = null;
    state.snapTarget = null;
  }
}

function onContextMenu(e: MouseEvent): void {
  const guide = findGuideAtPoint(e.clientX, e.clientY);
  if (guide) {
    e.preventDefault();
    e.stopPropagation();
    removeGuide(guide);
  }
}

// ─── Interactive render (live crosshair only — placed guides are on persist) ─

function scheduleFrame(): void {
  if (!overlay || !state.interactive) return;
  state.rafId = requestAnimationFrame(() => {
    render();
    scheduleFrame();
  });
}

function render(): void {
  if (!overlay) return;
  const { ctx, labelContainer } = overlay;

  clearCanvas(ctx);

  // Live preview matching placement mode
  if (state.placement === 'both' || state.placement === 'horizontal') {
    drawGuide(ctx, 'horizontal', state.mouseY, false);
  }
  if (state.placement === 'both' || state.placement === 'vertical') {
    drawGuide(ctx, 'vertical', state.mouseX, false);
  }

  if (state.snapTarget !== null && state.draggingId) {
    const guide = state.guides.find((g) => g.id === state.draggingId);
    if (guide) drawGuide(ctx, guide.axis, state.snapTarget, true);
  }

  setLabel(
    labelContainer,
    'crosshair-pos',
    `${Math.round(state.mouseX)}, ${Math.round(state.mouseY)}`,
    state.mouseX + 10,
    state.mouseY - 22,
  );

  drawRulers(ctx, state.mouseX, state.mouseY);
}
