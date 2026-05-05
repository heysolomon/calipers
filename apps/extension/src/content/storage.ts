/**
 * Chrome storage helpers — persist guides and settings across sessions.
 */
import type { Guide } from '@calipers/shared';

const KEY_GUIDES       = 'calipers_guides';
const KEY_BOX_MODEL    = 'calipers_show_box_model';
const KEY_SNAP         = 'calipers_snap_to_elements';

// ─── Guides ───────────────────────────────────────────────────────────────────

export function loadGuides(): Promise<Guide[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEY_GUIDES, (result) => {
      resolve((result[KEY_GUIDES] as Guide[] | undefined) ?? []);
    });
  });
}

export function saveGuides(guides: Guide[]): void {
  chrome.storage.local.set({ [KEY_GUIDES]: guides });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function loadSettings(): Promise<{ showBoxModel: boolean; snapToElements: boolean }> {
  return new Promise((resolve) => {
    chrome.storage.local.get([KEY_BOX_MODEL, KEY_SNAP], (result) => {
      resolve({
        showBoxModel:    (result[KEY_BOX_MODEL] as boolean | undefined) ?? false,
        snapToElements:  (result[KEY_SNAP]      as boolean | undefined) ?? true,
      });
    });
  });
}

export function saveSetting(key: 'showBoxModel' | 'snapToElements', value: boolean): void {
  const storageKey = key === 'showBoxModel' ? KEY_BOX_MODEL : KEY_SNAP;
  chrome.storage.local.set({ [storageKey]: value });
}
