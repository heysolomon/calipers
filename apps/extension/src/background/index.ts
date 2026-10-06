/**
 * Background service worker
 * Handles: keyboard shortcuts, message routing, tab state management
 */
import type { Message, ExtensionState, Mode } from '@calipers/shared';
import { DEFAULT_STATE } from '@calipers/shared';

// Per-tab state
const tabState = new Map<number, ExtensionState>();

function getTabState(tabId: number): ExtensionState {
  return tabState.get(tabId) ?? { ...DEFAULT_STATE };
}

function setTabState(tabId: number, patch: Partial<ExtensionState>): ExtensionState {
  const current = getTabState(tabId);
  const next = { ...current, ...patch };
  tabState.set(tabId, next);
  return next;
}

/** Forward a message to the content script in the given tab */
async function sendToContent(tabId: number, message: Message): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script may not be injected yet — silently ignore
  }
}

/** Update the extension icon badge to reflect active state */
function updateBadge(tabId: number, active: boolean): void {
  chrome.action.setBadgeText({ tabId, text: active ? '●' : '' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: active ? '#FF4500' : '#888888' });
}

// ─── Keyboard command handler ─────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'toggle-calipers' || !tab?.id) return;

  const tabId = tab.id;
  const state = getTabState(tabId);
  const newActive = !state.active;
  const next = setTabState(tabId, { active: newActive });

  updateBadge(tabId, newActive);

  const msg: Message = newActive
    ? { type: 'ACTIVATE', mode: next.mode }
    : { type: 'DEACTIVATE' };

  await sendToContent(tabId, msg);
});

// ─── Extension icon click handler (no popup) ─────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  await sendToContent(tab.id, { type: 'TOGGLE_PANEL' });
});

// ─── Message handler (popup → background → content) ──────────────────────────
chrome.runtime.onMessage.addListener((rawMsg: unknown, sender, sendResponse) => {
  const msg = rawMsg as Message;
  const tabId = sender.tab?.id;

  // Handle messages from popup (no sender.tab)
  if (!tabId) {
    handlePopupMessage(msg, sendResponse);
    return true; // keep channel open for async response
  }

  // Messages from content scripts
  handleContentMessage(msg, tabId, sendResponse);
  return true;
});

