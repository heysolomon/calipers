/**
 * Shared motion for hover highlights — a spring-driven box that slides and
 * resizes between targets instead of snapping, so every mode moves the same way.
 */
import type { Rect } from '@calipers/shared';
import { markActive } from './frame';

export interface SpringTuning {
  stiffness: number;
  damping:   number;
  mass:      number;
}

/** Live-tunable values. The dev-only DialKit panel mutates this object in place. */
export const tuning = {
  enabled: true,
  /** Near-critically damped: quick, no bounce. */
  hover: { stiffness: 1000, damping: 63, mass: 1 } as SpringTuning,
  /** Seconds for a highlight to fade in when it first appears. */
  fadeIn: 0.12,
  radius: 2,
  fillAlpha: 0.06,
  strokeAlpha: 0.75,
  /** Fill once an element is clicked or pinned — visibly darker than hover. */
  selectedFillAlpha: 0.14,
  /** Seconds for a measurement line to draw from the first element to the second. */
  lineDraw: 0.42,
};

export interface AnimatedBox {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}

type Axis = 'x' | 'y' | 'w' | 'h';
const AXES: Axis[] = ['x', 'y', 'w', 'h'];

const MAX_STEP = 1 / 240;
const REST_DELTA = 0.3;

let reduceMq: MediaQueryList | null = null;
function prefersReducedMotion(): boolean {
  reduceMq ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return reduceMq.matches;
}

export class BoxSpring {
  private cur: Record<Axis, number> | null = null;
  private vel: Record<Axis, number> = { x: 0, y: 0, w: 0, h: 0 };
  private lastTime = 0;
  private age = 0;
  private scrollX = 0;
  private scrollY = 0;

  reset(): void {
    this.cur = null;
    this.vel = { x: 0, y: 0, w: 0, h: 0 };
    this.age = 0;
  }

  /** Advance toward `target` and return the box to draw this frame (null when there is no target). */
  step(target: Rect | null, now = performance.now()): AnimatedBox | null {
    if (!target) {
      this.reset();
      return null;
    }

    const goal: Record<Axis, number> = { x: target.x, y: target.y, w: target.width, h: target.height };
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const animate = tuning.enabled && !prefersReducedMotion();
    // Snap on first appearance, after a long gap (hidden tab), or when motion is off.
    if (!this.cur || !animate || dt > 0.25 || dt <= 0) {
      const appearing = !this.cur;
      this.cur = goal;
      this.vel = { x: 0, y: 0, w: 0, h: 0 };
      this.scrollX = window.scrollX;
      this.scrollY = window.scrollY;
      if (!animate) this.age = Infinity;
      else if (appearing) { this.age = 0; markActive(); }
      return this.output();
    }

    // Keep the box glued to the page while scrolling instead of springing after it.
    this.cur.x -= window.scrollX - this.scrollX;
    this.cur.y -= window.scrollY - this.scrollY;
    this.scrollX = window.scrollX;
    this.scrollY = window.scrollY;

    const { stiffness, damping, mass } = tuning.hover;
    let remaining = dt;
    while (remaining > 0) {
      const h = Math.min(MAX_STEP, remaining);
      remaining -= h;
      for (const a of AXES) {
        const accel = (-stiffness * (this.cur[a] - goal[a]) - damping * this.vel[a]) / mass;
        this.vel[a] += accel * h;
        this.cur[a] += this.vel[a] * h;
      }
    }

    const settled = AXES.every(
      (a) => Math.abs(this.cur![a] - goal[a]) < REST_DELTA && Math.abs(this.vel[a]) < REST_DELTA,
    );
    if (settled) {
      this.cur = goal;
      this.vel = { x: 0, y: 0, w: 0, h: 0 };
    }

    this.age += dt;
    if (!settled || this.age < tuning.fadeIn) markActive();
    return this.output();
  }

  private output(): AnimatedBox {
    const c = this.cur!;
    const t = tuning.fadeIn > 0 ? Math.min(1, this.age / tuning.fadeIn) : 1;
    // ease-out cubic — the highlight is entering
    const opacity = 1 - (1 - t) ** 3;
    return { x: c.x, y: c.y, w: Math.max(0, c.w), h: Math.max(0, c.h), opacity };
  }
}

export function boxToRect(b: AnimatedBox): Rect {
  return {
    x: b.x, y: b.y, width: b.w, height: b.h,
    left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h,
  };
}

/** Convert DialKit's time-based spring (visualDuration + bounce) to physics values. */
export function springFromDuration(visualDuration: number, bounce: number): SpringTuning {
  const root = (2 * Math.PI) / (Math.max(0.01, visualDuration) * 1.2);
  const stiffness = root * root;
  const damping = 2 * Math.min(1, Math.max(0.05, 1 - bounce)) * Math.sqrt(stiffness);
  return { stiffness, damping, mass: 1 };
}
