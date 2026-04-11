/**
 * Content script entry point.
 * Manages the extension lifecycle on the page: overlay creation/teardown,
 * mode switching, message handling, keyboard shortcuts.
 */
import type { Message, Mode, ExtensionState } from '@calipers/shared';
import { DEFAULT_STATE } from '@calipers/shared';
import {
  createOverlay,
  removeOverlay,
  getOverlay,
  resizeCanvas,
  disablePointerEvents,
} from './overlay';
import { clearCanvas } from './renderer';
import { clearLabels } from './labels';

import { initInspectMode, destroyInspectMode, setShowBoxModel } from './modes/inspect';
import { initMeasureMode, destroyMeasureMode } from './modes/measure';
import { initGuidesMode, destroyGuidesMode, getGuides, setGuides, clearGuides } from './modes/guides';
import { toggleShortcutsPanel, hideShortcutsPanel, isShortcutsPanelOpen } from './shortcuts-panel';

// ─── Local state ──────────────────────────────────────────────────────────────

let state: ExtensionState = { ...DEFAULT_STATE };
let activeMode: Mode | null = null;

// ─── Mode management ──────────────────────────────────────────────────────────

function destroyCurrentMode(): void {
  const o = getOverlay();
  if (o) {
    clearCanvas(o.ctx);
    clearLabels(o.labelContainer);
  }

  switch (activeMode) {
    case 'inspect':
      destroyInspectMode();
      break;
    case 'measure':
      destroyMeasureMode();
      break;
    case 'guides':
      destroyGuidesMode();
      break;
  }
  activeMode = null;
  disablePointerEvents();
}

function activateMode(mode: Mode): void {
  destroyCurrentMode();
  const o = getOverlay()!;
  activeMode = mode;

  switch (mode) {
    case 'inspect':
      initInspectMode(o, state.showBoxModel);
      break;
    case 'measure':
      initMeasureMode(o);
      break;
    case 'guides':
      initGuidesMode(o);
      break;
  }
}

// ─── Activate / deactivate extension ─────────────────────────────────────────

function activate(mode: Mode): void {
  if (state.active) {
    // Already active — switch mode only
    switchMode(mode);
    return;
  }

  state.active = true;
  state.mode = mode;

  createOverlay();
  activateMode(mode);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
}

function deactivate(): void {
  if (!state.active) return;

  hideShortcutsPanel();
  destroyCurrentMode();
  removeOverlay();

  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', onResize);

  state = { ...DEFAULT_STATE };
}

function switchMode(mode: Mode): void {
  if (!state.active) return;
  state.mode = mode;
  activateMode(mode);
}

// ─── Keyboard handler ─────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent): void {
  // Don't intercept when user is typing in an input
  const target = e.target as Element;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    (target as HTMLElement).isContentEditable
  ) {
    return;
  }

  switch (e.key) {
    case '1':
      switchMode('inspect');
      break;
    case '2':
      switchMode('measure');
      break;
    case '3':
      switchMode('guides');
      break;
    case 'b':
    case 'B':
      state.showBoxModel = !state.showBoxModel;
      setShowBoxModel(state.showBoxModel);
      break;
    case '?':
      toggleShortcutsPanel();
      break;
    case 'Delete':
    case 'Backspace':
      if (activeMode === 'guides') clearGuides();
      break;
    case 'Escape':
      if (isShortcutsPanelOpen()) {
        hideShortcutsPanel();
      } else {
        deactivate();
      }
      break;
    case 's':
    case 'S':
      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
      break;
  }
}

// ─── Resize handler ───────────────────────────────────────────────────────────

function onResize(): void {
  const o = getOverlay();
  if (o) resizeCanvas(o.canvas);
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((rawMsg: unknown, _sender, sendResponse) => {
  const msg = rawMsg as Message;

  switch (msg.type) {
    case 'ACTIVATE':
      activate(msg.mode);
      sendResponse({ ok: true });
      break;
    case 'DEACTIVATE':
      deactivate();
      sendResponse({ ok: true });
      break;
    case 'SWITCH_MODE':
      switchMode(msg.mode);
      sendResponse({ ok: true });
      break;
    case 'TOGGLE_BOX_MODEL':
      state.showBoxModel = msg.enabled;
      setShowBoxModel(msg.enabled);
      sendResponse({ ok: true });
      break;
    case 'TOGGLE_GUIDES':
      state.showGuides = msg.enabled;
      sendResponse({ ok: true });
      break;
    case 'TOGGLE_SNAP':
      state.snapToElements = msg.enabled;
      sendResponse({ ok: true });
      break;
    case 'SCREENSHOT_READY':
      handleScreenshot(msg.dataUrl);
      sendResponse({ ok: true });
      break;
    case 'GET_STATE':
      sendResponse(state);
      break;
    default:
      sendResponse({ ok: true });
  }

  return true; // keep channel open
});

// ─── Screenshot export ────────────────────────────────────────────────────────

function handleScreenshot(dataUrl: string): void {
  // Create a download link
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `calipers-${Date.now()}.png`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Guard: persist guides across mode switches ───────────────────────────────

// Save guides before destroying guides mode, restore after reinit
const _originalDestroyGuides = destroyGuidesMode;
let _savedGuides = getGuides();

// Patch destroy to save guides
(window as unknown as Record<string, unknown>)['__calipers_save_guides'] = () => {
  _savedGuides = [...getGuides()];
};
(window as unknown as Record<string, unknown>)['__calipers_restore_guides'] = () => {
  setGuides(_savedGuides);
};
void _originalDestroyGuides; // suppress unused warning
