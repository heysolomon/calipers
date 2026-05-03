/**
 * Overlay manager — creates and manages the canvas + DOM label container
 * that sits above the page.
 */

export interface OverlayElements {
  root: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  labelContainer: HTMLDivElement;
}

let overlay: OverlayElements | null = null;

/** Create the overlay if not already present */
export function createOverlay(): OverlayElements {
  if (overlay) return overlay;

  const root = document.createElement('div');
  root.id = 'calipers-overlay-root';
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
    overflow: 'hidden',
  });

  const canvas = document.createElement('canvas');
  canvas.id = 'calipers-canvas-overlay';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });

  const labelContainer = document.createElement('div');
  labelContainer.id = 'calipers-labels';
  Object.assign(labelContainer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
  });

  root.appendChild(canvas);
  root.appendChild(labelContainer);

  // Inject @font-face for Neue Plak Text so all Calipers UI uses the brand font
  if (!document.getElementById('calipers-fonts')) {
    const fontStyle = document.createElement('style');
    fontStyle.id = 'calipers-fonts';
    const fontBase = chrome.runtime.getURL('assets/fonts');
    fontStyle.textContent = `
      @font-face {
        font-family: 'Neue Plak Text';
        src: url('${fontBase}/Neue Plak Text Light.ttf') format('truetype');
        font-weight: 300;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: 'Neue Plak Text';
        src: url('${fontBase}/Neue Plak Regular.ttf') format('truetype');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: 'Neue Plak Text';
        src: url('${fontBase}/Neue Plak Text SemiBold.ttf') format('truetype');
        font-weight: 600;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: 'Neue Plak Text';
        src: url('${fontBase}/Neue Plak Text Bold.ttf') format('truetype');
        font-weight: 700;
        font-style: normal;
        font-display: swap;
      }
    `;
    document.head.appendChild(fontStyle);
  }

  document.documentElement.appendChild(root);

  // Size canvas to match viewport with device pixel ratio
  resizeCanvas(canvas);
  const ctx = canvas.getContext('2d')!;

  overlay = { root, canvas, ctx, labelContainer };
  return overlay;
}

/** Remove the overlay from the DOM */
export function removeOverlay(): void {
  if (overlay) {
    overlay.root.remove();
    overlay = null;
  }
}

/** Get the current overlay, or null */
export function getOverlay(): OverlayElements | null {
  return overlay;
}

/** Resize canvas to match current viewport and DPR */
export function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
}

/** Enable pointer events on the overlay (for measure/guides click capture) */
export function enablePointerEvents(): void {
  if (overlay) {
    overlay.root.style.pointerEvents = 'all';
    overlay.canvas.style.pointerEvents = 'all';
  }
}

/** Disable pointer events (inspect mode — pass through to page) */
export function disablePointerEvents(): void {
  if (overlay) {
    overlay.root.style.pointerEvents = 'none';
    overlay.canvas.style.pointerEvents = 'none';
  }
}
