/**
 * In-page floating control panel — injected into the host page,
 * replacing the standard Chrome popup.
 * Stays open until the user explicitly dismisses it (× or Esc).
 */
import type { ExtensionState, Mode, Message } from '@calipers/shared';
import { DEFAULT_STATE } from '@calipers/shared';

const PANEL_ID = 'calipers-panel';
const PANEL_WIDTH = 240;

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
  z-index: 2147483647;
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

// ─── Mode icons (Hugeicons stroke style) ──────────────────────────────────────

const SVG_ATTRS = `xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;

const MODE_ICONS: Record<string, string> = {
  // Cursor/pointer → Inspect
  inspect: `<svg ${SVG_ATTRS}><path d="M5 3l5.5 17 2.5-5.5L18.5 12 5 3z"/><path d="M13 14.5l4.5 4.5"/></svg>`,
  // Ruler → Measure
  measure: `<svg ${SVG_ATTRS}><rect x="2" y="8" width="20" height="8" rx="1.5"/><line x1="6" y1="8" x2="6" y2="13"/><line x1="10" y1="8" x2="10" y2="11.5"/><line x1="14" y1="8" x2="14" y2="11.5"/><line x1="18" y1="8" x2="18" y2="13"/></svg>`,
  // Crosshair → Guides
  guides: `<svg ${SVG_ATTRS}><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="2.5"/></svg>`,
  // Eyedropper → Colour picker
  colorpicker: `<svg ${SVG_ATTRS}><path d="M14.5 6.5l3-3c.8-.8 2.2-.8 3 0 .8.8.8 2.2 0 3l-3 3"/><path d="M14.5 6.5L7 14l-3 3-.5 3.5 3.5-.5 3-3 7.5-7.5-3-3z"/><line x1="3.5" y1="20.5" x2="5.5" y2="18.5"/></svg>`,
  // Gap distribution → Spacing
  spacing: `<svg ${SVG_ATTRS}><line x1="4" y1="4" x2="4" y2="20"/><line x1="20" y1="4" x2="20" y2="20"/><rect x="8" y="8" width="8" height="8" rx="1.5"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="20" y2="12"/></svg>`,
};

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
        transition:left 0.18s cubic-bezier(0.4,0,0.2,1);
      "></span>
    </button>
  `;
}

