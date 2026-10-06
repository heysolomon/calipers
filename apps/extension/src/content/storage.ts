/**
 * Chrome storage helpers — persist guides, panel position, and settings across sessions.
 */
import type { Guide } from '@calipers/shared';

const KEY_GUIDES     = 'calipers_guides_doc';
const KEY_GUIDES_LEGACY = 'calipers_guides';
const KEY_BOX_MODEL  = 'calipers_show_box_model';
const KEY_SNAP       = 'calipers_snap_to_elements';
const KEY_PANEL_POS  = 'calipers_panel_pos';

export interface PanelPosition {
  left: number;
  top: number;
}

// ─── Guides ───────────────────────────────────────────────────────────────────

export function loadGuides(): Promise<Guide[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([KEY_GUIDES, KEY_GUIDES_LEGACY], (result) => {
      const modern = result[KEY_GUIDES] as Guide[] | undefined;
      if (modern) {
        resolve(modern);
        return;
      }
      // Drop legacy viewport-space guides — positions would be wrong after scroll.
      if (result[KEY_GUIDES_LEGACY] != null) {
        void chrome.storage.local.remove(KEY_GUIDES_LEGACY);
      }
      resolve([]);
    });
  });
}

export function saveGuides(guides: Guide[]): Promise<void> {
  return chrome.storage.local.set({ [KEY_GUIDES]: guides });
}

// ─── Panel position ───────────────────────────────────────────────────────────

export function loadPanelPosition(): Promise<PanelPosition | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEY_PANEL_POS, (result) => {
      const pos = result[KEY_PANEL_POS] as PanelPosition | undefined;
      if (
        pos &&
        typeof pos.left === 'number' &&
        typeof pos.top === 'number' &&
        Number.isFinite(pos.left) &&
        Number.isFinite(pos.top)
      ) {
        resolve(pos);
      } else {
        resolve(null);
      }
    });
  });
}

export function savePanelPosition(pos: PanelPosition): void {
  void chrome.storage.local.set({ [KEY_PANEL_POS]: pos });
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
  void chrome.storage.local.set({ [storageKey]: value });
}
