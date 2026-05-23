/**
 * In-page floating control panel + design tokens view.
 *
 * Progressive disclosure structure:
 *   Primary   — mode switcher (always visible, the core action)
 *   Secondary — mode-contextual settings (collapsible, hidden when not needed)
 *   Tertiary  — actions + tokens view (on-demand / behind morph)
 *
 * Tokens view morphs in/out with a horizontal-slide animation.
 */
import type { ExtensionState, Mode, Message } from '@calipers/shared';
import { DEFAULT_STATE } from '@calipers/shared';
import { copyToClipboard } from './utils';
import { showToast } from './labels';

const PANEL_ID    = 'calipers-panel';
const PANEL_WIDTH = 240;
const TOKENS_VIEW_HEIGHT = 374;

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
  transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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
  inspect:     `<svg ${SVG_ATTRS}><path d="M5 3l5.5 17 2.5-5.5L18.5 12 5 3z"/><path d="M13 14.5l4.5 4.5"/></svg>`,
  measure:     `<svg ${SVG_ATTRS}><rect x="2" y="8" width="20" height="8" rx="1.5"/><line x1="6" y1="8" x2="6" y2="13"/><line x1="10" y1="8" x2="10" y2="11.5"/><line x1="14" y1="8" x2="14" y2="11.5"/><line x1="18" y1="8" x2="18" y2="13"/></svg>`,
  guides:      `<svg ${SVG_ATTRS}><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="2.5"/></svg>`,
  colorpicker: `<svg ${SVG_ATTRS}><path d="M14.5 6.5l3-3c.8-.8 2.2-.8 3 0 .8.8.8 2.2 0 3l-3 3"/><path d="M14.5 6.5L7 14l-3 3-.5 3.5 3.5-.5 3-3 7.5-7.5-3-3z"/><line x1="3.5" y1="20.5" x2="5.5" y2="18.5"/></svg>`,
  spacing:     `<svg ${SVG_ATTRS}><line x1="4" y1="4" x2="4" y2="20"/><line x1="20" y1="4" x2="20" y2="20"/><rect x="8" y="8" width="8" height="8" rx="1.5"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="20" y2="12"/></svg>`,
};

// ─── Progressive disclosure — mode-contextual settings ────────────────────────
//
// Each mode declares only the toggles relevant to it.
// Box model is meaningful in inspect/measure; snap only matters in guides; etc.

interface SettingDef {
  id:    string;
  label: string;
}

const MODE_SETTINGS: Record<Mode, SettingDef[]> = {
  inspect:     [{ id: 'boxModel', label: 'Box model'       }, { id: 'rulers', label: 'Rulers' }],
  measure:     [{ id: 'boxModel', label: 'Box model'       }, { id: 'rulers', label: 'Rulers' }],
  guides:      [{ id: 'guides',   label: 'Show guides'     }, { id: 'snap',   label: 'Snap to elements' }, { id: 'rulers', label: 'Rulers' }],
  colorpicker: [{ id: 'rulers',   label: 'Rulers'          }],
  spacing:     [{ id: 'rulers',   label: 'Rulers'          }],
};

// ─── Token types ──────────────────────────────────────────────────────────────

interface Token {
  name:  string;
  value: string;
  type:  'color' | 'spacing' | 'font' | 'other';
}

type TokenFilter = 'all' | Token['type'];

const TOKEN_FILTERS: TokenFilter[]             = ['all', 'color', 'spacing', 'font', 'other'];
const TOKEN_FILTER_LABELS: Record<TokenFilter, string> = {
  all: 'All', color: 'Color', spacing: 'Space', font: 'Font', other: 'Other',
};
const TOKEN_TYPE_COLORS: Record<Token['type'], string> = {
  color: '#C0392B', spacing: '#0E7490', font: '#166534', other: '#737373',
};

// ─── State ────────────────────────────────────────────────────────────────────

let panelEl: HTMLElement | null = null;
let localState: ExtensionState   = { ...DEFAULT_STATE };
let currentView: 'main' | 'tokens' = 'main';
let settingsExpanded              = true;
let mainViewHeight: number | null = null;      // height of main view, expanded
let collapsedHeight: number | null = null;     // height of main view, collapsed
let allTokens: Token[]            = [];
let activeTokenFilter: TokenFilter = 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendMsg(msg: Message): Promise<ExtensionState> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res: ExtensionState) => resolve(res));
  });
}