function modeTabHTML(id: Mode, label: string, active: boolean): string {
  const icon = MODE_ICONS[id] ?? label;
  return `<button data-mode="${id}" title="${label}" style="position:relative;z-index:1;display:flex;align-items:center;justify-content:center;padding:5px 0;height:28px;background:transparent;border:none;border-radius:5px;color:${active ? T.textPrimary : T.textSecondary};cursor:pointer;font-family:inherit;outline:none;transition:color 0.22s cubic-bezier(0.4,0,0.2,1);">${icon}</button>`;
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

const MODE_LIST: Mode[] = ['inspect', 'measure', 'guides', 'colorpicker', 'spacing'];

function buildPanelHTML(state: ExtensionState): string {
  const modes: { id: Mode; label: string }[] = [
    { id: 'inspect',     label: 'Inspect' },
    { id: 'measure',     label: 'Measure' },
    { id: 'guides',      label: 'Guides' },
    { id: 'colorpicker', label: 'Colours' },
    { id: 'spacing',     label: 'Spacing' },
  ];
  const activeModeIdx = Math.max(0, MODE_LIST.indexOf(state.mode));

  const btnBase = `
    background:none;border:1px solid ${T.border};border-radius:5px;
    font-size:11px;font-weight:500;font-family:inherit;
    color:${T.textSecondary};cursor:pointer;letter-spacing:-0.01em;outline:none;
    transition:background 0.12s;padding:6px 0;
  `;

  return `
    <style>${KEYFRAMES}</style>
    <div style="padding:12px 14px 10px;display:flex;flex-direction:column;gap:10px;">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:${T.textPrimary};display:inline-flex;align-items:center;opacity:0.7;">${LOGO_SVG}</span>
          <span style="font-size:12px;font-weight:600;letter-spacing:-0.03em;color:${T.textPrimary};">Calipers</span>
        </div>
        <button data-action="close" style="
          display:inline-flex;align-items:center;justify-content:center;
          width:20px;height:20px;border-radius:5px;
          background:none;border:none;cursor:pointer;
          color:${T.textMuted};font-size:14px;line-height:1;
          font-family:inherit;outline:none;
          transition:background 0.12s, color 0.12s;
        ">×</button>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:${T.borderSubtle};margin:0 -14px;"></div>

      <!-- Mode segmented control -->
      <div style="position:relative;display:grid;grid-template-columns:repeat(5,1fr);background:rgba(0,0,0,0.06);border-radius:7px;padding:2px;gap:0;">
        <!-- Sliding active-tab pill (transitions on left) -->
        <div data-mode-indicator style="position:absolute;top:2px;bottom:2px;width:calc((100% - 4px) / 5);left:calc(2px + ${activeModeIdx} * ((100% - 4px) / 5));background:#fff;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.12);pointer-events:none;transition:left 0.22s cubic-bezier(0.4,0,0.2,1);"></div>
        ${modes.map(({ id, label }) => modeTabHTML(id, label, state.mode === id)).join('')}
      </div>

      <!-- Divider -->
      <div style="height:1px;background:${T.borderSubtle};margin:0 -14px;"></div>

      <!-- Settings toggles -->
      <div style="display:flex;flex-direction:column;gap:0;">
        ${settingRowHTML('boxModel', 'Box model',        state.showBoxModel,    !['inspect', 'measure'].includes(state.mode), false)}
        ${settingRowHTML('guides',   'Show guides',       state.showGuides,      false, false)}
        ${settingRowHTML('rulers',   'Rulers',            state.showRulers,      false, false)}
        ${settingRowHTML('snap',     'Snap to elements',  state.snapToElements,  false, true)}
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:5px;">
        <button data-action="screenshot" style="flex:1;${btnBase}">Screenshot</button>
        <button data-action="tokens"     style="flex:1;${btnBase}">Tokens</button>
      </div>

      <!-- Footer -->
      <p style="font-size:10px;color:${T.textMuted};text-align:center;letter-spacing:-0.01em;margin:0;">
        <kbd style="font-size:9px;font-family:inherit;background:#fff;border:1px solid ${T.border};border-bottom-width:2px;border-radius:3px;padding:0 4px;color:${T.textSecondary};">?</kbd> for all shortcuts
      </p>
    </div>
  `;
}

// ─── Partial DOM updates (preserve elements so CSS transitions play) ──────────

function updateModeOnly(mode: Mode): void {
  if (!panelEl) return;
  const idx = Math.max(0, MODE_LIST.indexOf(mode));

  const indicator = panelEl.querySelector<HTMLElement>('[data-mode-indicator]');
  if (indicator) indicator.style.left = `calc(2px + ${idx} * ((100% - 4px) / 5))`;

  panelEl.querySelectorAll<HTMLElement>('[data-mode]').forEach((btn) => {
    btn.style.color = btn.dataset['mode'] === mode ? T.textPrimary : T.textSecondary;
  });

  const boxModelToggle = panelEl.querySelector<HTMLButtonElement>('[data-toggle="boxModel"]');
  if (boxModelToggle) {
    const disabled = !['inspect', 'measure'].includes(mode);
    boxModelToggle.style.opacity = disabled ? '0.35' : '1';
    boxModelToggle.disabled = disabled;
  }
}

function updateToggleOnly(id: string, checked: boolean): void {
  if (!panelEl) return;
  const toggle = panelEl.querySelector<HTMLElement>(`[data-toggle="${id}"]`);
  if (!toggle) return;
  toggle.style.background = checked ? T.accent : 'rgba(0,0,0,0.12)';
  toggle.setAttribute('aria-checked', String(checked));
  const knob = toggle.querySelector<HTMLElement>('span');
  if (knob) knob.style.left = checked ? '15px' : '2px';
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

function wireHover(
  el: HTMLElement,
  enter: Partial<CSSStyleDeclaration>,
  leave: Partial<CSSStyleDeclaration>,
): void {
  el.addEventListener('mouseenter', () => Object.assign(el.style, enter));
  el.addEventListener('mouseleave', () => Object.assign(el.style, leave));
}

function wireEvents(panel: HTMLElement): void {
  // Close button hover
  const closeBtn = panel.querySelector<HTMLElement>('[data-action="close"]');
  if (closeBtn) {
    wireHover(
      closeBtn,
      { background: 'rgba(0,0,0,0.07)', color: T.textSecondary },
      { background: 'transparent',       color: T.textMuted      },
    );
  }

  // Action buttons hover
  panel.querySelectorAll<HTMLElement>('[data-action="screenshot"],[data-action="tokens"]').forEach((btn) => {
    wireHover(btn, { background: 'rgba(0,0,0,0.04)' }, { background: 'none' });
  });

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

    // Mode tabs — clicking a mode always activates if not already active
    const modeBtn = target.closest('[data-mode]') as HTMLElement | null;
    if (modeBtn) {
      const mode = modeBtn.dataset['mode'] as Mode;
      if (!localState.active) {
        localState = await sendMsg({ type: 'ACTIVATE', mode });
        localState.active = true;
      } else {
        localState = await sendMsg({ type: 'SWITCH_MODE', mode });
      }
      localState.mode = mode;
      updateModeOnly(mode);
      return;
    }

    // Toggle switches
    const toggleBtn = target.closest('[data-toggle]') as HTMLElement | null;
    if (toggleBtn) {
      const id = toggleBtn.dataset['toggle'];
      switch (id) {
        case 'boxModel': {
          const next = !localState.showBoxModel;
          localState = await sendMsg({ type: 'TOGGLE_BOX_MODEL', enabled: next });
          localState.showBoxModel = next;
          updateToggleOnly('boxModel', next);
          break;
        }
        case 'guides': {
          const next = !localState.showGuides;
          localState = await sendMsg({ type: 'TOGGLE_GUIDES', enabled: next });
          localState.showGuides = next;
          updateToggleOnly('guides', next);
          break;
        }
        case 'rulers': {
          const next = !localState.showRulers;
          localState = await sendMsg({ type: 'TOGGLE_RULERS', enabled: next });
          localState.showRulers = next;
          updateToggleOnly('rulers', next);
          break;
        }
        case 'snap': {
          const next = !localState.snapToElements;
          localState = await sendMsg({ type: 'TOGGLE_SNAP', enabled: next });
          localState.snapToElements = next;
          updateToggleOnly('snap', next);
          break;
        }
      }
      return;
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function showPanel(): Promise<void> {
  if (panelEl) return; // already open

  localState = await sendMsg({ type: 'GET_STATE' } as Message);
  if (!localState || typeof localState !== 'object' || !('mode' in localState)) {
    localState = { ...DEFAULT_STATE };
  }
  // Auto-activate so the overlay is ready immediately
  if (!localState.active) {
    localState = await sendMsg({ type: 'ACTIVATE', mode: localState.mode });
    localState.active = true;
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

  // Deactivate extension when panel is closed
  void sendMsg({ type: 'DEACTIVATE' });

  panelEl.style.animation = 'calipers-panel-out 0.15s cubic-bezier(0.22, 1, 0.36, 1) forwards';
  const el = panelEl;
  panelEl = null;
  setTimeout(() => el.remove(), 160);
}

export function togglePanel(): void {
  if (panelEl) {
    hidePanel(); // includes deactivate
  } else {
    void showPanel();
  }
}

export function isPanelOpen(): boolean {
  return panelEl !== null;
}

export function isPanelElement(el: Element | null): boolean {
  if (!el) return false;
  return el.id === PANEL_ID || el.closest(`#${PANEL_ID}`) !== null;
}
