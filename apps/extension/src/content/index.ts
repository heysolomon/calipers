/**
 * Content script entry point.
 * Manages the extension lifecycle on the page: overlay creation/teardown,
 * mode switching, message handling, keyboard shortcuts.
 */
import type { Message, Mode, ExtensionState } from '@calipers/shared';
import { DEFAULT_STATE } from '@calipers/shared';
import {
  createOverlay, removeOverlay, getOverlay,
  resizeCanvas, disablePointerEvents,
} from './overlay';
import { clearCanvas, setShowRulers } from './renderer';
import { clearLabels } from './labels';

import { initInspectMode, destroyInspectMode, setShowBoxModel } from './modes/inspect';
import { initMeasureMode, destroyMeasureMode } from './modes/measure';
import {
  initGuidesMode, destroyGuidesMode,
  getGuides, setGuides, clearGuides, setSnapEnabled,
} from './modes/guides';
import { initColorPickerMode, destroyColorPickerMode } from './modes/colorpicker';
import { initSpacingMode, destroySpacingMode } from './modes/spacing';
import { toggleShortcutsPanel, hideShortcutsPanel, isShortcutsPanelOpen } from './shortcuts-panel';
import { toggleTokenPanel, hideTokenPanel, isTokenPanel } from './token-panel';
import { togglePanel, hidePanel, isPanelElement } from './panel';
import { loadSettings, saveSetting } from './storage';
import { initCursor, destroyCursor } from './cursor';
import { isCalipersElement } from './utils';

// ─── Local state ──────────────────────────────────────────────────────────────

let state: ExtensionState = { ...DEFAULT_STATE };
let activeMode: Mode | null = null;

// ─── Global click interceptor ────────────────────────────────────────────────

function onGlobalInterceptClick(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  e.preventDefault();
  e.stopPropagation();
}

// ─── Mode management ──────────────────────────────────────────────────────────

function destroyCurrentMode(): void {
  const o = getOverlay();
  if (o) {
    clearCanvas(o.ctx);
    clearLabels(o.labelContainer);
  }

  switch (activeMode) {
    case 'inspect':     destroyInspectMode();     break;
    case 'measure':     destroyMeasureMode();     break;
    case 'guides':      destroyGuidesMode();      break;
    case 'colorpicker': destroyColorPickerMode(); break;
    case 'spacing':     destroySpacingMode();     break;
  }
  activeMode = null;
  disablePointerEvents();
}

function activateMode(mode: Mode): void {
  destroyCurrentMode();
  const o = getOverlay()!;
  activeMode = mode;

  switch (mode) {
    case 'inspect':     initInspectMode(o, state.showBoxModel);       break;
    case 'measure':     initMeasureMode(o);                           break;
    case 'guides':      void initGuidesMode(o, state.snapToElements); break;
    case 'colorpicker': initColorPickerMode(o);                       break;
    case 'spacing':     initSpacingMode(o);                           break;
  }
}

// ─── Activate / deactivate extension ─────────────────────────────────────────

async function activate(mode: Mode): Promise<void> {
  if (state.active) { switchMode(mode); return; }

  const saved = await loadSettings();
  state.showBoxModel   = saved.showBoxModel;
  state.snapToElements = saved.snapToElements;

  state.active = true;
  state.mode   = mode;

  createOverlay();
  setShowRulers(state.showRulers);
  activateMode(mode);
  initCursor();
  document.addEventListener('click',   onGlobalInterceptClick, true);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
}

function deactivate(): void {
  if (!state.active) return;

  hideShortcutsPanel();
  hideTokenPanel();
  destroyCurrentMode();
  destroyCursor();
  removeOverlay();

  document.removeEventListener('click',   onGlobalInterceptClick, true);
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', onResize);

  state = { ...DEFAULT_STATE }; // active→false; any re-entrant deactivate() no-ops
  hidePanel();                   // close floating panel; its DEACTIVATE msg is then a no-op
}

function switchMode(mode: Mode): void {
  if (!state.active) return;
  state.mode = mode;
  activateMode(mode);
}

// ─── Keyboard handler ─────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent): void {
  const target = e.target as Element;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    (target as HTMLElement).isContentEditable
  ) return;

  // Don't intercept keys while the token panel is focused
  if (isTokenPanel(target)) return;

  switch (e.key) {
    case '1': switchMode('inspect');     break;
    case '2': switchMode('measure');     break;
    case '3': switchMode('guides');      break;
    case '4': switchMode('colorpicker'); break;
    case '5': switchMode('spacing');     break;
    case 'b':
    case 'B':
      state.showBoxModel = !state.showBoxModel;
      setShowBoxModel(state.showBoxModel);
      saveSetting('showBoxModel', state.showBoxModel);
      break;
    case 'r':
    case 'R':
      state.showRulers = !state.showRulers;
      setShowRulers(state.showRulers);
      break;
    case 'd':
    case 'D':
      toggleTokenPanel();
      break;
    case '?':
      toggleShortcutsPanel();
      break;
    case 'Delete':
    case 'Backspace':
      if (activeMode === 'guides') clearGuides();
      break;
    case 'Escape':
      if (isShortcutsPanelOpen()) hideShortcutsPanel();
      else deactivate();
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
      void activate(msg.mode).then(() => sendResponse({ ok: true }));
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
      saveSetting('showBoxModel', msg.enabled);
      sendResponse({ ok: true });
      break;
    case 'TOGGLE_GUIDES':
      state.showGuides = msg.enabled;
      sendResponse({ ok: true });
      break;
    case 'TOGGLE_SNAP':
      state.snapToElements = msg.enabled;
      setSnapEnabled(msg.enabled);
      saveSetting('snapToElements', msg.enabled);
      sendResponse({ ok: true });
      break;
    case 'TOGGLE_RULERS':
      state.showRulers = msg.enabled;
      setShowRulers(msg.enabled);
      sendResponse({ ok: true });
      break;
    case 'SCREENSHOT_READY':
      handleScreenshot(msg.dataUrl);
      sendResponse({ ok: true });
      break;
    case 'GET_STATE':
      sendResponse(state);
      break;
    case 'TOGGLE_PANEL':
      togglePanel();
      sendResponse({ ok: true });
      break;
    default:
      sendResponse({ ok: true });
  }

  return true;
});

// ─── Screenshot export ────────────────────────────────────────────────────────

function handleScreenshot(dataUrl: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `calipers-${Date.now()}.png`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Guides persistence across mode switches ─────────────────────────────────

let _savedGuides = getGuides();

(window as unknown as Record<string, unknown>)['__calipers_save_guides'] = () => {
  _savedGuides = [...getGuides()];
};
(window as unknown as Record<string, unknown>)['__calipers_restore_guides'] = () => {
  setGuides(_savedGuides);
};

void isPanelElement;
