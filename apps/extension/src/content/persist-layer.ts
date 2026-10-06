/**
 * Persistent canvas layer — guides + measurements + annotations stay painted
 * across mode switches until the user explicitly clears them.
 */
import { resizeCanvas } from './overlay';
import { clearCanvas } from './renderer';
import { paintPlacedGuides, isGuidesVisible, getGuides } from './modes/guides';
import { paintPinnedMeasurements } from './modes/measure';
import { paintAnnotations } from './modes/annotate';
import { removeLabel } from './labels';

let persistCanvas: HTMLCanvasElement | null = null;
let persistCtx: CanvasRenderingContext2D | null = null;
let persistLabels: HTMLDivElement | null = null;
let rafId: number | null = null;

export function createPersistLayer(root: HTMLDivElement): void {
  if (persistCanvas) return;

  persistCanvas = document.createElement('canvas');
  persistCanvas.id = 'calipers-persist-canvas';
  Object.assign(persistCanvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });

  persistLabels = document.createElement('div');
  persistLabels.id = 'calipers-persist-labels';
  Object.assign(persistLabels.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
  });

  // Under the mode canvas so ephemeral hover/crosshair paint on top
  root.insertBefore(persistCanvas, root.firstChild);
  root.insertBefore(persistLabels, persistCanvas.nextSibling);

  resizeCanvas(persistCanvas);
  persistCtx = persistCanvas.getContext('2d');
}

export function getPersistLabels(): HTMLDivElement | null {
  return persistLabels;
}

export function startPersistLayer(): void {
  if (rafId !== null) return;
  const tick = (): void => {
    renderPersist();
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

export function stopPersistLayer(): void {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  if (persistCtx) clearCanvas(persistCtx);
}

export function destroyPersistLayer(): void {
  stopPersistLayer();
  persistCanvas?.remove();
  persistLabels?.remove();
  persistCanvas = null;
  persistCtx = null;
  persistLabels = null;
}

export function resizePersistLayer(): void {
  if (persistCanvas) resizeCanvas(persistCanvas);
}

function renderPersist(): void {
  if (!persistCtx || !persistLabels) return;
  clearCanvas(persistCtx);

  const root = persistCanvas?.parentElement;
  if (!root) return;

  if (isGuidesVisible()) {
    paintPlacedGuides(persistCtx, persistLabels);
  } else {
    for (const g of getGuides()) removeLabel(`persist-guide-${g.id}`);
  }

  paintPinnedMeasurements(persistCtx, persistLabels);
  paintAnnotations(persistCtx, root);
}
