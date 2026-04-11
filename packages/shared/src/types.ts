/**
 * Core types shared between the Chrome extension and companion website.
 */

/** Active measurement mode */
export type Mode = 'inspect' | 'measure' | 'guides';

/** Extension activation state */
export interface ExtensionState {
  active: boolean;
  mode: Mode;
  showBoxModel: boolean;
  showGuides: boolean;
  snapToElements: boolean;
}

/** Bounding rectangle (mirrors DOMRect but serialisable) */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Box model spacing values */
export interface BoxModelValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Full box model data for a measured element */
export interface BoxModel {
  content: Rect;
  padding: BoxModelValues;
  border: BoxModelValues;
  margin: BoxModelValues;
}

/** A single measurement result */
export interface MeasurementData {
  /** Width × height of the primary element */
  dimensions?: { width: number; height: number };
  /** Distance between two elements (px) */
  distance?: number;
  /** Direction of the distance measurement */
  distanceDirection?: 'horizontal' | 'vertical';
  /** Box model of the inspected element */
  boxModel?: BoxModel;
  /** Bounds of element A (measure mode) */
  elementA?: Rect;
  /** Bounds of element B (measure mode) */
  elementB?: Rect;
}

/** A draggable guide line */
export interface Guide {
  id: string;
  axis: 'horizontal' | 'vertical';
  /** Position in pixels from top (horizontal) or left (vertical) */
  position: number;
}

/** Keyboard shortcut descriptor */
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  description: string;
  action: string;
}

export const DEFAULT_STATE: ExtensionState = {
  active: false,
  mode: 'inspect',
  showBoxModel: false,
  showGuides: true,
  snapToElements: true,
};

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: '1', description: 'Switch to Inspect mode', action: 'SWITCH_MODE_INSPECT' },
  { key: '2', description: 'Switch to Measure mode', action: 'SWITCH_MODE_MEASURE' },
  { key: '3', description: 'Switch to Guides mode', action: 'SWITCH_MODE_GUIDES' },
  { key: 'b', description: 'Toggle box model overlay', action: 'TOGGLE_BOX_MODEL' },
  { key: 'c', description: 'Copy current measurement', action: 'COPY_MEASUREMENT' },
  { key: 's', description: 'Take screenshot', action: 'CAPTURE_SCREENSHOT' },
  { key: 'Escape', description: 'Deactivate / cancel', action: 'DEACTIVATE' },
];
