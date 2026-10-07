/**
 * Annotate mode — notebook-style UI critique overlays.
 * Pin element measurements, write notes, draw arrows / freehand, export via screenshot.
 * Each annotation stores its own colour from a palette (design-system accent by default).
 */
import type { Rect } from '@calipers/shared';
import type { OverlayElements } from '../overlay';
import { getElementAtPoint, getElementRect } from '../detector';
import { clearCanvas, drawRulers, drawElementHighlight } from '../renderer';
import { isCalipersElement, uid, toPageX, toPageY, toViewX, toViewY } from '../utils';
import { showToast } from '../labels';
import { BoxSpring, boxToRect } from '../motion';
import { setSegmented, setSwatches } from '../tokens';
import { onPageChange, createPageShelf } from '../page-scope';
import { addRenderer, markActive } from '../frame';

export type AnnotateTool = 'measure' | 'note' | 'arrow' | 'pen';

/** Palette — first entry is the design-system primary / accent. */
export const ANNOTATE_COLORS = [
  { id: 'accent',  hex: '#FF4500', label: 'Accent'  },
  { id: 'pink',    hex: '#FF2D85', label: 'Pink'    },
  { id: 'blue',    hex: '#2563EB', label: 'Blue'    },
  { id: 'green',   hex: '#16A34A', label: 'Green'   },
  { id: 'purple',  hex: '#7C3AED', label: 'Purple'  },
  { id: 'amber',   hex: '#D97706', label: 'Amber'   },
  { id: 'black',   hex: '#111111', label: 'Black'   },
  { id: 'white',   hex: '#FFFFFF', label: 'White'   },
] as const;

export type AnnotateColorId = (typeof ANNOTATE_COLORS)[number]['id'];

interface MeasureAnn {
  id: string;
  kind: 'measure';
  el: Element;
  color: string;
}

/** Note / arrow / stroke store document (page) coordinates so they scroll with content. */
interface NoteAnn {
  id: string;
  kind: 'note';
  x: number;
  y: number;
  text: string;
  color: string;
}

interface ArrowAnn {
  id: string;
  kind: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

interface StrokeAnn {
  id: string;
  kind: 'stroke';
  points: { x: number; y: number }[];
  color: string;
}

type Annotation = MeasureAnn | NoteAnn | ArrowAnn | StrokeAnn;

interface AnnotateState {
  tool: AnnotateTool;
  color: string;
  items: Annotation[];
  hoveredRect: Rect | null;
  mouseX: number;
  mouseY: number;
  drawing: boolean;
  interactive: boolean;
  /** Drafts use viewport coords while drawing. */
  draftArrow: { x1: number; y1: number; x2: number; y2: number } | null;
  draftStroke: { x: number; y: number }[];
  /** Draft note stores document coords. */
  noteDraft: { x: number; y: number; el: HTMLTextAreaElement; color: string } | null;
}

const NOTE_FONT = `"Segoe Print", "Bradley Hand", "Comic Sans MS", "Apple Chancery", cursive`;
const DEFAULT_COLOR = ANNOTATE_COLORS[0].hex; // design-system accent

const state: AnnotateState = {
  tool: 'measure',
  color: DEFAULT_COLOR,
  items: [],
  hoveredRect: null,
  mouseX: 0,
  mouseY: 0,
  drawing: false,
  interactive: false,
  draftArrow: null,
  draftStroke: [],
  noteDraft: null,
};

let overlay: OverlayElements | null = null;
let stopLoop: (() => void) | null = null;
const hoverBox = new BoxSpring();
let noteLayer: HTMLDivElement | null = null;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const n = parseInt(full.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function setAnnotateTool(tool: AnnotateTool): void {
  commitNoteDraft();
  state.tool = tool;
  state.drawing = false;
  state.draftArrow = null;
  state.draftStroke = [];
}

export function getAnnotateTool(): AnnotateTool {
  return state.tool;
}

export function setAnnotateColor(hex: string): void {
  state.color = hex;
  if (state.noteDraft) {
    state.noteDraft.color = hex;
    state.noteDraft.el.style.color = hex;
    state.noteDraft.el.style.borderColor = hex;
    state.noteDraft.el.style.boxShadow = `0 8px 24px ${hexToRgba(hex, 0.18)}`;
  }
}

export function getAnnotateColor(): string {
  return state.color;
}

export function clearAnnotations(): void {
  commitNoteDraft(true);
  if (state.items.length > 0) remember();
  state.items = [];
  if (noteLayer) noteLayer.innerHTML = '';
  showToast('Annotations cleared');
}

export function hasAnnotations(): boolean {
  return state.items.length > 0 || state.noteDraft !== null;
}

function ensureNoteLayer(root: HTMLElement): HTMLDivElement {
  if (noteLayer?.isConnected) return noteLayer;
  noteLayer = document.createElement('div');
  noteLayer.id = 'calipers-annotate-notes';
  Object.assign(noteLayer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '2',
  });
  root.appendChild(noteLayer);
  rebuildNoteDom();
  return noteLayer;
}

export function initAnnotateMode(o: OverlayElements): void {
  overlay = o;
  state.tool = 'measure';
  state.drawing = false;
  state.interactive = true;
  state.draftArrow = null;
  state.draftStroke = [];
  state.hoveredRect = null;

  ensureNoteLayer(o.root);

  document.addEventListener('click', onClick, true);
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove, { passive: false });
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('contextmenu', onContextMenu, true);
  scheduleFrame();
}

