/**
 * Toasts that behave like Sonner (stack, expand on hover, pause while read,
 * swipe away) but look like Calipers: one short line in a small chip.
 * Written without a framework so the content script stays small.
 */
import { UI } from './tokens';

export type ToastType = 'default' | 'success' | 'error';

export interface ToastOptions {
  duration?: number;
  type?:     ToastType;
}

interface ToastItem {
  el:        HTMLDivElement;
  message:   string;
  height:    number;
  width:     number;
  remaining: number;
  startedAt: number;
  timer:     ReturnType<typeof setTimeout> | null;
  mounted:   boolean;
}

const HOST_ID = 'calipers-toaster';
const MAX_WIDTH = 320;
const EDGE = 20;
/** How far older toasts peek out when stacked, and the space between them when expanded. */
const GAP = 8;
const VISIBLE = 3;
const DEFAULT_MS = 2500;
const MOVE_MS = 400;
const SWIPE_OUT_MS = 200;
const EASE = 'ease';
const SWIPE_DISTANCE = 45;
/** px per ms — a quick flick dismisses even when it is short. */
const SWIPE_VELOCITY = 0.11;

const ICONS: Record<Exclude<ToastType, 'default'>, string> = {
  success: `<svg width="14" height="14" viewBox="0 0 20 20" fill="#16a34a" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>`,
  error:   `<svg width="14" height="14" viewBox="0 0 20 20" fill="#dc2626" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>`,
};

/** Newest first. */
const toasts: ToastItem[] = [];
let host: HTMLDivElement | null = null;
let expanded = false;
let swiping = false;

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function moveTransition(): string {
  return reducedMotion()
    ? 'none'
    : `transform ${MOVE_MS}ms ${EASE}, opacity ${MOVE_MS}ms ${EASE}, height ${MOVE_MS}ms ${EASE}, width ${MOVE_MS}ms ${EASE}`;
}

function ensureHost(): HTMLDivElement {
  if (host?.isConnected) return host;

  const el = document.createElement('div');
  el.id = HOST_ID;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.style.cssText = `
    position:fixed;left:50%;bottom:${EDGE}px;z-index:2147483647;
    width:${MAX_WIDTH}px;max-width:calc(100vw - 32px);height:0;
    transform:translateX(-50%);pointer-events:none;
    font-family:${UI.font};-webkit-font-smoothing:antialiased;
  `;
  // Hovering the stack fans it out and holds every timer so nothing disappears mid-read.
  el.addEventListener('mouseenter', () => setExpanded(true));
  el.addEventListener('mouseleave', () => { if (!swiping) setExpanded(false); });
  document.addEventListener('visibilitychange', syncTimers);

  document.documentElement.appendChild(el);
  host = el;
  return el;
}

function setExpanded(value: boolean): void {
  if (expanded === value) return;
  expanded = value;
  layout();
  syncTimers();
}

// ─── Timers ───────────────────────────────────────────────────────────────────

function startTimer(t: ToastItem): void {
  if (t.timer !== null || !Number.isFinite(t.remaining)) return;
  t.startedAt = performance.now();
  t.timer = setTimeout(() => dismiss(t), t.remaining);
}

function pauseTimer(t: ToastItem): void {
  if (t.timer === null) return;
  clearTimeout(t.timer);
  t.timer = null;
  t.remaining = Math.max(0, t.remaining - (performance.now() - t.startedAt));
}

