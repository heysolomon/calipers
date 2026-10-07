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
import { hoverSuppressed } from '../pointer';
import { setCursorResolver, refreshCursor } from '../cursor';
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

/** Note text sizes offered in the options card. */
export const NOTE_SIZES = [
  { id: '14', label: 'S',  px: 14 },
  { id: '18', label: 'M',  px: 18 },
  { id: '24', label: 'L',  px: 24 },
  { id: '32', label: 'XL', px: 32 },
] as const;
const DEFAULT_NOTE_SIZE = 18;
let noteSize: number = DEFAULT_NOTE_SIZE;
let noteKeysExplained = false;

export function getNoteSize(): number {
  return noteSize;
}

/** Size for new notes; a note being written right now takes it straight away. */
export function setNoteSize(px: number): void {
  noteSize = px;
  if (state.noteDraft) {
    state.noteDraft.size = px;
    state.noteDraft.el.style.fontSize = `${px}px`;
    // Let the field re-fit its height to the new size.
    state.noteDraft.el.dispatchEvent(new Event('input'));
  }
}

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
  /** Font size in px. Older notes without one use the default. */
  size?: number;
}

interface ArrowAnn {
  id: string;
  kind: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** A point the arrow curves through. Absent or null for a straight arrow. */
  bend?: { x: number; y: number } | null;
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
  noteDraft: { x: number; y: number; el: HTMLTextAreaElement; color: string; size: number } | null;
}

const NOTE_FONT = `"Segoe Print", "Bradley Hand", "Comic Sans MS", "Apple Chancery", cursive`;
/** Shared by a saved note and the one being typed, so saving does not shift or restyle the text. */
const NOTE_MAX_WIDTH = 240;
const NOTE_TEXT_SHADOW = '0 1px 0 rgba(255,255,255,0.85)';
const NOTE_TILT = 'rotate(-1.5deg)';
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
  activeArrowId = null;
  arrowDrag = null;
  resetNoteInteraction();
  refreshCursor();
}

export function getAnnotateTool(): AnnotateTool {
  return state.tool;
}

