/**
 * Guides mode — place, drag, and manage alignment guides.
 */
import type { Guide } from '@calipers/shared';
import type { OverlayElements } from '../overlay';
import { clearCanvas, drawGuide, drawGuideHandle } from '../renderer';
import { setLabel } from '../labels';
import { formatDistance, uid } from '../utils';
import { enablePointerEvents } from '../overlay';

interface GuidesState {
  guides: Guide[];
  draggingId: string | null;
  hoveredId: string | null;
  rafId: number | null;
  mouseX: number;
  mouseY: number;
}

const state: GuidesState = {
  guides: [],
  draggingId: null,
  hoveredId: null,
  rafId: null,
  mouseX: 0,
  mouseY: 0,
};

const HANDLE_HIT = 16; // px radius for handle hit area

let overlay: OverlayElements | null = null;

export function initGuidesMode(o: OverlayElements): void {
  overlay = o;
  enablePointerEvents();
  overlay.canvas.style.cursor = 'crosshair';
  overlay.canvas.addEventListener('click', onClick);
  overlay.canvas.addEventListener('mousemove', onMouseMove);
  overlay.canvas.addEventListener('mousedown', onMouseDown);
  overlay.canvas.addEventListener('mouseup', onMouseUp);
  overlay.canvas.addEventListener('contextmenu', onContextMenu);
  scheduleFrame();
}

export function destroyGuidesMode(): void {
  if (overlay) {
    overlay.canvas.style.cursor = '';
    overlay.canvas.removeEventListener('click', onClick);
    overlay.canvas.removeEventListener('mousemove', onMouseMove);
    overlay.canvas.removeEventListener('mousedown', onMouseDown);
    overlay.canvas.removeEventListener('mouseup', onMouseUp);
    overlay.canvas.removeEventListener('contextmenu', onContextMenu);
  }
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;
}

/** Expose guides so they persist across mode switches */
export function getGuides(): Guide[] {
  return state.guides;
}

export function setGuides(guides: Guide[]): void {
  state.guides.splice(0, state.guides.length, ...guides);
}

/** Remove all pinned guides */
export function clearGuides(): void {
  state.guides.splice(0, state.guides.length);
}

function getHandlePosition(guide: Guide): { x: number; y: number } {
  const MARGIN = 16;
  if (guide.axis === 'horizontal') {
    return { x: MARGIN, y: guide.position };
  }
  return { x: guide.position, y: MARGIN };
}

function findGuideAtPoint(x: number, y: number): Guide | null {
  for (const guide of state.guides) {
    const hp = getHandlePosition(guide);
    const dist = Math.hypot(x - hp.x, y - hp.y);
    if (dist <= HANDLE_HIT) return guide;
    // Also check proximity along the guide line
    if (guide.axis === 'horizontal' && Math.abs(y - guide.position) <= 4) return guide;
    if (guide.axis === 'vertical' && Math.abs(x - guide.position) <= 4) return guide;
  }
  return null;
}

function onClick(e: MouseEvent): void {
  // If hovering an existing guide handle, don't create new ones
  if (state.hoveredId) return;

  const { clientX: x, clientY: y } = e;

  // Pin the live crosshair — drop both a horizontal and vertical guide at once
  state.guides.push({ id: uid(), axis: 'horizontal', position: y });
  state.guides.push({ id: uid(), axis: 'vertical', position: x });
}

function onMouseMove(e: MouseEvent): void {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;

  if (state.draggingId) {
    const guide = state.guides.find((g) => g.id === state.draggingId);
    if (guide) {
      guide.position = guide.axis === 'horizontal' ? e.clientY : e.clientX;
    }
  } else {
    const hovered = findGuideAtPoint(e.clientX, e.clientY);
    state.hoveredId = hovered?.id ?? null;
  }
}

function onMouseDown(e: MouseEvent): void {
  const guide = findGuideAtPoint(e.clientX, e.clientY);
  if (guide) {
    state.draggingId = guide.id;
    e.preventDefault();
  }
}

function onMouseUp(): void {
  state.draggingId = null;
}

function onContextMenu(e: MouseEvent): void {
  const guide = findGuideAtPoint(e.clientX, e.clientY);
  if (guide) {
    e.preventDefault();
    state.guides.splice(
      state.guides.findIndex((g) => g.id === guide.id),
      1,
    );
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

  // Live crosshair — always follows the cursor
  drawGuide(ctx, 'horizontal', state.mouseY, false);
  drawGuide(ctx, 'vertical', state.mouseX, false);

  // Cursor position label at the intersection
  setLabel(
    labelContainer,
    'crosshair-pos',
    `${Math.round(state.mouseX)}, ${Math.round(state.mouseY)}`,
    state.mouseX + 10,
    state.mouseY - 22,
  );

  // Persistent placed guides
  for (const guide of state.guides) {
    const hovered = guide.id === state.hoveredId || guide.id === state.draggingId;
    drawGuide(ctx, guide.axis, guide.position, hovered);

    const hp = getHandlePosition(guide);
    drawGuideHandle(ctx, hp.x, hp.y, hovered);

    const posText = formatDistance(guide.position);
    const labelX = guide.axis === 'horizontal' ? hp.x + 12 : hp.x - 12;
    const labelY = guide.axis === 'horizontal' ? hp.y - 12 : hp.y + 12;
    setLabel(labelContainer, `guide-pos-${guide.id}`, posText, labelX, labelY);
  }
}
