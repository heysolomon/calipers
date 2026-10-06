/**
 * Drag a rectangle on the page, then crop a visible-tab capture to that region.
 */
import { showErrorReport, showToast } from './labels';

let active = false;
let dragging = false;
let startX = 0;
let startY = 0;
let boxEl: HTMLDivElement | null = null;
let shadeEl: HTMLDivElement | null = null;

export function isRegionCaptureActive(): boolean {
  return active;
}

export function startRegionCapture(): void {
  if (active) return;
  active = true;
  dragging = false;

  shadeEl = document.createElement('div');
  shadeEl.id = 'calipers-region-shade';
  Object.assign(shadeEl.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483646',
    cursor: 'crosshair',
    background: 'rgba(0,0,0,0.18)',
    pointerEvents: 'auto',
  });

  boxEl = document.createElement('div');
  boxEl.id = 'calipers-region-box';
  Object.assign(boxEl.style, {
    position: 'fixed',
    border: '1.5px solid #FF4500',
    background: 'rgba(255,69,0,0.08)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.28)',
    pointerEvents: 'none',
    display: 'none',
    zIndex: '2147483646',
  });

  document.documentElement.appendChild(shadeEl);
  document.documentElement.appendChild(boxEl);

  shadeEl.addEventListener('mousedown', onDown, true);
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('mouseup', onUp, true);
  document.addEventListener('keydown', onKey, true);

  showToast('Drag to select a region · Esc to cancel');
}

export function cancelRegionCapture(): void {
  teardown();
}

function teardown(): void {
  active = false;
  dragging = false;
  document.removeEventListener('mousemove', onMove, true);
  document.removeEventListener('mouseup', onUp, true);
  document.removeEventListener('keydown', onKey, true);
  shadeEl?.remove();
  boxEl?.remove();
  shadeEl = null;
  boxEl = null;
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    teardown();
    showToast('Region capture cancelled');
  }
}

function onDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  dragging = true;
  startX = e.clientX;
  startY = e.clientY;
  if (boxEl) {
    boxEl.style.display = 'block';
    boxEl.style.left = `${startX}px`;
    boxEl.style.top = `${startY}px`;
    boxEl.style.width = '0px';
    boxEl.style.height = '0px';
  }
}

function onMove(e: MouseEvent): void {
  if (!dragging || !boxEl) return;
  const x = Math.min(startX, e.clientX);
  const y = Math.min(startY, e.clientY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);
  boxEl.style.left = `${x}px`;
  boxEl.style.top = `${y}px`;
  boxEl.style.width = `${w}px`;
  boxEl.style.height = `${h}px`;
}

async function onUp(e: MouseEvent): Promise<void> {
  if (!dragging || !boxEl) return;
  e.preventDefault();
  e.stopPropagation();
  dragging = false;

  const x = Math.min(startX, e.clientX);
  const y = Math.min(startY, e.clientY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);

  teardown();

  if (w < 8 || h < 8) {
    showToast('Region too small');
    return;
  }

  showToast('Capturing region…');

  const capture = await new Promise<{ ok?: boolean; dataUrl?: string; error?: string }>((resolve) => {
    chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE' }, (r) => {
      const err = chrome.runtime.lastError?.message;
      if (err) resolve({ error: err });
      else resolve((r as { ok?: boolean; dataUrl?: string; error?: string }) ?? {});
    });
  });

  if (capture.error || !capture.dataUrl) {
    showErrorReport('Region capture', capture.error ?? 'no image returned from captureVisibleTab');
    return;
  }

  try {
    const cropped = await cropDataUrl(capture.dataUrl, x, y, w, h);
    const filename = `calipers-region-${Date.now()}.png`;
    const dl = await new Promise<{ ok?: boolean; error?: string }>((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'DOWNLOAD_DATA_URL', dataUrl: cropped, filename },
        (r) => {
          const err = chrome.runtime.lastError?.message;
          if (err) resolve({ error: err });
          else resolve((r as { ok?: boolean; error?: string }) ?? { ok: true });
        },
      );
    });
    if (dl.error) {
      showErrorReport('Region save', dl.error);
      return;
    }
    showToast('Region saved');
  } catch (err) {
    showErrorReport('Region crop', err instanceof Error ? err.message : String(err));
  }
}

function cropDataUrl(
  dataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const dpr = img.naturalWidth / window.innerWidth;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No canvas context'));
        return;
      }
      ctx.drawImage(
        img,
        Math.round(x * dpr),
        Math.round(y * dpr),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load capture'));
    img.src = dataUrl;
  });
}