export function setAnnotateColor(hex: string): void {
  state.color = hex;
  if (state.noteDraft) {
    state.noteDraft.color = hex;
    state.noteDraft.el.style.color = hex;
    state.noteDraft.el.style.caretColor = hex;
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

/** Size boxes and arrow ends in viewport space, for guides to snap to. */
export function getAnnotationSnapRects(): Rect[] {
  const point = (px: number, py: number): Rect => {
    const x = toViewX(px);
    const y = toViewY(py);
    return { x, y, width: 0, height: 0, left: x, right: x, top: y, bottom: y };
  };
  const rects: Rect[] = [];
  for (const item of state.items) {
    if (item.kind === 'measure' && item.el.isConnected) rects.push(getElementRect(item.el));
    else if (item.kind === 'arrow') rects.push(point(item.x1, item.y1), point(item.x2, item.y2));
  }
  return rects;
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
  // Writing tools get a pen; an arrow you can grab gets a handle; otherwise the crosshair.
  setCursorResolver(() => {
    if (state.tool === 'note') {
      if (overNoteDelete) return 'delete';
      if (noteDrag || activeNoteId) return 'grab';
      return 'pen';
    }
    if (state.tool === 'pen') return 'pen';
    if (state.tool === 'arrow' && (arrowDrag || activeArrowId)) return 'grab';
    return 'crosshair';
  });
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
  setCursorResolver(null);
  resetNoteInteraction();
  activeArrowId = null;
  arrowDrag = null;
  stopLoop?.();
  stopLoop = null;
  overlay = null;
  state.hoveredRect = null;
  state.drawing = false;
  state.draftArrow = null;
  state.draftStroke = [];
}

// ─── Arrows ───────────────────────────────────────────────────────────────────
// Arrows stay editable after they are drawn, the way they are in Excalidraw:
// drag either end to re-aim, drag the middle to bend, drag the body to move.
// Hold Shift while drawing or re-aiming to lock to 15° steps.

interface Pt { x: number; y: number }
type ArrowPart = 'start' | 'end' | 'bend' | 'body';

const HANDLE_RADIUS = 4.5;
const HANDLE_HIT = 9;
/** A bend this close to the straight line snaps back to straight. */
const STRAIGHTEN_WITHIN = 6;
const ANGLE_STEP = Math.PI / 12;

/** Arrow under the pointer while the arrow tool is active. */
let activeArrowId: string | null = null;
let arrowDrag: { id: string; part: ArrowPart; lastX: number; lastY: number; moved: boolean } | null = null;

const chordMid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Control point of the quadratic curve that passes through `bend` at its midpoint. */
function controlPoint(a: Pt, b: Pt, bend: Pt | null): Pt {
  const m = chordMid(a, b);
  return bend ? { x: 2 * bend.x - m.x, y: 2 * bend.y - m.y } : m;
}

function curvePoint(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/** An arrow's points in viewport space. */
function arrowView(item: ArrowAnn): { a: Pt; b: Pt; bend: Pt | null } {
  return {
    a: { x: toViewX(item.x1), y: toViewY(item.y1) },
    b: { x: toViewX(item.x2), y: toViewY(item.y2) },
    bend: item.bend ? { x: toViewX(item.bend.x), y: toViewY(item.bend.y) } : null,
  };
}

function distToArrow(p: Pt, a: Pt, b: Pt, bend: Pt | null): number {
  if (!bend) return distToSegment(p.x, p.y, a.x, a.y, b.x, b.y);
  const c = controlPoint(a, b, bend);
  let best = Infinity;
  let prev = a;
  for (let i = 1; i <= 20; i++) {
    const next = curvePoint(a, c, b, i / 20);
    best = Math.min(best, distToSegment(p.x, p.y, prev.x, prev.y, next.x, next.y));
    prev = next;
  }
  return best;
}

/** Which part of an arrow a viewport point is on, if any. Handles win over the body. */
function arrowPartAt(item: ArrowAnn, x: number, y: number): ArrowPart | null {
  const { a, b, bend } = arrowView(item);
  const near = (p: Pt): boolean => Math.hypot(p.x - x, p.y - y) <= HANDLE_HIT;
  if (near(b)) return 'end';
  if (near(a)) return 'start';
  if (near(bend ?? chordMid(a, b))) return 'bend';
  return distToArrow({ x, y }, a, b, bend) <= HIT_SLOP ? 'body' : null;
}

function arrowAt(x: number, y: number): { item: ArrowAnn; part: ArrowPart } | null {
  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i]!;
    if (item.kind !== 'arrow') continue;
    const part = arrowPartAt(item, x, y);
    if (part) return { item, part };
  }
  return null;
}

/** Keep the distance, round the direction to the nearest 15°. */
function lockAngle(from: Pt, to: Pt): Pt {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = Math.round(Math.atan2(to.y - from.y, to.x - from.x) / ANGLE_STEP) * ANGLE_STEP;
  return { x: from.x + Math.cos(angle) * len, y: from.y + Math.sin(angle) * len };
}

function dragArrow(e: MouseEvent): void {
  const drag = arrowDrag;
  const item = drag && state.items.find((i): i is ArrowAnn => i.kind === 'arrow' && i.id === drag.id);
  if (!drag || !item) return;

  const dx = e.clientX - drag.lastX;
  const dy = e.clientY - drag.lastY;
  if (dx === 0 && dy === 0) return;
  drag.lastX = e.clientX;
  drag.lastY = e.clientY;
  drag.moved = true;

  const { a, b } = arrowView(item);
  let p: Pt = { x: e.clientX, y: e.clientY };

  if (drag.part === 'body') {
    item.x1 += dx; item.y1 += dy; item.x2 += dx; item.y2 += dy;
    if (item.bend) item.bend = { x: item.bend.x + dx, y: item.bend.y + dy };
  } else if (drag.part === 'bend') {
    const m = chordMid(a, b);
    item.bend = Math.hypot(p.x - m.x, p.y - m.y) <= STRAIGHTEN_WITHIN ? null : { x: toPageX(p.x), y: toPageY(p.y) };
  } else if (drag.part === 'start') {
    if (e.shiftKey && !item.bend) p = lockAngle(b, p);
    item.x1 = toPageX(p.x); item.y1 = toPageY(p.y);
  } else {
    if (e.shiftKey && !item.bend) p = lockAngle(a, p);
    item.x2 = toPageX(p.x); item.y2 = toPageY(p.y);
  }
}

function drawArrowHandles(ctx: CanvasRenderingContext2D, item: ArrowAnn): void {
  const { a, b, bend } = arrowView(item);
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = item.color;
  const dot = (p: Pt, r: number, fill: string): void => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  dot(a, HANDLE_RADIUS, '#fff');
  dot(b, HANDLE_RADIUS, '#fff');
  // The middle handle is filled once the arrow is bent, hollow-looking while it is still straight.
  dot(bend ?? chordMid(a, b), HANDLE_RADIUS - 1, bend ? item.color : '#fff');
  ctx.restore();
}

// ─── Notes ────────────────────────────────────────────────────────────────────
// With the note tool, a note you point at can be dragged to move it, and shows
// a small delete button on its corner.

let activeNoteId: string | null = null;
let overNoteDelete = false;
let noteDrag: { id: string; lastX: number; lastY: number; moved: boolean } | null = null;
/** The click that ends a drag or a delete must not also start a new note. */
let swallowNoteClick = false;

const NOTE_DELETE_R = 8;

function noteRect(id: string): DOMRect | null {
  return noteLayer?.querySelector(`[data-ann-id="${id}"]`)?.getBoundingClientRect() ?? null;
}

/** Centre of the delete button for a note's box: just outside its top-right corner. */
function noteDeleteCentre(r: DOMRect): Pt {
  // Kept on screen when the note runs up to the edge of the window.
  return {
    x: Math.min(r.right + 6, window.innerWidth - NOTE_DELETE_R - 2),
    y: Math.max(r.top - 2, NOTE_DELETE_R + 2),
  };
}

function noteAt(x: number, y: number): NoteAnn | null {
  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i]!;
    if (item.kind !== 'note') continue;
    const r = noteRect(item.id);
    if (r && x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4) return item;
  }
  return null;
}

