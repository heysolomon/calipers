/**
 * Element detection — finds and characterises DOM elements under the cursor.
 */
import type { Rect, BoxModel, BoxModelValues } from '@raval/shared';
import { domRectToRect, parsePx, isRavalElement } from './utils';

const HIT_MEMO_MS = 100;
let memo: { x: number; y: number; sx: number; sy: number; t: number; el: Element | null } | null = null;

/** Get the deepest non-Raval element at the given viewport coordinates */
export function getElementAtPoint(x: number, y: number): Element | null {
  // Pointer rarely moves between consecutive frames — reuse the last answer briefly.
  const now = performance.now();
  if (
    memo && memo.x === x && memo.y === y &&
    memo.sx === window.scrollX && memo.sy === window.scrollY &&
    now - memo.t < HIT_MEMO_MS && (memo.el === null || memo.el.isConnected)
  ) {
    return memo.el;
  }

  // The overlay is normally click-through already. Only toggle pointer-events
  // (a style write that forces a recalc) in the rare case the canvas is interactive.
  const canvas = document.getElementById('raval-canvas-overlay');
  const prev = canvas?.style.pointerEvents ?? '';
  const mustToggle = canvas !== null && prev !== 'none';
  if (mustToggle) canvas.style.pointerEvents = 'none';

  const hit = document.elementFromPoint(x, y);

  if (mustToggle) canvas.style.pointerEvents = prev;

  const el = !hit || isRavalElement(hit) ? null : hit;
  memo = { x, y, sx: window.scrollX, sy: window.scrollY, t: now, el };
  return el;
}

/** Get the viewport-relative bounding rect of an element */
export function getElementRect(el: Element): Rect {
  return domRectToRect(el.getBoundingClientRect());
}

/** Parse computed box model values for an element */
export function getBoxModel(el: Element): BoxModel {
  const style = window.getComputedStyle(el);
  const contentRect = el.getBoundingClientRect();

  const padding: BoxModelValues = {
    top: parsePx(style.paddingTop),
    right: parsePx(style.paddingRight),
    bottom: parsePx(style.paddingBottom),
    left: parsePx(style.paddingLeft),
  };

  const border: BoxModelValues = {
    top: parsePx(style.borderTopWidth),
    right: parsePx(style.borderRightWidth),
    bottom: parsePx(style.borderBottomWidth),
    left: parsePx(style.borderLeftWidth),
  };

  const margin: BoxModelValues = {
    top: parsePx(style.marginTop),
    right: parsePx(style.marginRight),
    bottom: parsePx(style.marginBottom),
    left: parsePx(style.marginLeft),
  };

  // Content box is the full bounding rect (includes padding + border)
  const content: Rect = domRectToRect(contentRect);

  return { content, padding, border, margin };
}