/** Detach interaction only — annotations stay on the persist layer. */
export function destroyAnnotateMode(): void {
  commitNoteDraft(true);
  state.interactive = false;
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('contextmenu', onContextMenu, true);
  stopLoop?.();
  stopLoop = null;
  overlay = null;
  state.hoveredRect = null;
  state.drawing = false;
  state.draftArrow = null;
  state.draftStroke = [];
}

// ─── Undo and single delete ───────────────────────────────────────────────────

const HISTORY_LIMIT = 50;
const history: Annotation[][] = [];

/** Snapshot the annotations before changing them. */
function remember(): void {
  history.push([...state.items]);
  if (history.length > HISTORY_LIMIT) history.shift();
}

/** Step back one change. Returns false when there is nothing to undo. */
export function undoAnnotation(): boolean {
  const previous = history.pop();
  if (!previous) return false;
  state.items = previous.filter((i) => i.kind !== 'measure' || i.el.isConnected);
  rebuildNoteDom();
  markActive();
  return true;
}

const HIT_SLOP = 8;

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Topmost annotation under a viewport point, if any. */
function annotationAt(x: number, y: number): Annotation | null {
  const px = toPageX(x);
  const py = toPageY(y);
  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i]!;
    if (item.kind === 'arrow') {
      if (distToSegment(px, py, item.x1, item.y1, item.x2, item.y2) <= HIT_SLOP) return item;
    } else if (item.kind === 'stroke') {
      for (let j = 1; j < item.points.length; j++) {
        const a = item.points[j - 1]!;
        const b = item.points[j]!;
        if (distToSegment(px, py, a.x, a.y, b.x, b.y) <= HIT_SLOP) return item;
      }
    } else if (item.kind === 'note') {
      const r = noteLayer?.querySelector(`[data-ann-id="${item.id}"]`)?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return item;
    } else {
      const r = getElementRect(item.el);
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return item;
    }
  }
  return null;
}

/** Right-click removes the one annotation under the pointer. */
function onContextMenu(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  const item = annotationAt(e.clientX, e.clientY);
  if (!item) return;
  e.preventDefault();
  e.stopPropagation();
  remember();
  state.items = state.items.filter((i) => i !== item);
  rebuildNoteDom();
  markActive();
}

// ─── Page scope ───────────────────────────────────────────────────────────────
// Annotations stay with the page they were made on, and come back if you
// return to it during the same visit.

