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
  chrome.action.setBadgeBackgroundColor({ tabId, color: active ? '#4A9EFF' : '#888888' });
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
    case 'TOGGLE_SNAP': {
      const next = setTabState(tabId, { snapToElements: msg.enabled });
      await sendToContent(tabId, { type: 'TOGGLE_SNAP', enabled: msg.enabled });
      sendResponse(next);
      break;
    }
    case 'CAPTURE_SCREENSHOT': {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
          format: 'png',
          quality: 100,
        });
        await sendToContent(tabId, { type: 'SCREENSHOT_READY', dataUrl });
        sendResponse({ dataUrl });
      } catch (err) {
        sendResponse({ error: String(err) });
      }
      break;
    }
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

function handleContentMessage(
  msg: Message,
  _tabId: number,
  sendResponse: (r: unknown) => void,
): void {
  switch (msg.type) {
    case 'MEASUREMENT_RESULT':
      // Could be forwarded to popup if it's open — for now just ack
      sendResponse({ ok: true });
      break;
    default:
      sendResponse({ ok: true });
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
