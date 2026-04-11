/**
 * Element detection — finds and characterises DOM elements under the cursor.
 */
import type { Rect, BoxModel, BoxModelValues } from '@calipers/shared';
import { domRectToRect, parsePx, isCalipersElement } from './utils';

/** Get the deepest non-Calipers element at the given viewport coordinates */
export function getElementAtPoint(x: number, y: number): Element | null {
  // We must disable pointer-events on BOTH the root div and the canvas child.
  // Setting the root alone isn't enough: a child with an explicit inline
  // pointer-events value overrides the parent's `none` in CSS.
  const root = document.getElementById('calipers-overlay-root');
  const canvas = document.getElementById('calipers-canvas-overlay');

  const prevRootPE = root?.style.pointerEvents ?? '';
  const prevCanvasPE = canvas?.style.pointerEvents ?? '';

  if (root) root.style.pointerEvents = 'none';
  if (canvas) canvas.style.pointerEvents = 'none';

  const el = document.elementFromPoint(x, y);

  if (root) root.style.pointerEvents = prevRootPE;
  if (canvas) canvas.style.pointerEvents = prevCanvasPE;

  if (!el || isCalipersElement(el)) return null;
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