const annotationShelf = createPageShelf<Annotation>();
onPageChange((from, to) => {
  commitNoteDraft(true);
  history.length = 0;
  const leaving = state.items;
  state.items = annotationShelf
    .swap(from, to, leaving)
    .filter((i) => i.kind !== 'measure' || i.el.isConnected);
  state.draftArrow = null;
  state.draftStroke = [];
  state.drawing = false;
  rebuildNoteDom();
});

// ─── Note DOM ─────────────────────────────────────────────────────────────────

function rebuildNoteDom(): void {
  if (!noteLayer) return;
  noteLayer.innerHTML = '';
  for (const item of state.items) {
    if (item.kind !== 'note') continue;
    noteLayer.appendChild(createNoteEl(item));
  }
}

function createNoteEl(note: NoteAnn): HTMLDivElement {
  const el = document.createElement('div');
  el.dataset['annId'] = note.id;
  el.textContent = note.text;
  Object.assign(el.style, {
    position: 'absolute',
    left: `${toViewX(note.x)}px`,
    top: `${toViewY(note.y)}px`,
    color: note.color,
    fontFamily: NOTE_FONT,
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.25',
    maxWidth: '240px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    pointerEvents: 'none',
    textShadow: '0 1px 0 rgba(255,255,255,0.85)',
    transform: 'rotate(-1.5deg)',
  });
  return el;
}

function syncNotePositions(): void {
  if (!noteLayer) return;
  for (const item of state.items) {
    if (item.kind !== 'note') continue;
    const el = noteLayer.querySelector<HTMLElement>(`[data-ann-id="${item.id}"]`);
    if (!el) continue;
    el.style.left = `${toViewX(item.x)}px`;
    el.style.top = `${toViewY(item.y)}px`;
  }
  if (state.noteDraft) {
    state.noteDraft.el.style.left = `${toViewX(state.noteDraft.x)}px`;
    state.noteDraft.el.style.top = `${toViewY(state.noteDraft.y)}px`;
  }
}

function commitNoteDraft(discardEmpty = false): void {
  const draft = state.noteDraft;
  if (!draft) return;
  const text = draft.el.value.trim();
  const color = draft.color;
  const { x, y } = draft;
  draft.el.remove();
  state.noteDraft = null;
  if (!text) {
    if (!discardEmpty) return;
    return;
  }
  remember();
  state.items.push({ id: uid(), kind: 'note', x, y, text, color });
  rebuildNoteDom();
}

function startNoteAt(clientX: number, clientY: number): void {
  commitNoteDraft();
  if (!noteLayer) return;

  const x = toPageX(clientX);
  const y = toPageY(clientY);
  const color = state.color;
  const ta = document.createElement('textarea');
  ta.placeholder = 'Write a note…';
  Object.assign(ta.style, {
    position: 'absolute',
    left: `${clientX}px`,
    top: `${clientY}px`,
    width: '220px',
    minHeight: '48px',
    resize: 'both',
    color,
    fontFamily: NOTE_FONT,
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.25',
    background: 'rgba(255,255,255,0.92)',
    border: `1.5px solid ${color}`,
    borderRadius: '8px',
    padding: '8px 10px',
    outline: 'none',
    pointerEvents: 'all',
    boxShadow: `0 8px 24px ${hexToRgba(color, 0.18)}`,
    zIndex: '5',
  });
  noteLayer.style.pointerEvents = 'none';
  noteLayer.appendChild(ta);
  state.noteDraft = { x, y, el: ta, color };
  ta.style.pointerEvents = 'all';
  requestAnimationFrame(() => ta.focus());

  ta.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitNoteDraft();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      ta.value = '';
      commitNoteDraft(true);
    }
  });
  ta.addEventListener('mousedown', (e) => e.stopPropagation());
  ta.addEventListener('click', (e) => e.stopPropagation());
}

