/**
 * Spacing mode — show gaps between all sibling elements at once.
 * Highlights the hovered element's parent and draws measurement lines
 * between every consecutive sibling pair.
 */
import type { OverlayElements } from '../overlay';
import { clearCanvas, drawRulers, drawMeasurementLine } from '../renderer';
import { getElementAtPoint } from '../detector';
import { isCalipersElement } from '../utils';
import { setLabel, hideLabel, clearLabels } from '../labels';
import { enablePointerEvents, disablePointerEvents } from '../overlay';
import { RULER_SIZE } from '../renderer';

interface SpacingState {
  mouseX: number;
  mouseY: number;
  rafId:  number | null;
  parent: Element | null;
}

const state: SpacingState = {
  mouseX: 0,
  mouseY: 0,
  rafId:  null,
  parent: null,
};

let overlay: OverlayElements | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface SiblingGap {
  axis:   'horizontal' | 'vertical';
  gap:    number;
  x1: number; y1: number;
  x2: number; y2: number;
  lx: number; ly: number;
}

function getVisibleChildren(parent: Element): Element[] {
  return Array.from(parent.children).filter((child) => {
    if (isCalipersElement(child)) return false;
    const style = window.getComputedStyle(child);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = child.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function computeGaps(children: Element[]): SiblingGap[] {
  if (children.length < 2) return [];

  const rects = children.map((c) => c.getBoundingClientRect()) as DOMRect[];
  const gaps: SiblingGap[] = [];

  // Determine predominant layout axis from first pair
  const r0 = rects[0] as DOMRect;
  const r1 = rects[1] as DOMRect;
  const isRow = Math.abs(r1.left - r0.right) < Math.abs(r1.top - r0.bottom);

  for (let i = 0; i < rects.length - 1; i++) {
    const a = rects[i] as DOMRect;
    const b = rects[i + 1] as DOMRect;

    if (isRow) {
      const gap = b.left - a.right;
      if (gap < 0) continue; // overlapping
      const midY = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2 || (a.top + a.bottom) / 2;
      gaps.push({
        axis: 'horizontal',
        gap:  Math.round(gap),
        x1:   a.right, y1: midY,
        x2:   b.left,  y2: midY,
        lx:   (a.right + b.left) / 2,
        ly:   midY - 14,
      });
    } else {
      const gap = b.top - a.bottom;
      if (gap < 0) continue;
      const midX = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2 || (a.left + a.right) / 2;
      gaps.push({
        axis: 'vertical',
        gap:  Math.round(gap),
        x1:   midX, y1: a.bottom,
        x2:   midX, y2: b.top,
        lx:   midX + 8,
        ly:   (a.bottom + b.top) / 2 - 8,
      });
    }
  }

  return gaps;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(): void {
  if (!overlay) return;
  const { ctx, labelContainer } = overlay;
  clearCanvas(ctx);

  const el     = getElementAtPoint(state.mouseX, state.mouseY);
  const parent = el?.parentElement ?? null;

  if (parent !== state.parent) {
    // Clear old sibling labels
    const old = labelContainer.querySelectorAll('[data-calipers-label^="gap-"]');
    old.forEach((n) => n.remove());
    state.parent = parent;
  }

  if (!parent || parent === document.body || parent === document.documentElement) {
    drawRulers(ctx, state.mouseX, state.mouseY);
    return;
  }

  const children = getVisibleChildren(parent);
  if (children.length < 2) {
    drawRulers(ctx, state.mouseX, state.mouseY);
    return;
  }

  const parentRect = parent.getBoundingClientRect();
  const R = RULER_SIZE;

  // Faint parent container highlight
  ctx.save();
  ctx.strokeStyle = 'rgba(255,69,0,0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(
    Math.max(parentRect.left, R),
    Math.max(parentRect.top, R),
    parentRect.width,
    parentRect.height,
  );
  ctx.setLineDash([]);
  ctx.restore();

  // Draw each child highlight (muted)
  for (const child of children) {
    const r = child.getBoundingClientRect();
    ctx.save();
    ctx.fillStyle = 'rgba(255,69,0,0.05)';
    ctx.strokeStyle = 'rgba(255,69,0,0.25)';
    ctx.lineWidth = 1;
    ctx.fillRect(r.left, r.top, r.width, r.height);
    ctx.strokeRect(r.left, r.top, r.width, r.height);
    ctx.restore();
  }

  // Hovered element bright highlight
  if (el) {
    const r = el.getBoundingClientRect();
    ctx.save();
    ctx.fillStyle = 'rgba(255,69,0,0.1)';
    ctx.strokeStyle = 'rgba(255,69,0,0.7)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(r.left, r.top, r.width, r.height);
    ctx.strokeRect(r.left, r.top, r.width, r.height);
    ctx.restore();
  }

  const gaps = computeGaps(children);

  gaps.forEach((g, i) => {
    if (g.gap === 0) return;
    drawMeasurementLine(ctx, g.x1, g.y1, g.x2, g.y2);
    setLabel(labelContainer, `gap-${i}`, `${g.gap}px`, g.lx, g.ly);
  });

  // Hide stale gap labels
  const labelEls = labelContainer.querySelectorAll<HTMLElement>('[data-calipers-label^="gap-"]');
  labelEls.forEach((el) => {
    const idx = Number(el.dataset['calipersLabel']?.replace('gap-', ''));
    if (idx >= gaps.length) el.style.opacity = '0';
  });

  drawRulers(ctx, state.mouseX, state.mouseY);
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onMouseMove(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
}

function scheduleFrame(): void {
  if (!overlay) return;
  state.rafId = requestAnimationFrame(() => { render(); scheduleFrame(); });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initSpacingMode(o: OverlayElements): void {
  overlay = o;
  enablePointerEvents();
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  scheduleFrame();
}

export function destroySpacingMode(): void {
  document.removeEventListener('mousemove', onMouseMove);
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId  = null;
  state.parent = null;

  const o = overlay;
  if (o) clearLabels(o.labelContainer);

  disablePointerEvents();
  overlay = null;
}
