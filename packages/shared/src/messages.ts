/**
 * Strict message protocol for communication between:
 *   Popup ↔ Background ↔ Content script
 */
import type { Mode, MeasurementData } from './types';

export type Message =
  | { type: 'ACTIVATE'; mode: Mode }
  | { type: 'DEACTIVATE' }
  | { type: 'SWITCH_MODE'; mode: Mode }
  | { type: 'TOGGLE_BOX_MODEL'; enabled: boolean }
  | { type: 'TOGGLE_GUIDES'; enabled: boolean }
  | { type: 'TOGGLE_SNAP'; enabled: boolean }
  | { type: 'CAPTURE_SCREENSHOT' }
  | { type: 'SCREENSHOT_READY'; dataUrl: string }
  | { type: 'MEASUREMENT_RESULT'; data: MeasurementData }
  | { type: 'GET_STATE' }
  | { type: 'TOGGLE_PANEL' }
  | { type: 'COPY_MEASUREMENT' };

export type MessageType = Message['type'];

/** Type-safe helper to narrow a message to a specific type */
export function isMessage<T extends MessageType>(
  msg: unknown,
  type: T,
): msg is Extract<Message, { type: T }> {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    (msg as { type: unknown }).type === type
  );
}