// ─── Events ───────────────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent): void {
  if (state.noteDraft) return;
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

  // Shift+Digit1–8 picks a palette colour (use e.code — Shift+1 is "!" on US keyboards)
  if (e.shiftKey && /^Digit[1-7]$/.test(e.code)) {
    const swatch = ANNOTATE_COLORS[Number(e.code.replace('Digit', '')) - 1];
    if (swatch) {
      e.preventDefault();
      e.stopPropagation();
      setAnnotateColor(swatch.hex);
      syncColorUi();
    }
    return;
  }

  switch (e.key.toLowerCase()) {
    case 'm': setAnnotateTool('measure'); syncToolUi(); break;
    case 'n': setAnnotateTool('note'); syncToolUi(); break;
    case 'a': setAnnotateTool('arrow'); syncToolUi(); break;
    case 'p': setAnnotateTool('pen'); syncToolUi(); break;
  }
}

function syncToolUi(): void {
  setSegmented(document, 'annotate-tool', state.tool);
}

function syncColorUi(): void {
  setSwatches(document, 'annotate-color', state.color);
}

function onClick(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  if (state.tool === 'arrow' || state.tool === 'pen') return;
  if (e.button !== 0) return;

  if (state.tool === 'note') {
    e.preventDefault();
    e.stopPropagation();
    startNoteAt(e.clientX, e.clientY - 8);
    return;
  }

  if (state.tool === 'measure') {
    e.preventDefault();
    e.stopPropagation();
    const el = getElementAtPoint(e.clientX, e.clientY);
    if (!el) return;
    const existing = state.items.findIndex(
      (i) => i.kind === 'measure' && i.el === el,
    );
    if (existing >= 0) {
      remember();
      state.items.splice(existing, 1);
      return;
    }
    remember();
    state.items.push({ id: uid(), kind: 'measure', el, color: state.color });
  }
}

function onMouseDown(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  if (e.button !== 0) return;

  if (state.tool === 'arrow') {
    e.preventDefault();
    state.drawing = true;
    state.draftArrow = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY };
  } else if (state.tool === 'pen') {
    e.preventDefault();
    state.drawing = true;
    state.draftStroke = [{ x: e.clientX, y: e.clientY }];
  }
}

function onMouseMove(e: MouseEvent): void {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;

  if (state.drawing && state.tool === 'arrow' && state.draftArrow) {
    state.draftArrow.x2 = e.clientX;
    state.draftArrow.y2 = e.clientY;
    return;
  }
  if (state.drawing && state.tool === 'pen') {
    state.draftStroke.push({ x: e.clientX, y: e.clientY });
    return;
  }

  if (state.tool === 'measure' && !isCalipersElement(e.target as Element)) {
    const el = getElementAtPoint(e.clientX, e.clientY);
    state.hoveredRect = el ? getElementRect(el) : null;
  } else {
    state.hoveredRect = null;
  }
}