/** Track which note the pointer is on, and whether it is on that note's delete button. */
function updateNoteHover(x: number, y: number, onUi: boolean): void {
  let id: string | null = null;
  let onDelete = false;
  if (!onUi) {
    // The delete button sits outside the note's box, so check it first to keep the note active.
    const current = activeNoteId ? noteRect(activeNoteId) : null;
    if (current) {
      const c = noteDeleteCentre(current);
      onDelete = Math.hypot(x - c.x, y - c.y) <= NOTE_DELETE_R + 3;
    }
    id = onDelete ? activeNoteId : noteAt(x, y)?.id ?? null;
  }
  if (id !== activeNoteId || onDelete !== overNoteDelete) {
    activeNoteId = id;
    overNoteDelete = onDelete;
    refreshCursor();
  }
}

function drawNoteControls(ctx: CanvasRenderingContext2D, id: string): void {
  const r = noteRect(id);
  if (!r) return;
  ctx.save();
  // Outline the note you would move
  ctx.strokeStyle = 'rgba(255, 69, 0, 0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.roundRect(r.left - 4, r.top - 4, r.width + 8, r.height + 8, 4);
  ctx.stroke();
  ctx.setLineDash([]);

  // Delete button
  const c = noteDeleteCentre(r);
  ctx.beginPath();
  ctx.arc(c.x, c.y, NOTE_DELETE_R, 0, Math.PI * 2);
  ctx.fillStyle = '#FF4500';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(c.x - 2.75, c.y - 2.75); ctx.lineTo(c.x + 2.75, c.y + 2.75);
  ctx.moveTo(c.x + 2.75, c.y - 2.75); ctx.lineTo(c.x - 2.75, c.y + 2.75);
  ctx.stroke();
  ctx.restore();
}

