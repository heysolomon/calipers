/**
 * Whether the modes should be reacting to the page right now. They go quiet
 * while the pointer is on Raval' own controls (toolbar, option cards, menus,
 * the inspect panel) and while a screenshot is being taken, so hover tints and
 * preview lines are never left on the page or captured in an image.
 *
 * Things you placed on purpose — guides, pins, annotations, an open selection —
 * are not affected.
 */
import { markActive } from './frame';

let overControls = false;
let capturing = false;

/** Labels sit on the page and are clicked to copy; hovering one is not "being on the controls". */
const PAGE_LABELS = '#raval-labels, #raval-persist-labels';

export function trackPointerTarget(target: Element | null): void {
  const next = !!target?.closest?.('[id^="raval-"]') && !target.closest(PAGE_LABELS);
  if (next === overControls) return;
  overControls = next;
  // Redraw now so the hover state clears (or returns) without waiting for more input.
  markActive();
}

export function setCapturing(value: boolean): void {
  if (capturing === value) return;
  capturing = value;
  markActive();
}

export function hoverSuppressed(): boolean {
  return overControls || capturing;
}