function onMouseUp(e: MouseEvent): void {
  if (!state.drawing) return;
  state.drawing = false;

  if (state.tool === 'arrow' && state.draftArrow) {
    const { x1, y1, x2, y2 } = state.draftArrow;
    if (Math.hypot(x2 - x1, y2 - y1) > 8) {
      remember();
      state.items.push({
        id: uid(),
        kind: 'arrow',
        x1: toPageX(x1),
        y1: toPageY(y1),
        x2: toPageX(x2),
        y2: toPageY(y2),
        color: state.color,
      });
    }
    state.draftArrow = null;
  }

  if (state.tool === 'pen' && state.draftStroke.length > 1) {
    remember();
    state.items.push({
      id: uid(),
      kind: 'stroke',
      points: state.draftStroke.map((p) => ({ x: toPageX(p.x), y: toPageY(p.y) })),
      color: state.color,
    });
    state.draftStroke = [];
  } else {
    state.draftStroke = [];
  }

  void e;
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

function scheduleFrame(): void {
  if (!overlay || !state.interactive) return;
  stopLoop?.();
  stopLoop = addRenderer(renderInteractive);
}

/** Ephemeral hover + drafts while annotate mode is active. */
function renderInteractive(): void {
  if (!overlay) return;
  const { ctx } = overlay;
  clearCanvas(ctx);

  const hover = hoverBox.step(state.tool === 'measure' ? state.hoveredRect : null);
  if (hover) drawMeasure(ctx, boxToRect(hover), state.color, true, hover.opacity);
  if (state.draftArrow) {
    drawArrow(
      ctx,
      state.draftArrow.x1, state.draftArrow.y1,
      state.draftArrow.x2, state.draftArrow.y2,
      state.color,
    );
  }
  if (state.draftStroke.length > 1) {
    drawStroke(ctx, state.draftStroke, state.color);
  }

  drawRulers(ctx, state.mouseX, state.mouseY);
}

/** Paint committed annotations onto the persist canvas (follows scroll). */
export function paintAnnotations(
  ctx: CanvasRenderingContext2D,
  root: HTMLElement,
): void {
  // Drop measure marks whose elements left the DOM
  state.items = state.items.filter((i) => i.kind !== 'measure' || i.el.isConnected);

  ensureNoteLayer(root);
  syncNotePositions();

  for (const item of state.items) {
    if (item.kind === 'measure') {
      drawMeasure(ctx, getElementRect(item.el), item.color, false);
    } else if (item.kind === 'arrow') {
      drawArrow(
        ctx,
        toViewX(item.x1), toViewY(item.y1),
        toViewX(item.x2), toViewY(item.y2),
        item.color,
      );
    } else if (item.kind === 'stroke') {
      drawStroke(
        ctx,
        item.points.map((p) => ({ x: toViewX(p.x), y: toViewY(p.y) })),
        item.color,
      );
    }
  }
}

function drawMeasure(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  color: string,
  preview: boolean,
  opacity = 1,
): void {
  // Same hover → selected treatment as the other modes, in the annotation colour.
  drawElementHighlight(ctx, rect, !preview, opacity, color);

  ctx.save();
  ctx.globalAlpha = opacity;

  const hx = rect.right + 14;
  drawDimLine(ctx, hx, rect.top, hx, rect.bottom, String(Math.round(rect.height)), 'v', color);

  if (rect.width >= 24) {
    const wy = rect.bottom + 14;
    drawDimLine(ctx, rect.left, wy, rect.right, wy, String(Math.round(rect.width)), 'h', color);
  }

  ctx.restore();
}

function drawDimLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  axis: 'h' | 'v',
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = hexToRgba(color, 0.95);
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const cap = 6;
  ctx.beginPath();
  if (axis === 'v') {
    ctx.moveTo(x1 - cap, y1); ctx.lineTo(x1 + cap, y1);
    ctx.moveTo(x2 - cap, y2); ctx.lineTo(x2 + cap, y2);
  } else {
    ctx.moveTo(x1, y1 - cap); ctx.lineTo(x1, y1 + cap);
    ctx.moveTo(x2, y2 - cap); ctx.lineTo(x2, y2 + cap);
  }
  ctx.stroke();

  ctx.font = `600 17px ${NOTE_FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  if (axis === 'v') {
    ctx.save();
    ctx.translate(x1 + 12, (y1 + y2) / 2);
    ctx.rotate(-0.08);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate((x1 + x2) / 2, y1 + 12);
    ctx.rotate(-0.04);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): void {
  ctx.save();
  const stroke = hexToRgba(color, 0.95);
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * Math.min(28, len * 0.18);
  const oy = (dx / len) * Math.min(28, len * 0.18);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx + ox, my + oy, x2, y2);
  ctx.stroke();

  const angle = Math.atan2(y2 - (my + oy), x2 - (mx + ox));
  const head = 10;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - 0.4), y2 - head * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - head * Math.cos(angle + 0.4), y2 - head * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = hexToRgba(color, 0.95);
  ctx.lineWidth = 2.25;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.stroke();
  ctx.restore();
}
