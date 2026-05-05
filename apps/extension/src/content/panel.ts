/**
 * In-page floating control panel — injected into the host page,
 * replacing the standard Chrome popup.
 * Stays open until the user explicitly dismisses it (× or Esc).
 */
import type { ExtensionState, Mode, Message } from '@calipers/shared';
import { DEFAULT_STATE } from '@calipers/shared';

const PANEL_ID = 'calipers-panel';
const PANEL_WIDTH = 260;

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:            '#F7F7F7',
  border:        'rgba(0, 0, 0, 0.08)',
  borderSubtle:  'rgba(0, 0, 0, 0.06)',
  textPrimary:   '#000',
  textSecondary: '#737373',
  textMuted:     '#D4D4D4',
  accent:        '#FF4500',
  shadow:        '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PANEL_CSS = `
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483646;
  width: ${PANEL_WIDTH}px;
  background: ${T.bg};
  border: 1px solid ${T.border};
  border-radius: 14px;
  box-shadow: ${T.shadow};
  font-family: 'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: ${T.textPrimary};
  pointer-events: all;
  user-select: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  animation: calipers-panel-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  overflow: hidden;
`;

const KEYFRAMES = `
  @keyframes calipers-panel-in {
    from { opacity: 0; transform: scale(0.92) translateY(-8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }
  @keyframes calipers-panel-out {
    from { opacity: 1; transform: scale(1)    translateY(0);    }
    to   { opacity: 0; transform: scale(0.92) translateY(-8px); }
  }
`;

// ─── Logo SVG (inline) ────────────────────────────────────────────────────────

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 256 256"><path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="currentColor"></path></svg>`;

// ─── State ────────────────────────────────────────────────────────────────────

let panelEl: HTMLElement | null = null;
let localState: ExtensionState = { ...DEFAULT_STATE };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendMsg(msg: Message): Promise<ExtensionState> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res: ExtensionState) => resolve(res));
  });
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function toggleHTML(id: string, checked: boolean, disabled = false): string {
  const bg = checked ? T.accent : 'rgba(0,0,0,0.12)';
  const knobLeft = checked ? '15px' : '2px';
  const opacity = disabled ? '0.35' : '1';
  const cursor = disabled ? 'default' : 'pointer';
  return `
    <button
      data-toggle="${id}"
      role="switch"
      aria-checked="${checked}"
      style="
        position:relative;width:30px;height:17px;border-radius:9px;
        border:none;cursor:${cursor};background:${bg};
        outline:none;flex-shrink:0;opacity:${opacity};padding:0;
        transition:background 0.2s cubic-bezier(0.22,1,0.36,1);
      "
    >
      <span style="
        position:absolute;top:2px;left:${knobLeft};
        width:13px;height:13px;border-radius:50%;
        background:#fff;
        box-shadow:0 1px 3px rgba(0,0,0,0.22);
        transition:left 0.22s cubic-bezier(0.34,1.56,0.64,1);
      "></span>
    </button>
  `;
}

function modeTabHTML(id: Mode, label: string, active: boolean): string {
  const borderColor = active ? T.textPrimary : 'transparent';
  const color = active ? T.textPrimary : T.textMuted;
  const weight = active ? '500' : '400';
  return `
    <button
      data-mode="${id}"
      style="
        flex:1;padding:7px 0 9px;background:none;border:none;
        border-bottom:1.5px solid ${borderColor};margin-bottom:-1px;
        font-size:12px;font-weight:${weight};color:${color};
        cursor:pointer;letter-spacing:-0.01em;
        font-family:inherit;
        transition:color 0.15s, border-color 0.15s;
        outline:none;
      "
    >${label}</button>
  `;
}

function settingRowHTML(
  id: string,
  label: string,
  checked: boolean,
  disabled: boolean,
  isLast: boolean,
): string {
  const color = disabled ? T.textMuted : T.textSecondary;
  const border = isLast ? 'none' : `1px solid ${T.borderSubtle}`;
  return `
    <div style="
      display:flex;align-items:center;justify-content:space-between;
      padding:7px 0;border-bottom:${border};
    ">
      <span style="font-size:12px;color:${color};letter-spacing:-0.01em;">${label}</span>
      ${toggleHTML(id, checked, disabled)}
    </div>
  `;
}