function resetNoteInteraction(): void {
  activeNoteId = null;
  overNoteDelete = false;
  noteDrag = null;
  swallowNoteClick = false;
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
      if (arrowPartAt(item, x, y)) return item;
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
    fontSize: `${note.size ?? DEFAULT_NOTE_SIZE}px`,
    fontWeight: '600',
    lineHeight: '1.25',
    maxWidth: `${NOTE_MAX_WIDTH}px`,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    pointerEvents: 'none',
    textShadow: NOTE_TEXT_SHADOW,
    transform: NOTE_TILT,
    transformOrigin: '0 0',
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
  const { x, y, size } = draft;
  draft.el.remove();
  state.noteDraft = null;
  if (!text) {
    if (!discardEmpty) return;
    return;
  }
  remember();
  state.items.push({ id: uid(), kind: 'note', x, y, text, color, size });
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
  ta.rows = 1;
  ta.spellcheck = false;
  // No box: the note is written straight onto the page and looks, while it is
  // being typed, exactly as it will once saved.
  Object.assign(ta.style, {
    position: 'absolute',
    left: `${clientX}px`,
    top: `${clientY}px`,
    width: `${NOTE_MAX_WIDTH}px`,
    margin: '0',
    padding: '0',
    resize: 'none',
    overflow: 'hidden',
    color,
    caretColor: color,
    fontFamily: NOTE_FONT,
    fontSize: `${noteSize}px`,
    fontWeight: '600',
    lineHeight: '1.25',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    background: 'transparent',
    border: 'none',
    borderRadius: '0',
    outline: 'none',
    boxShadow: 'none',
    textShadow: NOTE_TEXT_SHADOW,
    transform: NOTE_TILT,
    transformOrigin: '0 0',
    pointerEvents: 'all',
    zIndex: '5',
  });
  // Grows with the text instead of scrolling inside a fixed box.
  const fit = (): void => {
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };
  ta.addEventListener('input', fit);
  noteLayer.style.pointerEvents = 'none';
  noteLayer.appendChild(ta);
  state.noteDraft = { x, y, el: ta, color, size: noteSize };
  // Said once: how to finish or abandon a note from the keyboard.
  if (!noteKeysExplained) {
    noteKeysExplained = true;
    showToast('Enter to save · Esc to cancel', 3500);
  }
  ta.style.pointerEvents = 'all';
  requestAnimationFrame(() => { fit(); ta.focus(); });

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
  const sizeRow = document.querySelector<HTMLElement>('[data-note-size-row]');
  if (sizeRow) sizeRow.style.display = state.tool === 'note' ? 'block' : 'none';
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
    // The end of a move or delete, or a click on an existing note, is not a request for a new one.
    if (swallowNoteClick) { swallowNoteClick = false; return; }
    if (noteAt(e.clientX, e.clientY)) return;
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
  swallowNoteClick = false;
  if (isCalipersElement(e.target as Element)) return;
  if (e.button !== 0) return;

  if (state.tool === 'note' && activeNoteId && !state.noteDraft) {
    e.preventDefault();
    swallowNoteClick = true;
    remember();
    if (overNoteDelete) {
      state.items = state.items.filter((i) => i.id !== activeNoteId);
      rebuildNoteDom();
      activeNoteId = null;
      overNoteDelete = false;
      refreshCursor();
      markActive();
    } else {
      noteDrag = { id: activeNoteId, lastX: e.clientX, lastY: e.clientY, moved: false };
    }
    return;
  }

  if (state.tool === 'arrow') {
    e.preventDefault();
    // On an existing arrow: grab it. Anywhere else: start a new one.
    const hit = arrowAt(e.clientX, e.clientY);
    if (hit) {
      remember();
      arrowDrag = { id: hit.item.id, part: hit.part, lastX: e.clientX, lastY: e.clientY, moved: false };
      activeArrowId = hit.item.id;
      return;
    }
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

  if (arrowDrag) {
    dragArrow(e);
    return;
  }
  if (noteDrag) {
    const drag = noteDrag;
    const note = state.items.find((i): i is NoteAnn => i.kind === 'note' && i.id === drag.id);
    if (note && (e.clientX !== drag.lastX || e.clientY !== drag.lastY)) {
      note.x += e.clientX - drag.lastX;
      note.y += e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.moved = true;
    }
    return;
  }
  if (state.tool === 'note' && !state.noteDraft) {
    updateNoteHover(e.clientX, e.clientY, isCalipersElement(e.target as Element));
  }
  if (state.drawing && state.tool === 'arrow' && state.draftArrow) {
    const from = { x: state.draftArrow.x1, y: state.draftArrow.y1 };
    const to = e.shiftKey ? lockAngle(from, { x: e.clientX, y: e.clientY }) : { x: e.clientX, y: e.clientY };
    state.draftArrow.x2 = to.x;
    state.draftArrow.y2 = to.y;
    return;
  }
  if (state.tool === 'arrow') {
    const over = isCalipersElement(e.target as Element) ? null : arrowAt(e.clientX, e.clientY);
    const id = over?.item.id ?? null;
    if (id !== activeArrowId) {
      activeArrowId = id;
      refreshCursor();
    }
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
  if (arrowDrag) {
    // A press that never moved changed nothing, so it should not cost an undo step.
    if (!arrowDrag.moved) history.pop();
    arrowDrag = null;
    return;
  }
  if (noteDrag) {
    if (!noteDrag.moved) history.pop();
    noteDrag = null;
    return;
  }
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

  const hover = hoverBox.step(state.tool === 'measure' && !hoverSuppressed() ? state.hoveredRect : null);
  if (hover) drawMeasure(ctx, boxToRect(hover), state.color, true, hover.opacity);
  if (state.draftArrow) {
    drawArrow(
      ctx,
      { x: state.draftArrow.x1, y: state.draftArrow.y1 },
      { x: state.draftArrow.x2, y: state.draftArrow.y2 },
      null,
      state.color,
    );
  }
  // Outline and delete button for the note you are on or dragging
  const shownNote = noteDrag?.id ?? activeNoteId;
  if (state.tool === 'note' && shownNote && !hoverSuppressed()) drawNoteControls(ctx, shownNote);

  // Handles for the arrow you are on or dragging
  const shownId = arrowDrag?.id ?? activeArrowId;
  if (state.tool === 'arrow' && shownId && !hoverSuppressed()) {
    const shown = state.items.find((i): i is ArrowAnn => i.kind === 'arrow' && i.id === shownId);
    if (shown) drawArrowHandles(ctx, shown);
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
      const { a, b, bend } = arrowView(item);
      drawArrow(ctx, a, b, bend, item.color);
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
  a: Pt,
  b: Pt,
  bend: Pt | null,
  color: string,
): void {
  ctx.save();
  const stroke = hexToRgba(color, 0.95);
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Straight unless it has been bent; a bent arrow curves through its bend point.
  const c = controlPoint(a, b, bend);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  if (bend) ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
  else ctx.lineTo(b.x, b.y);
  ctx.stroke();

  // The head follows the direction the line arrives from.
  const from = bend ? c : a;
  const angle = Math.atan2(b.y - from.y, b.x - from.x);
  const head = 10;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - head * Math.cos(angle - 0.4), b.y - head * Math.sin(angle - 0.4));
  ctx.lineTo(b.x - head * Math.cos(angle + 0.4), b.y - head * Math.sin(angle + 0.4));
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
