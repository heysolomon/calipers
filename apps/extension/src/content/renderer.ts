/**
 * Renderer — draws highlights, dimension lines, measurement labels onto the canvas.
 * All coordinates are in CSS pixels; we apply DPR scaling at the start of each frame.
 */
import type { Rect, BoxModel } from '@calipers/shared';

// ─── Design tokens (mirrors popup / branding) ─────────────────────────────────

const C = {
  primary: '#4A9EFF',
  primaryAlpha08: 'rgba(74, 158, 255, 0.08)',
  primaryAlpha12: 'rgba(74, 158, 255, 0.12)',
  primaryAlpha60: 'rgba(74, 158, 255, 0.6)',
  primaryAlpha80: 'rgba(74, 158, 255, 0.8)',
  primaryAlpha50: 'rgba(74, 158, 255, 0.5)',
  boxContent: 'rgba(74, 158, 255, 0.15)',
  boxPadding: 'rgba(80, 200, 140, 0.15)',
  boxBorder: 'rgba(255, 200, 80, 0.15)',
  boxMargin: 'rgba(255, 130, 80, 0.15)',
  boxContentBorder: 'rgba(74, 158, 255, 0.4)',
  boxPaddingBorder: 'rgba(80, 200, 140, 0.4)',
  boxBorderBorder: 'rgba(255, 200, 80, 0.4)',
  boxMarginBorder: 'rgba(255, 130, 80, 0.4)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scale(ctx: CanvasRenderingContext2D): number {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return dpr;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Clear the entire canvas */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Draw a hovered element highlight */
export function drawElementHighlight(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  locked = false,
  opacity = 1,
): void {
  scale(ctx);
  ctx.globalAlpha = opacity;

  // Fill
  ctx.fillStyle = locked ? C.primaryAlpha12 : C.primaryAlpha08;
  roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = locked ? C.primaryAlpha80 : C.primaryAlpha60;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

/** Draw measurement line between two points with end caps and centered label */
export function drawMeasurementLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  progress = 1,
): void {
  scale(ctx);

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Animate from center outward
  const ax1 = mx + (x1 - mx) * progress;
  const ay1 = my + (y1 - my) * progress;
  const ax2 = mx + (x2 - mx) * progress;
  const ay2 = my + (y2 - my) * progress;

  const isHorizontal = Math.abs(ay2 - ay1) < 2;
  const capSize = 4;

  ctx.strokeStyle = `rgba(74, 158, 255, ${0.8 * progress})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  // Main line
  ctx.beginPath();
  ctx.moveTo(ax1, ay1);
  ctx.lineTo(ax2, ay2);
  ctx.stroke();

  // End caps
  if (isHorizontal) {
    // vertical end caps
    ctx.beginPath();
    ctx.moveTo(ax1, ay1 - capSize);
    ctx.lineTo(ax1, ay1 + capSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax2, ay2 - capSize);
    ctx.lineTo(ax2, ay2 + capSize);
    ctx.stroke();
  } else {
    // horizontal end caps
    ctx.beginPath();
    ctx.moveTo(ax1 - capSize, ay1);
    ctx.lineTo(ax1 + capSize, ay1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax2 - capSize, ay2);
    ctx.lineTo(ax2 + capSize, ay2);
    ctx.stroke();
  }
}

/** Draw dashed alignment guideline extending from an element edge */
export function drawAlignmentGuideline(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  scale(ctx);
  ctx.strokeStyle = 'rgba(74, 158, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Draw a persistent guide line spanning the full viewport */
export function drawGuide(
  ctx: CanvasRenderingContext2D,
  axis: 'horizontal' | 'vertical',
  position: number,
  hovered = false,
): void {
  scale(ctx);
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.strokeStyle = hovered ? C.primaryAlpha80 : C.primaryAlpha50;
  ctx.lineWidth = 1;

  ctx.beginPath();
  if (axis === 'horizontal') {
    ctx.moveTo(0, position);
    ctx.lineTo(w, position);
  } else {
    ctx.moveTo(position, 0);
    ctx.lineTo(position, h);
  }
  ctx.stroke();
}

/** Draw guide handle (draggable circle at edge) */
export function drawGuideHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hovered = false,
): void {
  scale(ctx);
  const r = 5;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = hovered
    ? 'rgba(74, 158, 255, 0.9)'
    : 'rgba(74, 158, 255, 0.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ─── Box model helpers ────────────────────────────────────────────────────────

/** Format a box model value: show "-" for zero, round otherwise */
function fmtPx(v: number): string {
  return v === 0 ? '-' : String(Math.round(v));
}

/**
 * Draw a single dimension value centered in a band on the canvas.
 * Skips rendering if the band is too narrow to fit readable text.
 */
function drawBandLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  bandSize: number,
  textColor: string,
): void {
  if (bandSize < 8) return; // band too thin — skip
  ctx.save();
  ctx.font = '10px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = textColor;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/** Draw a ring using evenodd fill so only the band between outer and inner is colored */
function drawRing(
  ctx: CanvasRenderingContext2D,
  outer: { x: number; y: number; w: number; h: number },
  inner: { x: number; y: number; w: number; h: number },
  values: { top: number; right: number; bottom: number; left: number },
  fillColor: string,
  strokeColor: string,
  _layerName: string,
  textColor: string,
): void {
  // evenodd fill: outer rect (winding) + inner rect (same winding) = only the
  // ring area between them is painted. No overlap with inner layers.
  ctx.save();
  ctx.beginPath();
  ctx.rect(outer.x, outer.y, outer.w, outer.h);
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.fillStyle = fillColor;
  ctx.fill('evenodd');

  // Dashed border on the outer edge only
  ctx.beginPath();
  ctx.rect(outer.x, outer.y, outer.w, outer.h);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Band dimension labels — centered in each of the four band sides
  const topBandH = inner.y - outer.y;
  const bottomBandH = (outer.y + outer.h) - (inner.y + inner.h);
  const leftBandW = inner.x - outer.x;
  const rightBandW = (outer.x + outer.w) - (inner.x + inner.w);

  drawBandLabel(ctx, fmtPx(values.top),
    outer.x + outer.w / 2, outer.y + topBandH / 2, topBandH, textColor);

  drawBandLabel(ctx, fmtPx(values.bottom),
    outer.x + outer.w / 2, inner.y + inner.h + bottomBandH / 2, bottomBandH, textColor);

  drawBandLabel(ctx, fmtPx(values.left),
    outer.x + leftBandW / 2, outer.y + outer.h / 2, leftBandW, textColor);

  drawBandLabel(ctx, fmtPx(values.right),
    inner.x + inner.w + rightBandW / 2, outer.y + outer.h / 2, rightBandW, textColor);
}

/** Draw the box model overlay for an element */
export function drawBoxModel(ctx: CanvasRenderingContext2D, box: BoxModel): void {
  scale(ctx);

  const { content, padding, border, margin } = box;

  // Compute each box rect
  const paddingRect = {
    x: content.left - padding.left,
    y: content.top - padding.top,
    w: content.width + padding.left + padding.right,
    h: content.height + padding.top + padding.bottom,
  };

  const borderRect = {
    x: paddingRect.x - border.left,
    y: paddingRect.y - border.top,
    w: paddingRect.w + border.left + border.right,
    h: paddingRect.h + border.top + border.bottom,
  };

  const marginRect = {
    x: borderRect.x - margin.left,
    y: borderRect.y - margin.top,
    w: borderRect.w + margin.left + margin.right,
    h: borderRect.h + margin.top + margin.bottom,
  };

  // Draw outermost → innermost so inner layers paint over outer fill

  // Margin ring
  drawRing(ctx, marginRect, borderRect, margin,
    C.boxMargin, C.boxMarginBorder, 'margin', 'rgba(255,160,100,0.95)');

  // Border ring
  drawRing(ctx, borderRect, paddingRect, border,
    C.boxBorder, C.boxBorderBorder, 'border', 'rgba(220,190,80,0.95)');

  // Padding ring
  drawRing(ctx, paddingRect, { x: content.left, y: content.top, w: content.width, h: content.height }, padding,
    C.boxPadding, C.boxPaddingBorder, 'padding', 'rgba(80,200,140,0.95)');

  // Content box
  ctx.fillStyle = C.boxContent;
  roundedRect(ctx, content.left, content.top, content.width, content.height, 2);
  ctx.fill();
  ctx.strokeStyle = C.boxContentBorder;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Content dimensions label in the center
  const contentLabel = `${Math.round(content.width)} × ${Math.round(content.height)}`;
  drawBandLabel(
    ctx, contentLabel,
    content.left + content.width / 2,
    content.top + content.height / 2,
    Math.min(content.width, content.height),
    'rgba(100,180,255,0.95)',
  );
}
