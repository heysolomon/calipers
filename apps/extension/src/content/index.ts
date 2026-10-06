/**
 * Content script entry point.
 * Manages the extension lifecycle on the page: overlay creation/teardown,
 * mode switching, message handling, keyboard shortcuts.
 *
 * Persistent layers (guides, measurements, annotations) stay visible across
 * mode switches until the user explicitly clears them.
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
  clearGuides, setSnapEnabled, setGuidesVisible, setGuideLabelsVisible, hydrateGuides,
} from './modes/guides';
import { initColorPickerMode, destroyColorPickerMode, cycleColorFormat } from './modes/colorpicker';
import { initSpacingMode, destroySpacingMode } from './modes/spacing';
import { initAnnotateMode, destroyAnnotateMode, clearAnnotations } from './modes/annotate';
import {
  createPersistLayer, startPersistLayer, stopPersistLayer,
  destroyPersistLayer, resizePersistLayer,
} from './persist-layer';
import { startRegionCapture, cancelRegionCapture, isRegionCaptureActive } from './region-capture';
import { toggleShortcutsPanel, hideShortcutsPanel, isShortcutsPanelOpen } from './shortcuts-panel';
import { toggleTokenPanel, hideTokenPanel, isTokenPanel } from './token-panel';
import { togglePanel, hidePanel } from './panel';
import { loadSettings, saveSetting } from './storage';
import { initCursor, destroyCursor } from './cursor';
import { isCalipersElement } from './utils';
import { showErrorReport, showToast } from './labels';

// ─── Local state ──────────────────────────────────────────────────────────────

let state: ExtensionState = { ...DEFAULT_STATE };
let activeMode: Mode | null = null;

// ─── Global click interceptor ────────────────────────────────────────────────

function onGlobalInterceptClick(e: MouseEvent): void {
  if (isCalipersElement(e.target as Element)) return;
  if (isRegionCaptureActive()) return;
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
    case 'annotate':    destroyAnnotateMode();    break;
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
    case 'annotate':    initAnnotateMode(o);                          break;
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

  const o = createOverlay();
  createPersistLayer(o.root);
  setGuidesVisible(state.showGuides);
  setGuideLabelsVisible(state.showGuideLabels);
  await hydrateGuides();
  startPersistLayer();
  setShowRulers(state.showRulers);
  activateMode(mode);
  initCursor();
  document.addEventListener('click',   onGlobalInterceptClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('resize', onResize);
}

function deactivate(): void {
  if (!state.active) return;

  hideShortcutsPanel();
  hideTokenPanel();
  cancelRegionCapture();
  destroyCurrentMode();
  stopPersistLayer();
  destroyPersistLayer();
  destroyCursor();
  removeOverlay();

  document.removeEventListener('click',   onGlobalInterceptClick, true);
  document.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('resize', onResize);

  state = { ...DEFAULT_STATE };
  hidePanel();
}

function switchMode(mode: Mode): void {
  if (!state.active) return;
  state.mode = mode;
  activateMode(mode);
}

// ─── Keyboard handler ─────────────────────────────────────────────────────────

function requestScreenshot(): void {
  chrome.runtime.sendMessage(
    { type: 'CAPTURE_SCREENSHOT' },
    (res: { ok?: boolean; error?: string } | undefined) => {
      const err = chrome.runtime.lastError?.message ?? res?.error;
      if (err) {
        showErrorReport('Screenshot', err);
        return;
      }
      showToast('Screenshot saved');
    },
  );
}

function onKeyDown(e: KeyboardEvent): void {
  const target = e.target as Element;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    (target as HTMLElement).isContentEditable
  ) return;

  if (isTokenPanel(target)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (isRegionCaptureActive()) {
    // Region capture owns Esc; other keys ignored
    return;
  }

  switch (e.key) {
    case '1': e.preventDefault(); switchMode('inspect');     break;
    case '2': e.preventDefault(); switchMode('measure');     break;
    case '3': e.preventDefault(); switchMode('guides');      break;
    case '4': e.preventDefault(); switchMode('colorpicker'); break;
    case '5': e.preventDefault(); switchMode('spacing');     break;
    case '6': e.preventDefault(); switchMode('annotate');    break;
    case 'b':
    case 'B':
      e.preventDefault();
      state.showBoxModel = !state.showBoxModel;
      setShowBoxModel(state.showBoxModel);
      saveSetting('showBoxModel', state.showBoxModel);
      break;
    case 'r':
    case 'R':
      e.preventDefault();
      state.showRulers = !state.showRulers;
      setShowRulers(state.showRulers);
      break;
    case 'd':
    case 'D':
      e.preventDefault();
      toggleTokenPanel();
      break;
    case '?':
      e.preventDefault();
      toggleShortcutsPanel();
      break;
    case 'Delete':
    case 'Backspace':
      if (activeMode === 'guides') {
        e.preventDefault();
        clearGuides();
      } else if (activeMode === 'annotate') {
        e.preventDefault();
        clearAnnotations();
      }
      break;
    case 'Escape':
      e.preventDefault();
      if (isShortcutsPanelOpen()) hideShortcutsPanel();
      else deactivate();
      break;
    case 's':
    case 'S':
      e.preventDefault();
      requestScreenshot();
      break;
    case 'f':
    case 'F':
      if (activeMode === 'colorpicker') {
        e.preventDefault();
        cycleColorFormat();
      }
      break;
  }
}

// ─── Resize handler ───────────────────────────────────────────────────────────

function onResize(): void {
  const o = getOverlay();
  if (o) resizeCanvas(o.canvas);
  resizePersistLayer();
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
      setGuidesVisible(msg.enabled);
      sendResponse({ ok: true });
      break;
    case 'TOGGLE_GUIDE_LABELS':
      state.showGuideLabels = msg.enabled;
      setGuideLabelsVisible(msg.enabled);
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
    case 'TRIGGER_DOWNLOAD': {
      const a = document.createElement('a');
      a.href = msg.dataUrl;
      a.download = msg.filename;
      a.rel = 'noopener';
      (document.body ?? document.documentElement).appendChild(a);
      a.click();
      a.remove();
      sendResponse({ ok: true });
      break;
    }
    case 'SCREENSHOT_READY':
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
