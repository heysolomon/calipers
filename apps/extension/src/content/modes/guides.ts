/**
 * Guides mode — place H / V / both alignment guides.
 * Placed guides live on the persist layer and survive mode switches until cleared.
 */
import type { Guide } from '@raval/shared';
import type { OverlayElements } from '../overlay';
import { clearCanvas, drawGuide, drawRulers, RULER_SIZE } from '../renderer';
import { setLabel, hideLabel, removeLabel, showToast } from '../labels';
import { formatDistance, uid, isRavalElement, toPageX, toPageY, toViewX, toViewY } from '../utils';
import { loadGuides, saveGuides, guidePageKey } from '../storage';
import { addRenderer, markActive } from '../frame';
import { SnapEase } from '../motion';
import { setCursorResolver, refreshCursor } from '../cursor';
import { setSegmented } from '../tokens';
import { onPageChange } from '../page-scope';
import { getPinnedRects } from './measure';
import { getAnnotationSnapRects } from './annotate';
import { hoverSuppressed } from '../pointer';

export type GuidePlacement = 'both' | 'horizontal' | 'vertical';

interface GuidesState {
  guides: Guide[];
  draggingId: string | null;
  hoveredId: string | null;
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
let stopLoop: (() => void) | null = null;
let sessionId = 0;
let knownLabelIds = new Set<string>();

/** Pointer travel before a press on a guide counts as a drag (move) rather than a click (delete). */
const DRAG_THRESHOLD = 4;
let press: { id: string; x: number; y: number; from: number; moved: boolean } | null = null;
/** The click that follows a press on a guide must not also place a new guide. */
let swallowClick = false;
/** Guides placed by the click that is still under the pointer. */
const unarmed = new Set<string>();

// ─── Undo ─────────────────────────────────────────────────────────────────────
// Every change to the guides can be reversed, so trying things is never destructive.

type UndoAction =
  | { kind: 'add'; ids: string[] }
  | { kind: 'delete'; guides: Guide[] }
  | { kind: 'move'; id: string; from: number };

const UNDO_LIMIT = 50;
const undoStack: UndoAction[] = [];

function pushUndo(action: UndoAction): void {
  undoStack.push(action);
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
}

/** Reverse the most recent guide change. Returns false when there is nothing to undo. */
export function undoGuideChange(): boolean {
  const action = undoStack.pop();
  if (!action) return false;
  applyUndo(action);
  return true;
}

function applyUndo(action: UndoAction): void {
  if (action.kind === 'add') {
    const ids = new Set(action.ids);
    const kept = state.guides.filter((g) => !ids.has(g.id));
    state.guides.splice(0, state.guides.length, ...kept);
    removeGuideLabels(action.ids);
    showToast('Guide removed');
  } else if (action.kind === 'delete') {
    state.guides.push(...action.guides);
    showToast(action.guides.length > 1 ? `Restored ${action.guides.length} guides` : 'Guide restored');
  } else {
    const guide = state.guides.find((g) => g.id === action.id);
    if (guide) guide.position = action.from;
    showToast('Guide moved back');
  }

  state.hoveredId = findGuideAtPoint(state.mouseX, state.mouseY)?.id ?? null;
  void persist();
  refreshCursor();
  markActive();
}

/** Deleted guides fade out instead of vanishing. */
const FADE_MS = 160;
const fading: { guide: Guide; t0: number }[] = [];

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

/** The page whose guides are currently in memory. */
let loadedPage: string | null = null;

function persist(): Promise<void> {
  return saveGuides(loadedPage ?? guidePageKey(), state.guides);
}

/** Load this page's saved guides into memory so the persist layer can paint them in any mode. */
export async function hydrateGuides(): Promise<void> {
  const page = guidePageKey();
  loadedPage = page;
  const saved = await loadGuides(page);
  // The page may have changed again while storage was being read.
  if (loadedPage !== page) return;
  state.guides.splice(0, state.guides.length, ...saved);
  markActive();
}

// Single-page apps change route without reloading: swap to the new page's
// guides instead of carrying the old ones over.
onPageChange(() => {
  if (loadedPage === null) return;
  state.guides.splice(0, state.guides.length);
  state.hoveredId = null;
  state.draggingId = null;
  press = null;
  undoStack.length = 0;
  fading.length = 0;
  void hydrateGuides();
});

export async function initGuidesMode(o: OverlayElements, snapEnabled = true): Promise<void> {
  const sid = ++sessionId;
  overlay = o;
  state.snapEnabled = snapEnabled;
  state.draggingId = null;
  state.hoveredId = null;
  state.snapTarget = null;
  state.interactive = true;

  setCursorResolver(() => {
    const dragged = state.draggingId ? state.guides.find((g) => g.id === state.draggingId) : undefined;
    if (dragged && press?.moved) return dragged.axis === 'horizontal' ? 'move-y' : 'move-x';
    return state.hoveredId || state.draggingId ? 'delete' : 'crosshair';
  });
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
  setCursorResolver(null);
  press = null;
  swallowClick = false;
  unarmed.clear();
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('contextmenu', onContextMenu, true);
  document.removeEventListener('keydown', onKeyDown, true);
  stopLoop?.();
  stopLoop = null;
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
  if (state.guides.length > 0) pushUndo({ kind: 'delete', guides: [...state.guides] });
  const ids = state.guides.map((g) => g.id);
  state.guides.splice(0, state.guides.length);
  removeGuideLabels(ids);
  state.hoveredId = null;
  void persist();
}

function removeGuide(guide: Guide): void {
  const idx = state.guides.findIndex((g) => g.id === guide.id);
  if (idx === -1) return;
  state.guides.splice(idx, 1);
  pushUndo({ kind: 'delete', guides: [guide] });
  fading.push({ guide, t0: performance.now() });
  removeGuideLabels([guide.id]);
  if (state.hoveredId === guide.id) state.hoveredId = null;
  if (state.draggingId === guide.id) state.draggingId = null;
  void persist();
  showToast('Guide deleted');
  refreshCursor();
  markActive();
}

/** Delete the guide under the pointer, if any. */
export function deleteHoveredGuide(): boolean {
  const guide = state.guides.find((g) => g.id === state.hoveredId);
  if (!guide) return false;
  removeGuide(guide);
  return true;
}

/** Paint placed guides onto the persist canvas (called every frame while Raval is open). */
export function paintPlacedGuides(
  ctx: CanvasRenderingContext2D,
  labelContainer: HTMLElement,
): void {
  const liveIds = new Set<string>();

  for (const guide of state.guides) {
    const hovered = guide.id === state.hoveredId || guide.id === state.draggingId;
    const viewPos = guideViewPos(guide);
    // A guide being dragged eases onto and off the edges it snaps to. Its stored
    // position is already the snapped one; only what is drawn is smoothed.
    if (guide.id === state.draggingId && press?.moved) {
      const line = dragEase.step(viewPos, state.snapTarget);
      drawGuide(ctx, guide.axis, line.at, Math.max(line.glow, 0.6));
    } else {
      drawGuide(ctx, guide.axis, viewPos, hovered);
    }

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

  const now = performance.now();
  for (let i = fading.length - 1; i >= 0; i--) {
    const { guide, t0 } = fading[i]!;
    const t = (now - t0) / FADE_MS;
    if (t >= 1) { fading.splice(i, 1); continue; }
    ctx.globalAlpha = (1 - t) ** 2;
    drawGuide(ctx, guide.axis, guideViewPos(guide), true);
    ctx.globalAlpha = 1;
    markActive();
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
      if (!isRavalElement(el) && el !== document.documentElement && el !== document.body) {
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
  const root = document.getElementById('raval-overlay-root');
  const canvas = document.getElementById('raval-canvas-overlay');
  const persist = document.getElementById('raval-persist-canvas');
  const panel = document.getElementById('raval-panel');
  const labels = document.getElementById('raval-labels');
  const persistLabels = document.getElementById('raval-persist-labels');
  const annotate = document.getElementById('raval-annotate-root');

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

/**
 * Nearest edge to snap a guide to, within SNAP_THRESHOLD. Looks at the page's
 * elements along the guide and at what has already been marked up: pinned
 * measurements and annotations take part too, so guides line up with them.
 */
function snapPosition(
  axis: 'horizontal' | 'vertical',
  rawPosition: number,
  mouseX: number,
  mouseY: number,
): number {
  let best = rawPosition;
  let minDist = SNAP_THRESHOLD + 1;
  const consider = (edge: number): void => {
    const d = Math.abs(edge - rawPosition);
    if (d <= SNAP_THRESHOLD && d < minDist) {
      minDist = d;
      best = edge;
    }
  };

  const candidates = withPageHitTesting(() =>
    collectSnapCandidates(axis, rawPosition, mouseX, mouseY),
  );
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.width >= window.innerWidth - 2 && r.height >= window.innerHeight - 2) continue;
    if (axis === 'horizontal') { consider(r.top); consider(r.bottom); }
    else { consider(r.left); consider(r.right); }
  }

  for (const r of [...getPinnedRects(), ...getAnnotationSnapRects()]) {
    if (axis === 'horizontal') { consider(r.top); consider(r.bottom); }
    else { consider(r.left); consider(r.right); }
  }

  return best;
}

/** Snap for a guide being dragged; remembers the target so it can be shown. */
function findSnapPosition(
  axis: 'horizontal' | 'vertical',
  rawPosition: number,
  mouseX: number,
  mouseY: number,
): number {
  const best = snapPosition(axis, rawPosition, mouseX, mouseY);
  state.snapTarget = best !== rawPosition ? best : null;
  return best;
}

// ─── Placement preview ────────────────────────────────────────────────────────
// Where a click would put a guide. It snaps as you move, and the click places
// the guide exactly where the preview is drawn — never somewhere else.

interface Preview { x: number; y: number; snappedX: boolean; snappedY: boolean }

let preview: Preview = { x: 0, y: 0, snappedX: false, snappedY: false };

// Snapping is eased, not jumped: one smoother per preview line, one for a guide being dragged.
const previewEaseX = new SnapEase();
const previewEaseY = new SnapEase();
const dragEase = new SnapEase();
let previewKey = '';

function updatePreview(): Preview {
  const { mouseX, mouseY } = state;
  // Snapping hit-tests along the whole line, so only redo it when something moved.
  const key = `${mouseX},${mouseY},${window.scrollX},${window.scrollY},${state.snapEnabled},${state.placement}`;
  if (key === previewKey) return preview;
  previewKey = key;

  let x = mouseX;
  let y = mouseY;
  if (state.snapEnabled) {
    if (state.placement !== 'vertical') y = snapPosition('horizontal', mouseY, mouseX, mouseY);
    if (state.placement !== 'horizontal') x = snapPosition('vertical', mouseX, mouseX, mouseY);
  }
  preview = { x, y, snappedX: x !== mouseX, snappedY: y !== mouseY };
  return preview;
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

function findGuideAtPoint(x: number, y: number, skip?: Set<string>): Guide | null {
  for (const guide of state.guides) {
    if (skip?.has(guide.id)) continue;
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
  setSegmented(document, 'guide-placement', state.placement);
}

function onClick(e: MouseEvent): void {
  if (swallowClick) { swallowClick = false; return; }
  if (isRavalElement(e.target as Element)) return;
  if (state.hoveredId) return;
  if (e.button !== 0) return;

  if (e.clientX < RULER_SIZE || e.clientY < RULER_SIZE) return;

  // Place the guide where the preview is showing it, snap included.
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  const { x, y } = updatePreview();

  const added: Guide[] = [];
  if (state.placement === 'both' || state.placement === 'horizontal') {
    added.push({ id: uid(), axis: 'horizontal', position: toGuidePagePos('horizontal', y) });
  }
  if (state.placement === 'both' || state.placement === 'vertical') {
    added.push({ id: uid(), axis: 'vertical', position: toGuidePagePos('vertical', x) });
  }
  state.guides.push(...added);
  for (const g of added) unarmed.add(g.id);
  pushUndo({ kind: 'add', ids: added.map((g) => g.id) });
  void persist();
}

function onMouseMove(e: MouseEvent): void {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;

  if (state.draggingId) {
    // A press only becomes a move once the pointer has travelled; a still press is a click (delete).
    if (press && !press.moved) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_THRESHOLD) return;
      press.moved = true;
    }
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
    // A guide you just placed is still under the pointer; it only becomes
    // deletable once you have moved off it and come back.
    for (const id of [...unarmed]) {
      const only = new Set(state.guides.filter((g) => g.id !== id).map((g) => g.id));
      if (!findGuideAtPoint(e.clientX, e.clientY, only)) unarmed.delete(id);
    }
    const hovered = findGuideAtPoint(e.clientX, e.clientY, unarmed);
    state.hoveredId = hovered?.id ?? null;
  }
}

function onMouseDown(e: MouseEvent): void {
  swallowClick = false;
  if (e.button !== 0) return;
  if (isRavalElement(e.target as Element)) return;
  const guide = findGuideAtPoint(e.clientX, e.clientY);
  if (guide) {
    state.draggingId = guide.id;
    press = { id: guide.id, x: e.clientX, y: e.clientY, from: guide.position, moved: false };
    e.preventDefault();
  }
}

function onMouseUp(): void {
  if (!state.draggingId) return;
  dragEase.reset();
  const guide = state.guides.find((g) => g.id === state.draggingId);
  const p = press;
  press = null;
  state.draggingId = null;
  state.snapTarget = null;
  swallowClick = true;

  if (guide && p) {
    if (!p.moved) {
      removeGuide(guide);
    } else {
      if (guide.position !== p.from) pushUndo({ kind: 'move', id: guide.id, from: p.from });
      void persist();
    }
  }

  state.hoveredId = findGuideAtPoint(state.mouseX, state.mouseY)?.id ?? null;
  refreshCursor();
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
  stopLoop?.();
  stopLoop = addRenderer(render);
}

function render(): void {
  if (!overlay) return;
  const { ctx, labelContainer } = overlay;

  clearCanvas(ctx);

  const dragged = state.draggingId ? state.guides.find((g) => g.id === state.draggingId) : undefined;
  const moving = Boolean(dragged && press?.moved);
  const overGuide = state.hoveredId !== null || state.draggingId !== null;

  // The placement preview would suggest a click adds a guide — over an existing one it deletes instead.
  // A snapped line is drawn stronger so you can see it has caught an edge.
  // No preview, readout or hint while the pointer is on the controls or a screenshot is being taken.
  const quiet = hoverSuppressed();
  const at = overGuide || quiet ? null : updatePreview();
  if (at) {
    // Each line glides onto an edge it catches and off one it lets go of.
    if (state.placement === 'both' || state.placement === 'horizontal') {
      const line = previewEaseY.step(at.y, at.snappedY ? at.y : null);
      drawGuide(ctx, 'horizontal', line.at, line.glow);
    }
    if (state.placement === 'both' || state.placement === 'vertical') {
      const line = previewEaseX.step(at.x, at.snappedX ? at.x : null);
      drawGuide(ctx, 'vertical', line.at, line.glow);
    }
  } else {
    // Hidden: start fresh next time instead of gliding in from where it last was.
    previewEaseX.reset();
    previewEaseY.reset();
  }

  if (overGuide && !moving && !quiet) {
    setLabel(labelContainer, 'guide-hint', 'Click to delete · Drag to move', state.mouseX + 16, state.mouseY + 18);
  } else {
    hideLabel('guide-hint');
  }

  if (quiet) {
    hideLabel('crosshair-pos');
  } else {
    setLabel(
      labelContainer,
      'crosshair-pos',
      moving && dragged
        ? formatDistance(dragged.position)
        : `${Math.round(at?.x ?? state.mouseX)}, ${Math.round(at?.y ?? state.mouseY)}`,
      state.mouseX + 10,
      state.mouseY - 22,
    );
  }

  drawRulers(ctx, state.mouseX, state.mouseY);
}