function getSettingValue(state: ExtensionState, id: string): boolean {
  switch (id) {
    case 'boxModel': return state.showBoxModel;
    case 'guides':   return state.showGuides;
    case 'rulers':   return state.showRulers;
    case 'snap':     return state.snapToElements;
    default:         return false;
  }
}

// ─── Token extraction ─────────────────────────────────────────────────────────

function classifyToken(name: string, value: string): Token['type'] {
  const n = name.toLowerCase();
  const v = value.trim();
  if (/color|colour|bg|background|fill|stroke|shadow/.test(n)) return 'color';
  if (/^#[0-9a-f]{3,8}$/i.test(v) || /^rgb|hsl/.test(v))      return 'color';
  if (/spacing|gap|margin|padding|size|width|height|radius/.test(n)) return 'spacing';
  if (/^-?[\d.]+px$/.test(v) || /^-?[\d.]+rem$/.test(v))       return 'spacing';
  if (/font|text|type|weight|line/.test(n))                      return 'font';
  return 'other';
}

function extractTokens(): Token[] {
  const tokens: Token[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < document.styleSheets.length; i++) {
    let sheet: CSSStyleSheet | undefined;
    try { sheet = document.styleSheets[i]; } catch { continue; }
    if (!sheet?.cssRules) continue;
    for (let j = 0; j < sheet.cssRules.length; j++) {
      const rule = sheet.cssRules[j] as CSSStyleRule;
      if (!rule.style) continue;
      for (let k = 0; k < rule.style.length; k++) {
        const prop = rule.style[k];
        if (!prop || !prop.startsWith('--')) continue;
        if (seen.has(prop)) continue;
        seen.add(prop);
        const value = rule.style.getPropertyValue(prop).trim();
        if (!value) continue;
        tokens.push({ name: prop, value, type: classifyToken(prop, value) });
      }
    }
  }
  return tokens.sort((a, b) => a.name.localeCompare(b.name));
}

function exportTokensJson(): void {
  const obj: Record<string, string> = {};
  for (const t of allTokens) obj[t.name] = t.value;
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `design-tokens-${Date.now()}.json`;
  a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported tokens.json');
}

// ─── HTML builders — main view ────────────────────────────────────────────────

function toggleHTML(id: string, checked: boolean): string {
  const bg       = checked ? T.accent : 'rgba(0,0,0,0.12)';
  const knobLeft = checked ? '15px' : '2px';
  return `
    <button
      data-toggle="${id}"
      role="switch"
      aria-checked="${checked}"
      style="
        position:relative;width:30px;height:17px;border-radius:9px;
        border:none;cursor:pointer;background:${bg};
        outline:none;flex-shrink:0;padding:0;
        transition:background 0.2s cubic-bezier(0.22,1,0.36,1);
      "
    >
      <span style="
        position:absolute;top:2px;left:${knobLeft};
        width:13px;height:13px;border-radius:50%;
        background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.22);
        transition:left 0.18s cubic-bezier(0.4,0,0.2,1);
      "></span>
    </button>
  `;
}

function modeTabHTML(id: Mode, label: string, active: boolean): string {
  const icon = MODE_ICONS[id] ?? label;
  return `<button data-mode="${id}" title="${label}" style="position:relative;z-index:1;display:flex;align-items:center;justify-content:center;padding:5px 0;height:28px;background:transparent;border:none;border-radius:5px;color:${active ? T.textPrimary : T.textSecondary};cursor:pointer;font-family:inherit;outline:none;transition:color 0.22s cubic-bezier(0.4,0,0.2,1);">${icon}</button>`;
}

function settingRowHTML(def: SettingDef, checked: boolean, isLast: boolean): string {
  const border = isLast ? 'none' : `1px solid ${T.borderSubtle}`;
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:${border};">
      <span style="font-size:12px;color:${T.textSecondary};letter-spacing:-0.01em;">${def.label}</span>
      ${toggleHTML(def.id, checked)}
    </div>
  `;
}

const MODE_LIST: Mode[] = ['inspect', 'measure', 'guides', 'colorpicker', 'spacing'];

function buildPanelHTML(state: ExtensionState): string {
  const modes: { id: Mode; label: string }[] = [
    { id: 'inspect',     label: 'Inspect'  },
    { id: 'measure',     label: 'Measure'  },
    { id: 'guides',      label: 'Guides'   },
    { id: 'colorpicker', label: 'Colours'  },
    { id: 'spacing',     label: 'Spacing'  },
  ];
  const activeModeIdx = Math.max(0, MODE_LIST.indexOf(state.mode));
  const settings      = MODE_SETTINGS[state.mode];

  const btnBase = `
    background:none;border:1px solid ${T.border};border-radius:5px;
    font-size:11px;font-weight:500;font-family:inherit;
    color:${T.textSecondary};cursor:pointer;letter-spacing:-0.01em;outline:none;
    transition:background 0.12s;padding:6px 0;
  `;

  // ── Caution: the settings section uses CSS grid-template-rows trick.
  // The outer wrapper (margin:0 -14px -10px) breaks the section full-bleed
  // and cancels the parent's padding-bottom so the section controls its own bottom spacing.
  return `
    <style>${KEYFRAMES}</style>
    <div data-views style="display:flex;flex-direction:row;transition:transform 0.28s cubic-bezier(0.4,0,0.2,1);">

      <!-- ── Main view ── -->
      <div data-view="main" style="width:${PANEL_WIDTH}px;flex-shrink:0;">
        <div style="padding:12px 14px 10px;display:flex;flex-direction:column;gap:10px;">

          <!-- Header: logo + close -->
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

          <!-- ── Primary: Mode segmented control (always visible) ── -->
          <div style="position:relative;display:grid;grid-template-columns:repeat(5,1fr);background:rgba(0,0,0,0.06);border-radius:7px;padding:2px;gap:0;">
            <div data-mode-indicator style="
              position:absolute;top:2px;bottom:2px;
              width:calc((100% - 4px) / 5);
              left:calc(2px + ${activeModeIdx} * ((100% - 4px) / 5));
              background:#fff;border-radius:5px;
              box-shadow:0 1px 2px rgba(0,0,0,0.12);
              pointer-events:none;
              transition:left 0.22s cubic-bezier(0.4,0,0.2,1);
            "></div>
            ${modes.map(({ id, label }) => modeTabHTML(id, label, state.mode === id)).join('')}
          </div>

          <!-- ── Secondary: Settings (collapsible, mode-contextual) ── -->
          <!-- Full-bleed wrapper cancels the parent's 10px bottom padding -->
          <div style="margin:0 -14px -10px;">

            <!-- Section header / collapse trigger -->
            <button data-action="toggle-settings" style="
              display:flex;align-items:center;justify-content:space-between;
              width:100%;padding:5px 14px;
              background:transparent;border:none;
              border-top:1px solid ${T.borderSubtle};
              cursor:pointer;font-family:inherit;outline:none;
              transition:background 0.12s;
            ">
              <span style="font-size:10px;font-weight:500;color:${T.textMuted};letter-spacing:0.05em;text-transform:uppercase;">Settings</span>
              <span data-settings-caret style="
                color:${T.textMuted};font-size:9px;display:inline-block;
                transition:transform 0.22s cubic-bezier(0.4,0,0.2,1);
                ${settingsExpanded ? '' : 'transform:rotate(-90deg);'}
              ">⌄</span>
            </button>

            <!-- Collapsible body (CSS grid-template-rows trick) -->
            <div data-settings-section style="
              display:grid;
              grid-template-rows:${settingsExpanded ? '1fr' : '0fr'};
              overflow:hidden;
              transition:grid-template-rows 0.25s cubic-bezier(0.4,0,0.2,1);
            ">
              <div style="min-height:0;">
                <div style="padding:6px 14px 12px;display:flex;flex-direction:column;gap:0;">

                  <!-- Mode-contextual setting rows -->
                  ${settings.map((def, i) => settingRowHTML(def, getSettingValue(state, def.id), i === settings.length - 1)).join('')}

                  <!-- Spacer -->
                  <div style="height:8px;"></div>

                  <!-- Actions -->
                  <div style="display:flex;gap:5px;">
                    <button data-action="screenshot" style="flex:1;${btnBase}">Screenshot</button>
                    <button data-action="tokens"     style="flex:1;${btnBase}">Tokens</button>
                  </div>

                  <!-- Footer hint -->
                  <p style="font-size:10px;color:${T.textMuted};text-align:center;letter-spacing:-0.01em;margin:6px 0 0;">
                    <kbd style="font-size:9px;font-family:inherit;background:#fff;border:1px solid ${T.border};border-bottom-width:2px;border-radius:3px;padding:0 4px;color:${T.textSecondary};">?</kbd> for shortcuts
                  </p>
                </div>
              </div>
            </div>

          </div>
          <!-- end settings wrapper -->

        </div>
      </div>
      <!-- end main view -->

    </div>
  `;
}

// ─── DOM builder — tokens view (lazy) ────────────────────────────────────────

function buildTokensViewElement(): HTMLElement {
  const el = document.createElement('div');
  el.dataset['view'] = 'tokens';
  el.style.cssText = `width:${PANEL_WIDTH}px;flex-shrink:0;height:${TOKENS_VIEW_HEIGHT}px;display:flex;flex-direction:column;`;

  const btnBase = `
    background:none;border:1px solid ${T.border};border-radius:5px;
    font-size:10px;font-weight:500;font-family:inherit;letter-spacing:-0.01em;
    color:${T.textSecondary};cursor:pointer;outline:none;transition:background 0.12s;padding:4px 8px;
  `;

  el.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px 10px;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:6px;">
        <button data-action="back-to-main" style="
          display:inline-flex;align-items:center;justify-content:center;
          width:20px;height:20px;border-radius:5px;
          background:none;border:none;cursor:pointer;
          color:${T.textMuted};font-size:13px;line-height:1;
          font-family:inherit;outline:none;
          transition:background 0.12s, color 0.12s;
        ">←</button>
        <span style="font-size:12px;font-weight:600;letter-spacing:-0.03em;color:${T.textPrimary};">Design Tokens</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span data-token-count style="font-size:10px;color:${T.textMuted};"></span>
        <button data-action="export-tokens" style="${btnBase}">Export</button>
      </div>
    </div>
    <!-- Divider -->
    <div style="height:1px;background:${T.borderSubtle};flex-shrink:0;"></div>
    <!-- Filter tabs — same sliding pill as mode tabs -->
    <div style="padding:8px 14px;flex-shrink:0;">
      <div data-token-filter-bar style="position:relative;display:grid;grid-template-columns:repeat(5,1fr);background:rgba(0,0,0,0.06);border-radius:7px;padding:2px;gap:0;">
        <div data-token-filter-indicator style="
          position:absolute;top:2px;bottom:2px;
          width:calc((100% - 4px) / 5);left:calc(2px + 0 * ((100% - 4px) / 5));
          background:#fff;border-radius:5px;
          box-shadow:0 1px 2px rgba(0,0,0,0.12);
          pointer-events:none;
          transition:left 0.22s cubic-bezier(0.4,0,0.2,1);
        "></div>
        ${TOKEN_FILTERS.map((f) => `
          <button data-token-filter="${f}" style="
            position:relative;z-index:1;display:flex;align-items:center;justify-content:center;
            padding:4px 0;height:24px;background:transparent;border:none;border-radius:5px;
            color:${f === 'all' ? T.textPrimary : T.textSecondary};cursor:pointer;
            font-family:inherit;font-size:10px;font-weight:500;outline:none;letter-spacing:-0.01em;
            transition:color 0.22s cubic-bezier(0.4,0,0.2,1);
          ">${TOKEN_FILTER_LABELS[f]}</button>
        `).join('')}
      </div>
    </div>
    <!-- Divider -->
    <div style="height:1px;background:${T.borderSubtle};flex-shrink:0;"></div>
    <!-- Token list -->
    <div data-token-rows style="overflow-y:auto;flex:1;padding:4px 0;"></div>
  `;

  return el;
}

// ─── Partial DOM updates ──────────────────────────────────────────────────────

function updateModeOnly(mode: Mode): void {
  if (!panelEl) return;
  const idx = Math.max(0, MODE_LIST.indexOf(mode));

  const indicator = panelEl.querySelector<HTMLElement>('[data-mode-indicator]');
  if (indicator) indicator.style.left = `calc(2px + ${idx} * ((100% - 4px) / 5))`;

  panelEl.querySelectorAll<HTMLElement>('[data-mode]').forEach((btn) => {
    btn.style.color = btn.dataset['mode'] === mode ? T.textPrimary : T.textSecondary;
  });

  // Update to show only contextual settings for this mode
  updateSettingRows(mode);
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

// Rebuilds setting rows in-place when mode changes (progressive disclosure:
// only show toggles relevant to the current mode).
function updateSettingRows(mode: Mode): void {
  if (!panelEl) return;
  const section = panelEl.querySelector<HTMLElement>('[data-settings-section] > div > div');
  if (!section) return;

  // Replace only the settings rows (not the spacer/actions/footer).
  // The inner content div is: [setting rows...] [spacer] [actions] [footer]
  // Remove all [data-toggle] parent rows, keep the rest.
  const rows = section.querySelectorAll<HTMLElement>('[data-toggle]');
  rows.forEach((toggle) => {
    const row = toggle.closest<HTMLElement>('div[style*="justify-content:space-between"]');
    row?.remove();
  });

  const settings = MODE_SETTINGS[mode];
  const spacer   = section.querySelector<HTMLElement>('div[style*="height:8px"]');

  settings.forEach((def, i) => {
    const isLast = i === settings.length - 1;
    const div    = document.createElement('div');
    div.innerHTML = settingRowHTML(def, getSettingValue(localState, def.id), isLast);
    const row = div.firstElementChild as HTMLElement;
    if (spacer) section.insertBefore(row, spacer);
    else section.prepend(row);
  });
}

function updateTokenFilter(filter: TokenFilter): void {
  if (!panelEl) return;
  const filterIdx = TOKEN_FILTERS.indexOf(filter);

  const indicator = panelEl.querySelector<HTMLElement>('[data-token-filter-indicator]');
  if (indicator) indicator.style.left = `calc(2px + ${filterIdx} * ((100% - 4px) / 5))`;

  panelEl.querySelectorAll<HTMLElement>('[data-token-filter]').forEach((btn) => {
    btn.style.color = btn.dataset['tokenFilter'] === filter ? T.textPrimary : T.textSecondary;
  });
}

function renderTokenRows(): void {
  if (!panelEl) return;
  const rows    = panelEl.querySelector<HTMLElement>('[data-token-rows]');
  const countEl = panelEl.querySelector<HTMLElement>('[data-token-count]');
  if (!rows) return;

  const filtered = activeTokenFilter === 'all'
    ? allTokens
    : allTokens.filter((t) => t.type === activeTokenFilter);

  if (countEl) countEl.textContent = `${filtered.length}`;
  rows.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `color:${T.textMuted};font-size:11px;text-align:center;padding:16px 0;`;
    empty.textContent = 'No tokens found';
    rows.appendChild(empty);
    return;
  }

  for (const token of filtered) {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 14px;cursor:pointer;transition:background 0.1s;`;
    row.title = 'Click to copy value';

    const swatch = document.createElement('span');
    swatch.style.cssText = `width:12px;height:12px;border-radius:2px;flex-shrink:0;border:1px solid rgba(0,0,0,0.08);`;
    if (token.type === 'color') swatch.style.background = token.value;
    else { swatch.style.background = TOKEN_TYPE_COLORS[token.type]; swatch.style.opacity = '0.3'; }

    const info = document.createElement('span');
    info.style.cssText = 'flex:1;overflow:hidden;min-width:0;';

    const name = document.createElement('div');
    name.style.cssText = `color:${TOKEN_TYPE_COLORS[token.type]};font-family:"JetBrains Mono",monospace;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
    name.textContent = token.name;

    const value = document.createElement('div');
    value.style.cssText = `color:${T.textSecondary};font-family:"JetBrains Mono",monospace;font-size:10px;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
    value.textContent = token.value;

    info.appendChild(name); info.appendChild(value);
    row.appendChild(swatch); row.appendChild(info);

    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(0,0,0,0.03)'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });
    row.addEventListener('click', async () => {
      await copyToClipboard(token.value);
      showToast(`Copied ${token.name}`);
    });

    rows.appendChild(row);
  }
}

// ─── Settings collapse / expand ───────────────────────────────────────────────

function updateSettingsVisibility(animate: boolean): void {
  if (!panelEl || currentView !== 'main') return;

  const section = panelEl.querySelector<HTMLElement>('[data-settings-section]');
  const caret   = panelEl.querySelector<HTMLElement>('[data-settings-caret]');
  if (!section) return;

  if (caret) caret.style.transform = settingsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';

  if (!animate) {
    section.style.gridTemplateRows = settingsExpanded ? '1fr' : '0fr';
    return;
  }

  if (!settingsExpanded) {
    // Collapsing: measure section height before collapse, derive target height
    if (mainViewHeight === null) mainViewHeight = panelEl.offsetHeight;
    const sectionH = section.offsetHeight;
    collapsedHeight = mainViewHeight - sectionH;

    panelEl.style.height = `${mainViewHeight}px`;
    section.style.gridTemplateRows = '0fr';

    requestAnimationFrame(() => {
      if (!panelEl) return;
      panelEl.style.height = `${collapsedHeight!}px`;
    });

  } else {
    // Expanding: lock at collapsed height, open section, animate to full
    if (collapsedHeight !== null) panelEl.style.height = `${collapsedHeight}px`;
    section.style.gridTemplateRows = '1fr';

    requestAnimationFrame(() => {
      if (!panelEl) return;
      panelEl.style.height = mainViewHeight ? `${mainViewHeight}px` : '';
    });

    panelEl.addEventListener('transitionend', function cb(e: TransitionEvent) {
      if (e.propertyName !== 'height') return;
      panelEl?.removeEventListener('transitionend', cb);
      if (panelEl && currentView === 'main' && settingsExpanded) {
        panelEl.style.height = '';
        mainViewHeight = panelEl.offsetHeight;
      }
    });
  }
}

// ─── View switching with morph animation ─────────────────────────────────────

function switchView(view: 'main' | 'tokens'): void {
  if (!panelEl || currentView === view) return;

  const wrapper = panelEl.querySelector<HTMLElement>('[data-views]');
  if (!wrapper) return;

  if (view === 'tokens') {
    currentView = 'tokens';

    if (!wrapper.querySelector('[data-view="tokens"]')) {
      const tokensEl = buildTokensViewElement();
      wireHover(
        tokensEl.querySelector<HTMLElement>('[data-action="back-to-main"]')!,
        { background: 'rgba(0,0,0,0.07)', color: T.textSecondary },
        { background: 'transparent',       color: T.textMuted      },
      );
      wireHover(
        tokensEl.querySelector<HTMLElement>('[data-action="export-tokens"]')!,
        { background: 'rgba(0,0,0,0.04)' }, { background: 'none' },
      );
      wrapper.appendChild(tokensEl);
    }

    allTokens = extractTokens();
    activeTokenFilter = 'all';
    renderTokenRows();
    updateTokenFilter('all');

    // Use effective main-view height (collapsed or expanded)
    const fromH = settingsExpanded
      ? (mainViewHeight ?? panelEl.offsetHeight)
      : (collapsedHeight ?? panelEl.offsetHeight);

    panelEl.style.height = `${fromH}px`;
    requestAnimationFrame(() => {
      if (!panelEl) return;
      panelEl.style.height = `${TOKENS_VIEW_HEIGHT}px`;
      wrapper.style.transform = `translateX(-${PANEL_WIDTH}px)`;
    });

  } else {
    currentView = 'main';

    const toH = settingsExpanded
      ? (mainViewHeight ?? null)
      : (collapsedHeight ?? null);

    requestAnimationFrame(() => {
      if (!panelEl) return;
      panelEl.style.height = toH ? `${toH}px` : '';
      wrapper.style.transform = 'translateX(0)';
    });

    const cleanup = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return;
      wrapper.removeEventListener('transitionend', cleanup);
      wrapper.querySelector('[data-view="tokens"]')?.remove();
      if (panelEl && settingsExpanded) panelEl.style.height = '';
    };
    wrapper.addEventListener('transitionend', cleanup);
  }
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

function wireHover(
  el: HTMLElement,
  enter: Partial<CSSStyleDeclaration>,
  leave: Partial<CSSStyleDeclaration>,
): void {
  if (!el) return;
  el.addEventListener('mouseenter', () => Object.assign(el.style, enter));
  el.addEventListener('mouseleave', () => Object.assign(el.style, leave));
}

function wireEvents(panel: HTMLElement): void {
  const closeBtn = panel.querySelector<HTMLElement>('[data-action="close"]');
  if (closeBtn) wireHover(closeBtn, { background: 'rgba(0,0,0,0.07)', color: T.textSecondary }, { background: 'transparent', color: T.textMuted });

  const toggleSettingsBtn = panel.querySelector<HTMLElement>('[data-action="toggle-settings"]');
  if (toggleSettingsBtn) wireHover(toggleSettingsBtn, { background: 'rgba(0,0,0,0.04)' }, { background: 'transparent' });

  panel.querySelectorAll<HTMLElement>('[data-action="screenshot"],[data-action="tokens"]').forEach((btn) => {
    wireHover(btn, { background: 'rgba(0,0,0,0.04)' }, { background: 'none' });
  });

  panel.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    if (target.closest('[data-action="close"]'))        { hidePanel(); return; }
    if (target.closest('[data-action="back-to-main"]')) { switchView('main'); return; }

    if (target.closest('[data-action="toggle-settings"]')) {
      settingsExpanded = !settingsExpanded;
      updateSettingsVisibility(true);
      return;
    }

    if (target.closest('[data-action="screenshot"]')) {
      const btn = panel.querySelector<HTMLElement>('[data-action="screenshot"]');
      if (btn) { btn.textContent = 'Capturing…'; btn.style.color = T.textMuted; btn.style.cursor = 'default'; }
      await sendMsg({ type: 'CAPTURE_SCREENSHOT' });
      setTimeout(() => {
        if (btn) { btn.textContent = 'Screenshot'; btn.style.color = T.textSecondary; btn.style.cursor = 'pointer'; }
      }, 1200);
      return;
    }

    if (target.closest('[data-action="tokens"]'))       { switchView('tokens'); return; }
    if (target.closest('[data-action="export-tokens"]')) { exportTokensJson(); return; }

    // Mode tabs
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

    // Token filter tabs
    const filterBtn = target.closest('[data-token-filter]') as HTMLElement | null;
    if (filterBtn) {
      const filter = filterBtn.dataset['tokenFilter'] as TokenFilter;
      activeTokenFilter = filter;
      updateTokenFilter(filter);
      renderTokenRows();
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
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function showPanel(): Promise<void> {
  if (panelEl) return;

  localState = await sendMsg({ type: 'GET_STATE' } as Message);
  if (!localState || typeof localState !== 'object' || !('mode' in localState)) {
    localState = { ...DEFAULT_STATE };
  }
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

  requestAnimationFrame(() => {
    if (panelEl && mainViewHeight === null) {
      mainViewHeight = panelEl.offsetHeight;
    }
  });
}

export function hidePanel(): void {
  if (!panelEl) return;

  void sendMsg({ type: 'DEACTIVATE' });

  currentView       = 'main';
  settingsExpanded  = true;
  mainViewHeight    = null;
  collapsedHeight   = null;
  activeTokenFilter = 'all';

  panelEl.style.animation = 'calipers-panel-out 0.15s cubic-bezier(0.22, 1, 0.36, 1) forwards';
  const el = panelEl;
  panelEl = null;
  setTimeout(() => el.remove(), 160);
}

export function togglePanel(): void {
  if (panelEl) hidePanel();
  else void showPanel();
}

export function isPanelOpen(): boolean {
  return panelEl !== null;
}

export function isPanelElement(el: Element | null): boolean {
  if (!el) return false;
  return el.id === PANEL_ID || el.closest(`#${PANEL_ID}`) !== null;
}

// ─── Token panel compatibility API ───────────────────────────────────────────

export function showTokensView(): void {
  if (panelEl) switchView('tokens');
  else void showPanel().then(() => requestAnimationFrame(() => switchView('tokens')));
}

export function hideTokensView(): void {
  if (currentView === 'tokens') switchView('main');
}

export function toggleTokensView(): void {
  if (!panelEl) void showPanel().then(() => requestAnimationFrame(() => switchView('tokens')));
  else if (currentView === 'tokens') switchView('main');
  else switchView('tokens');
}
