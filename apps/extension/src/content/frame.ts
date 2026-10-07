/**
 * On-demand frame scheduler. Renderers run only while something is happening
 * (pointer, scroll, keys, a running animation) instead of 60 times a second
 * forever, so an idle page costs nothing and input never competes with
 * redundant redraws.
 */

type Render = () => void;

/** How long to keep rendering after continuous input (pointer, scroll). */
const INPUT_MS = 300;
/** Longer window after clicks/keys — their effects often arrive via an async message. */
const ACTION_MS = 1000;
/** Slow repaint while idle so highlights still follow layout shifts the page makes on its own. */
const IDLE_REPAINT_MS = 400;

const renderers = new Set<Render>();
let rafId: number | null = null;
let activeUntil = 0;
let idleTimer: ReturnType<typeof setInterval> | null = null;

function schedule(): void {
  if (rafId === null && renderers.size > 0) rafId = requestAnimationFrame(tick);
}

function tick(): void {
  rafId = null;
  for (const render of [...renderers]) render();
  if (performance.now() < activeUntil) schedule();
}

/** Keep frames coming for at least `ms` more. Animations call this each frame until they settle. */
export function markActive(ms = INPUT_MS): void {
  activeUntil = Math.max(activeUntil, performance.now() + ms);
  schedule();
}

const onInput = (): void => markActive();
const onAction = (): void => markActive(ACTION_MS);

const INPUT_EVENTS = ['pointermove', 'scroll', 'wheel', 'resize'] as const;
const ACTION_EVENTS = ['pointerdown', 'pointerup', 'click', 'keydown'] as const;
const LISTENER_OPTS = { capture: true, passive: true } as const;

function attach(): void {
  for (const type of INPUT_EVENTS) window.addEventListener(type, onInput, LISTENER_OPTS);
  for (const type of ACTION_EVENTS) window.addEventListener(type, onAction, LISTENER_OPTS);
  idleTimer = setInterval(() => { if (!document.hidden) schedule(); }, IDLE_REPAINT_MS);
}

function detach(): void {
  for (const type of INPUT_EVENTS) window.removeEventListener(type, onInput, LISTENER_OPTS);
  for (const type of ACTION_EVENTS) window.removeEventListener(type, onAction, LISTENER_OPTS);
  if (idleTimer !== null) clearInterval(idleTimer);
  idleTimer = null;
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

/** Register a per-frame renderer. Returns a function that removes it. */
export function addRenderer(render: Render): () => void {
  if (renderers.size === 0) attach();
  renderers.add(render);
  markActive();
  return () => {
    renderers.delete(render);
    if (renderers.size === 0) detach();
  };
}