function syncTimers(): void {
  const hold = expanded || swiping || document.hidden;
  for (const t of toasts) {
    if (hold) pauseTimer(t);
    else startTimer(t);
  }
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function layout(): void {
  if (!host) return;
  const front = toasts[0];
  const frontHeight = front?.height ?? 0;
  let stackHeight = 0;

  toasts.forEach((t, i) => {
    if (!t.mounted) return;
    const hidden = i >= VISIBLE;
    const y = expanded ? -stackHeight : -i * GAP;
    const scale = expanded ? 1 : 1 - i * 0.05;

    t.el.style.zIndex = String(toasts.length - i);
    t.el.dataset['rest'] = `translate(-50%, ${y}px) scale(${scale})`;
    t.el.style.transform = t.el.dataset['rest'];
    t.el.style.opacity = hidden ? '0' : '1';
    t.el.style.pointerEvents = hidden ? 'none' : 'auto';
    // Collapsed, older toasts take the front toast's height so the stack reads as one deck.
    t.el.style.height = expanded || i === 0 ? `${t.height}px` : `${frontHeight}px`;
    t.el.style.width = expanded || i === 0 ? `${t.width}px` : `${front?.width ?? t.width}px`;
    const content = t.el.firstElementChild as HTMLElement | null;
    if (content) content.style.opacity = expanded || i === 0 ? '1' : '0';

    if (!hidden) stackHeight += t.height + GAP;
  });

  // The host is the hover target: front toast when collapsed, the whole fan when expanded.
  const collapsed = frontHeight + Math.min(toasts.length - 1, VISIBLE - 1) * GAP;
  host.style.height = `${toasts.length === 0 ? 0 : expanded ? stackHeight - GAP : collapsed}px`;
  host.style.pointerEvents = toasts.length === 0 ? 'none' : 'auto';
}

// ─── Create / dismiss ─────────────────────────────────────────────────────────

function dismiss(t: ToastItem, swipeOut?: { x: number; y: number }): void {
  const idx = toasts.indexOf(t);
  if (idx === -1) return;
  toasts.splice(idx, 1);
  if (t.timer !== null) clearTimeout(t.timer);

  const el = t.el;
  el.style.pointerEvents = 'none';
  el.style.opacity = '0';

  if (swipeOut) {
    // Carry on in the direction it was thrown, one full toast-length further.
    const x = swipeOut.x === 0 ? 0 : swipeOut.x + Math.sign(swipeOut.x) * el.offsetWidth;
    const y = swipeOut.y === 0 ? 0 : swipeOut.y + el.offsetHeight;
    el.style.transition = reducedMotion()
      ? 'none'
      : `transform ${SWIPE_OUT_MS}ms ease-out, opacity ${SWIPE_OUT_MS}ms ease-out`;
    el.style.transform = `${el.dataset['rest'] ?? ''} translate(${x}px, ${y}px)`;
    setTimeout(() => el.remove(), SWIPE_OUT_MS);
  } else if (idx === 0) {
    // The front toast drops back out the way it came in.
    el.style.transform = 'translate(-50%, 100%)';
    setTimeout(() => el.remove(), MOVE_MS);
  } else {
    // One further back just sinks and fades behind the others.
    if (!reducedMotion()) el.style.transition = 'transform 500ms, opacity 200ms';
    el.style.transform = `${el.dataset['rest'] ?? ''} translateY(40%)`;
    setTimeout(() => el.remove(), MOVE_MS);
  }

  if (toasts.length === 0) expanded = false;
  layout();
  syncTimers();
}

function wireSwipe(t: ToastItem): void {
  const el = t.el;
  let start: { x: number; y: number; time: number } | null = null;
  let axis: 'x' | 'y' | null = null;
  let delta = { x: 0, y: 0 };
  let base = '';

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    start = { x: e.clientX, y: e.clientY, time: performance.now() };
    axis = null;
    delta = { x: 0, y: 0 };
    base = el.dataset['rest'] ?? el.style.transform;
    swiping = true;
    syncTimers();
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!axis && Math.hypot(dx, dy) > 2) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (!axis) return;
    // Sideways either way, or down towards the edge it came from. Dragging up
    // into the stack is allowed but resists more the further you pull.
    const dampen = (d: number): number => d * (1 / (1.5 + Math.abs(d) / 20));
    delta = axis === 'x' ? { x: dx, y: 0 } : { x: 0, y: dy > 0 ? dy : dampen(dy) };
    el.style.transition = 'none';
    el.style.transform = `${base} translate(${delta.x}px, ${delta.y}px)`;
  });

  const end = (): void => {
    if (!start) return;
    // Only a throw in an allowed direction counts; an upward pull always springs back.
    const travelled = delta.y < 0 ? 0 : Math.abs(delta.x) + Math.abs(delta.y);
    const velocity = travelled / Math.max(1, performance.now() - start.time);
    start = null;
    swiping = false;
    el.style.transition = moveTransition();

    if (travelled >= SWIPE_DISTANCE || (travelled > 8 && velocity > SWIPE_VELOCITY)) {
      dismiss(t, delta);
    } else {
      layout();
      syncTimers();
    }
    if (host && !host.matches(':hover')) setExpanded(false);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function build(t: ToastItem, opts: ToastOptions): void {
  const el = t.el;
  el.style.cssText = `
    position:absolute;left:50%;bottom:0;box-sizing:border-box;max-width:100%;
    background:${UI.bg};border:1px solid ${UI.border};border-radius:${UI.radiusChip}px;
    box-shadow:${UI.shadowSm};
    color:${UI.textPrimary};font-size:12px;font-weight:500;line-height:1.4;letter-spacing:-0.01em;
    overflow:hidden;touch-action:none;user-select:none;cursor:default;
    transform-origin:center bottom;will-change:transform;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    display:flex;align-items:center;gap:6px;padding:7px 11px;white-space:nowrap;
    transition:${reducedMotion() ? 'none' : `opacity ${MOVE_MS}ms ${EASE}`};
  `;

  const type = opts.type ?? 'default';
  if (type !== 'default') {
    const icon = document.createElement('span');
    icon.style.cssText = 'display:inline-flex;flex-shrink:0;';
    icon.innerHTML = ICONS[type];
    content.appendChild(icon);
  }

  const text = document.createElement('span');
  text.style.cssText = 'min-width:0;overflow:hidden;text-overflow:ellipsis;';
  text.textContent = t.message;
  content.appendChild(text);

  el.appendChild(content);
}

/** Show a toast. A bare number as the second argument is the duration in ms. */
export function showToast(message: string, options: ToastOptions | number = {}): void {
  const opts: ToastOptions = typeof options === 'number' ? { duration: options } : options;
  const duration = opts.duration ?? DEFAULT_MS;

  // Repeating the message already in front (e.g. copying twice) just restarts its clock.
  const front = toasts[0];
  if (front && front.message === message) {
    pauseTimer(front);
    front.remaining = duration;
    syncTimers();
    return;
  }

  const root = ensureHost();
  const t: ToastItem = {
    el: document.createElement('div'),
    message,
    height: 0,
    width: 0,
    remaining: duration,
    startedAt: 0,
    timer: null,
    mounted: false,
  };
  build(t, opts);

  // Start below the edge and invisible, then let layout() bring it in.
  t.el.style.opacity = '0';
  t.el.style.transform = 'translate(-50%, 100%)';
  root.appendChild(t.el);
  // Measure the natural size once, then pin it so width and height can animate in the stack.
  t.height = t.el.offsetHeight;
  // offsetWidth rounds down, which is enough to clip the last letter into an ellipsis.
  t.width = Math.ceil(t.el.getBoundingClientRect().width) + 1;
  t.el.style.width = `${t.width}px`;
  t.el.style.height = `${t.height}px`;
  void t.el.offsetHeight;
  t.el.style.transition = moveTransition();
  wireSwipe(t);

  toasts.unshift(t);
  // Drop anything pushed far out of sight so the list cannot grow without bound.
  for (const stale of toasts.slice(VISIBLE + 2)) dismiss(stale);

  requestAnimationFrame(() => {
    t.mounted = true;
    layout();
    syncTimers();
  });
}