async function handlePopupMessage(
  msg: Message,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    sendResponse({ error: 'No active tab' });
    return;
  }
  const tabId = tab.id;

  switch (msg.type) {
    case 'GET_STATE': {
      sendResponse(getTabState(tabId));
      break;
    }
    case 'ACTIVATE': {
      const next = setTabState(tabId, { active: true, mode: msg.mode });
      updateBadge(tabId, true);
      await sendToContent(tabId, { type: 'ACTIVATE', mode: next.mode });
      sendResponse(next);
      break;
    }
    case 'DEACTIVATE': {
      const next = setTabState(tabId, { active: false });
      updateBadge(tabId, false);
      await sendToContent(tabId, { type: 'DEACTIVATE' });
      sendResponse(next);
      break;
    }
    case 'SWITCH_MODE': {
      const next = setTabState(tabId, { mode: msg.mode as Mode });
      await sendToContent(tabId, { type: 'SWITCH_MODE', mode: msg.mode as Mode });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_BOX_MODEL': {
      const next = setTabState(tabId, { showBoxModel: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_BOX_MODEL', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_GUIDES': {
      const next = setTabState(tabId, { showGuides: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_GUIDES', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_GUIDE_LABELS': {
      const next = setTabState(tabId, { showGuideLabels: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_GUIDE_LABELS', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_SNAP': {
      const next = setTabState(tabId, { snapToElements: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_SNAP', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_RULERS': {
      const next = setTabState(tabId, { showRulers: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_RULERS', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'CAPTURE_SCREENSHOT': {
      sendResponse(await captureAndDownload(tabId));
      break;
    }
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

function captureVisible(windowId: number, opts: chrome.tabs.CaptureVisibleTabOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, opts, (url) => {
      if (chrome.runtime.lastError || !url) {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Capture failed'));
        return;
      }
      resolve(url);
    });
  });
}

function downloadsAvailable(): boolean {
  return typeof chrome.downloads?.download === 'function';
}

function downloadUrl(url: string, filename: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!downloadsAvailable()) {
      reject(new Error('chrome.downloads is unavailable (missing "downloads" permission)'));
      return;
    }
    chrome.downloads.download({ url, filename, saveAs: false }, (id) => {
      if (chrome.runtime.lastError || id === undefined) {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Download failed'));
        return;
      }
      resolve(id);
    });
  });
}

/** Prefer chrome.downloads; fall back to a content-script <a download> click. */
async function saveDataUrl(tabId: number, dataUrl: string, filename: string): Promise<void> {
  if (downloadsAvailable()) {
    try {
      await downloadUrl(dataUrl, filename);
      return;
    } catch (err) {
      console.warn('[Calipers] downloads API failed, falling back to content download', err);
    }
  } else {
    console.warn('[Calipers] chrome.downloads missing; using content-script download fallback');
  }
  // Do not use sendToContent here — it swallows errors and would hide save failures.
  await chrome.tabs.sendMessage(tabId, {
    type: 'TRIGGER_DOWNLOAD',
    dataUrl,
    filename,
  } satisfies Message);
}

/**
 * Capture the visible tab and save via the downloads API.
 * Retina PNGs can exceed Chrome's data-URL download limit — fall back to JPEG.
 */
async function captureAndDownload(tabId: number): Promise<{ ok: true; filename: string } | { error: string }> {
  let stage = 'getTab';
  try {
    const tab = await chrome.tabs.get(tabId);
    const windowId = tab.windowId;

    stage = 'captureVisibleTab(png)';
    let dataUrl = await captureVisible(windowId, { format: 'png' });
    let filename = `calipers-${Date.now()}.png`;

    // ~1.5MB string limit is a common failure point for chrome.downloads + data: URLs
    if (dataUrl.length > 1_500_000) {
      stage = 'captureVisibleTab(jpeg-fallback-size)';
      dataUrl = await captureVisible(windowId, { format: 'jpeg', quality: 92 });
      filename = `calipers-${Date.now()}.jpg`;
    }

    try {
      stage = `save(${filename}, ${Math.round(dataUrl.length / 1024)}KB)`;
      await saveDataUrl(tabId, dataUrl, filename);
    } catch (downloadErr) {
      // Last resort: smaller JPEG if PNG download failed for any reason
      if (filename.endsWith('.png')) {
        stage = 'captureVisibleTab(jpeg-fallback-download)';
        dataUrl = await captureVisible(windowId, { format: 'jpeg', quality: 88 });
        filename = `calipers-${Date.now()}.jpg`;
        stage = `save(${filename}, ${Math.round(dataUrl.length / 1024)}KB)`;
        await saveDataUrl(tabId, dataUrl, filename);
      } else {
        throw downloadErr;
      }
    }

    stage = 'notifyContent';
    await sendToContent(tabId, { type: 'SCREENSHOT_READY', dataUrl });
    return { ok: true, filename };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const error = `[${stage}] ${message}`;
    console.error('[Calipers] CAPTURE_SCREENSHOT failed:', error, err);
    return { error };
  }
}

async function handleContentMessage(
  msg: Message,
  tabId: number,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  switch (msg.type) {
    case 'GET_STATE': {
      sendResponse(getTabState(tabId));
      break;
    }
    case 'ACTIVATE': {
      const next = setTabState(tabId, { active: true, mode: msg.mode });
      updateBadge(tabId, true);
      await sendToContent(tabId, { type: 'ACTIVATE', mode: next.mode });
      sendResponse(next);
      break;
    }
    case 'DEACTIVATE': {
      const next = setTabState(tabId, { active: false });
      updateBadge(tabId, false);
      await sendToContent(tabId, { type: 'DEACTIVATE' });
      sendResponse(next);
      break;
    }
    case 'SWITCH_MODE': {
      const next = setTabState(tabId, { mode: msg.mode as Mode });
      await sendToContent(tabId, { type: 'SWITCH_MODE', mode: msg.mode as Mode });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_BOX_MODEL': {
      const next = setTabState(tabId, { showBoxModel: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_BOX_MODEL', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_GUIDES': {
      const next = setTabState(tabId, { showGuides: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_GUIDES', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_GUIDE_LABELS': {
      const next = setTabState(tabId, { showGuideLabels: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_GUIDE_LABELS', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_SNAP': {
      const next = setTabState(tabId, { snapToElements: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_SNAP', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'TOGGLE_RULERS': {
      const next = setTabState(tabId, { showRulers: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_RULERS', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'CAPTURE_SCREENSHOT': {
      sendResponse(await captureAndDownload(tabId));
      break;
    }
    case 'CAPTURE_VISIBLE': {
      sendResponse(await captureVisibleOnly(tabId));
      break;
    }
    case 'DOWNLOAD_DATA_URL': {
      try {
        await saveDataUrl(tabId, msg.dataUrl, msg.filename);
        sendResponse({ ok: true, filename: msg.filename });
      } catch (err) {
        sendResponse({ error: err instanceof Error ? err.message : String(err) });
      }
      break;
    }
    case 'MEASUREMENT_RESULT': {
      sendResponse({ ok: true });
      break;
    }
    default:
      sendResponse({ ok: true });
  }
}

async function captureVisibleOnly(
  tabId: number,
): Promise<{ ok: true; dataUrl: string } | { error: string }> {
  try {
    const tab = await chrome.tabs.get(tabId);
    const dataUrl = await captureVisible(tab.windowId, { format: 'png' });
    return { ok: true, dataUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Clean up state when a tab closes ────────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

// ─── Re-activate on tab update (e.g. navigation) ────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    const state = getTabState(tabId);
    if (state.active) {
      // Page navigated while calipers was active — re-inject
      sendToContent(tabId, { type: 'ACTIVATE', mode: state.mode });
    }
  }
});
