/**
 * The toolbar icon with a small accent dot, shown while Calipers is active on
 * a tab. The browser's badge is always a rounded rectangle, so the dot is drawn
 * into the icon itself instead.
 */

type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export const ICON_SIZES = [16, 32, 48] as const;

/** Draw the dot in the bottom-right corner, with a gap cut around it so it reads on any icon. */
export function drawActiveDot(ctx: Ctx, size: number): void {
  const r = size * 0.19;
  const cx = size - r - size * 0.01;
  const cy = size - r - size * 0.01;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, r + size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#FF4500';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function iconPath(size: number): string {
  return `assets/icons/icon-${size}.png`;
}

let cache: Record<number, ImageData> | null = null;

/** Icon bitmaps with the dot, built once per service worker lifetime. */
export async function activeIconData(): Promise<Record<number, ImageData>> {
  if (cache) return cache;
  const out: Record<number, ImageData> = {};
  for (const size of ICON_SIZES) {
    const res = await fetch(chrome.runtime.getURL(iconPath(size)));
    const bitmap = await createImageBitmap(await res.blob());
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    ctx.drawImage(bitmap, 0, 0, size, size);
    drawActiveDot(ctx, size);
    out[size] = ctx.getImageData(0, 0, size, size);
  }
  cache = out;
  return out;
}