function buildPanelHTML(state: ExtensionState): string {
  const modes: { id: Mode; label: string }[] = [
    { id: 'inspect',     label: 'Inspect' },
    { id: 'measure',     label: 'Measure' },
    { id: 'guides',      label: 'Guides' },
    { id: 'colorpicker', label: 'Colours' },
    { id: 'spacing',     label: 'Spacing' },
  ];

  const dotColor = state.active ? T.accent : T.textMuted;

  return `
    <style>${KEYFRAMES}</style>
    <div style="padding:14px 16px 12px;display:flex;flex-direction:column;gap:12px;">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="color:${T.textPrimary};display:inline-flex;align-items:center;">${LOGO_SVG}</span>
          <span style="
            display:inline-block;width:6px;height:6px;border-radius:50%;
            background:${dotColor};transition:background 0.2s;flex-shrink:0;
          "></span>
          <span style="font-size:13px;font-weight:600;letter-spacing:-0.03em;color:${T.textPrimary};">
            Calipers
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${toggleHTML('active', state.active)}
          <button data-action="close" style="
            background:none;border:none;cursor:pointer;padding:2px;
            color:${T.textMuted};font-size:16px;line-height:1;
            font-family:inherit;outline:none;
            transition:color 0.15s;
          " onmouseenter="this.style.color='${T.textSecondary}'"
             onmouseleave="this.style.color='${T.textMuted}'"
          >×</button>
        </div>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:${T.borderSubtle};margin:0 -16px;"></div>

      <!-- Mode selector -->
      <div style="display:flex;border-bottom:1px solid ${T.borderSubtle};margin-bottom:-1px;">
        ${modes.map(({ id, label }) => modeTabHTML(id, label, state.mode === id)).join('')}
      </div>

      <!-- Divider -->
      <div style="height:1px;background:${T.borderSubtle};margin:0 -16px;"></div>

      <!-- Settings -->
      <div>
        <p style="
          font-size:10px;font-weight:600;letter-spacing:0.07em;
          text-transform:uppercase;color:${T.textMuted};margin-bottom:6px;
        ">Settings</p>
        <div>
          ${settingRowHTML('boxModel', 'Box model', state.showBoxModel, !['inspect', 'measure'].includes(state.mode), false)}
          ${settingRowHTML('guides', 'Show guides', state.showGuides, false, false)}
          ${settingRowHTML('snap', 'Snap to elements', state.snapToElements, false, true)}
        </div>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:${T.borderSubtle};margin:0 -16px;"></div>

      <!-- Actions row -->
      <div style="display:flex;gap:6px;">
        <button data-action="screenshot" style="
          flex:1;padding:8px 0;background:none;
          border:1px solid ${T.border};border-radius:6px;
          font-size:11px;font-weight:500;font-family:inherit;
          color:${T.textSecondary};cursor:pointer;
          letter-spacing:-0.01em;outline:none;
          transition:background 0.15s, color 0.15s;
        " onmouseenter="this.style.background='rgba(0,0,0,0.04)'"
           onmouseleave="this.style.background='none'"
        >Screenshot →</button>
        <button data-action="tokens" style="
          flex:1;padding:8px 0;background:none;
          border:1px solid ${T.border};border-radius:6px;
          font-size:11px;font-weight:500;font-family:inherit;
          color:${T.textSecondary};cursor:pointer;
          letter-spacing:-0.01em;outline:none;
          transition:background 0.15s, color 0.15s;
        " onmouseenter="this.style.background='rgba(0,0,0,0.04)'"
           onmouseleave="this.style.background='none'"
        >Tokens <kbd style="font-size:9px;font-family:inherit;background:${T.bg};border:1px solid ${T.border};border-bottom-width:2px;border-radius:3px;padding:0 3px;color:${T.textMuted};">D</kbd></button>
      </div>

      <!-- Footer -->
      <p style="
        font-size:10px;color:${T.textMuted};
        text-align:center;letter-spacing:-0.01em;
      ">
        Press <kbd style="
          font-size:9px;font-family:inherit;
          background:#fff;
          border:1px solid ${T.border};
          border-bottom-width:2px;border-radius:3px;
          padding:0 4px;color:${T.textSecondary};
        ">?</kbd> for all shortcuts
      </p>
    </div>
  `;
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

function wireEvents(panel: HTMLElement): void {
  panel.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Close button
    if (target.closest('[data-action="close"]')) {
      hidePanel();
      return;
    }

    // Screenshot
    if (target.closest('[data-action="screenshot"]')) {
      const btn = panel.querySelector('[data-action="screenshot"]') as HTMLElement;
      if (btn) {
        btn.textContent = 'Capturing…';
        btn.style.color = T.textMuted;
        btn.style.cursor = 'default';
      }
      await sendMsg({ type: 'CAPTURE_SCREENSHOT' });
      setTimeout(() => {
        if (btn) {
          btn.textContent = 'Screenshot →';
          btn.style.color = T.textSecondary;
          btn.style.cursor = 'pointer';
        }
      }, 1200);
      return;
    }

    // Design token panel
    if (target.closest('[data-action="tokens"]')) {
      // Fire D key equivalent via message dispatch
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      return;
    }

    // Mode tabs
    const modeBtn = target.closest('[data-mode]') as HTMLElement | null;
    if (modeBtn) {
      const mode = modeBtn.dataset['mode'] as Mode;
      if (!localState.active) {
        localState = await sendMsg({ type: 'ACTIVATE', mode });
      } else {
        localState = await sendMsg({ type: 'SWITCH_MODE', mode });
      }
      localState.active = true;
      localState.mode = mode;
      rerender();
      return;
    }

    // Toggle switches
    const toggleBtn = target.closest('[data-toggle]') as HTMLElement | null;
    if (toggleBtn) {
      const id = toggleBtn.dataset['toggle'];
      switch (id) {
        case 'active': {
          if (localState.active) {
            localState = await sendMsg({ type: 'DEACTIVATE' });
          } else {
            localState = await sendMsg({ type: 'ACTIVATE', mode: localState.mode });
          }
          rerender();
          break;
        }
        case 'boxModel': {
          const next = !localState.showBoxModel;
          localState = await sendMsg({ type: 'TOGGLE_BOX_MODEL', enabled: next });
          localState.showBoxModel = next;
          rerender();
          break;
        }
        case 'guides': {
          const next = !localState.showGuides;
          localState = await sendMsg({ type: 'TOGGLE_GUIDES', enabled: next });
          localState.showGuides = next;
          rerender();
          break;
        }
        case 'snap': {
          const next = !localState.snapToElements;
          localState = await sendMsg({ type: 'TOGGLE_SNAP', enabled: next });
          localState.snapToElements = next;
          rerender();
          break;
        }
      }
      return;
    }
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────

function rerender(): void {
  if (!panelEl) return;
  panelEl.innerHTML = buildPanelHTML(localState);
  wireEvents(panelEl);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function showPanel(): Promise<void> {
  if (panelEl) return; // already open

  // Fetch current state from background
  localState = await sendMsg({ type: 'GET_STATE' } as Message);
  if (!localState || typeof localState !== 'object' || !('mode' in localState)) {
    localState = { ...DEFAULT_STATE };
  }

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.setAttribute('style', PANEL_CSS);
  panel.innerHTML = buildPanelHTML(localState);

  document.documentElement.appendChild(panel);
  panelEl = panel;

  wireEvents(panel);
}

export function hidePanel(): void {
  if (!panelEl) return;

  // Animate out
  panelEl.style.animation = 'calipers-panel-out 0.15s cubic-bezier(0.22, 1, 0.36, 1) forwards';
  const el = panelEl;
  panelEl = null;
  setTimeout(() => el.remove(), 160);
}

export function togglePanel(): void {
  if (panelEl) {
    hidePanel();
  } else {
    showPanel();
  }
}

export function isPanelOpen(): boolean {
  return panelEl !== null;
}

export function isPanelElement(el: Element | null): boolean {
  if (!el) return false;
  return el.id === PANEL_ID || el.closest(`#${PANEL_ID}`) !== null;
}
