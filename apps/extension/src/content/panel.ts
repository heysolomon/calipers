/**
 * In-page floating control panel + design tokens view.
 *
 * Single popup card (draggable via header grip):
 *   Header    — grip + brand + close
 *   Toolbar   — mode tools + capture actions
 *   Tray      — mode-contextual settings / annotate / guides (inside card)
 *   More menu — clear actions, tokens, shortcuts hint
 *
 * Tokens view opens as a card below the main popup.
 */
import type { ExtensionState, Mode, Message } from '@calipers/shared';
import { DEFAULT_STATE } from '@calipers/shared';
import { copyToClipboard } from './utils';
import { showErrorReport, showToast } from './labels';
import {
  clearGuides,
  setGuidePlacement,
  getGuidePlacement,
  type GuidePlacement,
} from './modes/guides';
import {
  clearAnnotations,
  setAnnotateTool,
  getAnnotateTool,
  setAnnotateColor,
  getAnnotateColor,
  ANNOTATE_COLORS,
  type AnnotateTool,
} from './modes/annotate';
import { clearMeasurements } from './modes/measure';
import { startRegionCapture } from './region-capture';
import { loadPanelPosition, savePanelPosition, type PanelPosition } from './storage';

const PANEL_ID = 'calipers-panel';
/** Fixed popup width — mode/tool changes grow height only, never width. */
const PANEL_WIDTH = 280;
const TOKENS_WIDTH = PANEL_WIDTH;
const TOKENS_VIEW_HEIGHT = 374;
/** Consistent inset from every viewport edge. */
const PANEL_INSET = 16;

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:            '#ffffff',
  border:        'rgba(0, 0, 0, 0.08)',
  borderSubtle:  'rgba(0, 0, 0, 0.06)',
  textPrimary:   '#000',
  textSecondary: '#737373',
  textMuted:     '#A3A3A3',
  accent:        '#FF4500',
  accentTint:    'rgba(255, 69, 0, 0.12)',
  shadow:        '0 2px 8px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PANEL_CSS = `
  position: fixed;
  z-index: 2147483647;
  width: ${PANEL_WIDTH}px;
  max-width: calc(100vw - ${PANEL_INSET * 2}px);
  box-sizing: border-box;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  font-family: 'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: ${T.textPrimary};
  pointer-events: all;
  user-select: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  animation: calipers-panel-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  overflow: visible;
`;

const PANEL_MARGIN = PANEL_INSET;
/** Release near a corner within this distance → soft magnetic snap. */
const CORNER_MAGNET_PX = 72;
/** Flick speed (px/ms) that forces a corner snap in the throw direction. */
const CORNER_FLICK_VX = 0.55;
/** Spring settle — snappy with a light overshoot at edges/corners. */
const SPRING_STIFFNESS = 320;
const SPRING_DAMPING = 24;
/** Rubber-band resistance when dragging past the viewport edge. */
const RUBBER_CONSTANT = 0.55;
const RUBBER_DIM = 180;

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

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 256 256"><path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="currentColor"></path></svg>`;

/** Six-dot grip — visible drag affordance in the panel header. */
const GRIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="2.5" r="1.4"/><circle cx="9" cy="2.5" r="1.4"/><circle cx="3" cy="8" r="1.4"/><circle cx="9" cy="8" r="1.4"/><circle cx="3" cy="13.5" r="1.4"/><circle cx="9" cy="13.5" r="1.4"/></svg>`;

// ─── Mode icons (Hugeicons stroke style) ──────────────────────────────────────

const SVG_ATTRS = `xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;

const MODE_ICONS: Record<string, string> = {
  inspect:     `<svg ${SVG_ATTRS}><path d="M5 3l5.5 17 2.5-5.5L18.5 12 5 3z"/><path d="M13 14.5l4.5 4.5"/></svg>`,
  measure:     `<svg ${SVG_ATTRS}><rect x="2" y="8" width="20" height="8" rx="1.5"/><line x1="6" y1="8" x2="6" y2="13"/><line x1="10" y1="8" x2="10" y2="11.5"/><line x1="14" y1="8" x2="14" y2="11.5"/><line x1="18" y1="8" x2="18" y2="13"/></svg>`,
  guides:      `<svg ${SVG_ATTRS}><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="2.5"/></svg>`,
  colorpicker: `<svg ${SVG_ATTRS}><path d="M14.5 6.5l3-3c.8-.8 2.2-.8 3 0 .8.8.8 2.2 0 3l-3 3"/><path d="M14.5 6.5L7 14l-3 3-.5 3.5 3.5-.5 3-3 7.5-7.5-3-3z"/><line x1="3.5" y1="20.5" x2="5.5" y2="18.5"/></svg>`,
  spacing:     `<svg ${SVG_ATTRS}><line x1="4" y1="4" x2="4" y2="20"/><line x1="20" y1="4" x2="20" y2="20"/><rect x="8" y="8" width="8" height="8" rx="1.5"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="20" y2="12"/></svg>`,
  annotate:    `<svg ${SVG_ATTRS}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
};

const SCREENSHOT_ICON = `<svg ${SVG_ATTRS}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
const REGION_ICON = `<svg ${SVG_ATTRS}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>`;

// ─── Progressive disclosure — mode-contextual settings ────────────────────────

interface SettingDef {
  id:    string;
  label: string;
}

const MODE_SETTINGS: Record<Mode, SettingDef[]> = {
  inspect:     [{ id: 'boxModel', label: 'Box model'       }, { id: 'rulers', label: 'Rulers' }],
  measure:     [{ id: 'boxModel', label: 'Box model'       }, { id: 'rulers', label: 'Rulers' }],
  guides:      [{ id: 'guides', label: 'Show guides' }, { id: 'guideLabels', label: 'Show positions' }, { id: 'snap', label: 'Snap to elements' }, { id: 'rulers', label: 'Rulers' }],
  colorpicker: [{ id: 'rulers',   label: 'Rulers'          }],
  spacing:     [{ id: 'rulers',   label: 'Rulers'          }],
  annotate:    [{ id: 'rulers',   label: 'Rulers'          }],
};

const ANNOTATE_TOOLS: { id: AnnotateTool; label: string; key: string }[] = [
  { id: 'measure', label: 'Size',  key: 'M' },
  { id: 'note',    label: 'Note',  key: 'N' },
  { id: 'arrow',   label: 'Arrow', key: 'A' },
  { id: 'pen',     label: 'Pen',   key: 'P' },
];

function annotateToolsHTML(active: AnnotateTool, activeColor: string): string {
  return `
    <div style="margin-bottom:4px;">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;background:rgba(0,0,0,0.06);border-radius:7px;padding:3px;">
        ${ANNOTATE_TOOLS.map((t) => {
          const on = t.id === active;
          return `<button data-annotate-tool="${t.id}" title="${t.label} (${t.key})" style="
            padding:6px 0;border:none;border-radius:5px;cursor:pointer;font-family:inherit;
            font-size:10px;font-weight:500;letter-spacing:-0.01em;outline:none;
            background:${on ? '#fff' : 'transparent'};
            color:${on ? T.textPrimary : T.textSecondary};
            box-shadow:${on ? '0 1px 2px rgba(0,0,0,0.12)' : 'none'};
          ">${t.label}</button>`;
        }).join('')}
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;">
        ${ANNOTATE_COLORS.map((c) => {
          const on = c.hex.toLowerCase() === activeColor.toLowerCase();
          return `<button data-annotate-color="${c.hex}" title="${c.label}" aria-label="${c.label}" aria-pressed="${on}" style="
            width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,0.12);
            background:${c.hex};cursor:pointer;padding:0;outline:2px solid ${on ? '#000' : 'transparent'};
            outline-offset:1px;transform:${on ? 'scale(1.08)' : 'scale(1)'};
            transition:transform 0.12s ease, outline-color 0.12s ease;
          "></button>`;
        }).join('')}
      </div>
    </div>
  `;
}

const GUIDE_PLACEMENTS: { id: GuidePlacement; label: string; key: string }[] = [
  { id: 'both',       label: 'Both', key: 'C' },
  { id: 'horizontal', label: 'H only', key: 'H' },
  { id: 'vertical',   label: 'V only', key: 'V' },
];

const TAB_LAYOUT_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

function guidePlacementIndicatorLeft(index: number): string {
  return `calc(3px + ${index} * ((100% - 6px) / 3))`;
}

function guideToolsHTML(active: GuidePlacement): string {
  const idx = Math.max(0, GUIDE_PLACEMENTS.findIndex((t) => t.id === active));
  return `
    <div style="margin-bottom:4px;">
      <div data-guide-placement-bar style="
        position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:0;
        background:rgba(0,0,0,0.06);border-radius:7px;padding:3px;
      ">
        <div data-guide-placement-indicator style="
          position:absolute;top:3px;bottom:3px;
          width:calc((100% - 6px) / 3);left:${guidePlacementIndicatorLeft(idx)};
          background:#fff;border-radius:5px;
          box-shadow:0 1px 2px rgba(0,0,0,0.12);
          pointer-events:none;
          transition:left 0.22s ${TAB_LAYOUT_EASE};
        "></div>
        ${GUIDE_PLACEMENTS.map((t) => {
          const on = t.id === active;
          return `<button data-guide-placement="${t.id}" title="${t.label} (${t.key})" aria-pressed="${on}" style="
            position:relative;z-index:1;padding:6px 0;border:none;border-radius:5px;cursor:pointer;
            font-family:inherit;font-size:10px;font-weight:500;letter-spacing:-0.01em;outline:none;
            background:transparent;color:${on ? T.textPrimary : T.textSecondary};
            transition:color 0.22s ${TAB_LAYOUT_EASE};
          ">${t.label}</button>`;
        }).join('')}
      </div>
    </div>
  `;
}

function updateGuidePlacementUi(placement: GuidePlacement): void {
  if (!panelEl) return;
  const idx = Math.max(0, GUIDE_PLACEMENTS.findIndex((t) => t.id === placement));
  const indicator = panelEl.querySelector<HTMLElement>('[data-guide-placement-indicator]');
  if (indicator) {
    indicator.style.transition = prefersReducedMotion() ? 'none' : `left 0.22s ${TAB_LAYOUT_EASE}`;
    indicator.style.left = guidePlacementIndicatorLeft(idx);
  }
  panelEl.querySelectorAll<HTMLElement>('[data-guide-placement]').forEach((btn) => {
    const on = btn.dataset['guidePlacement'] === placement;
    btn.style.color = on ? T.textPrimary : T.textSecondary;
    btn.setAttribute('aria-pressed', String(on));
  });
}

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
let moreMenuOpen = false;
let allTokens: Token[]            = [];
let activeTokenFilter: TokenFilter = 'all';
let onDocPointerDown: ((e: MouseEvent) => void) | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendMsg(msg: Message): Promise<ExtensionState> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res: ExtensionState) => resolve(res));
  });
}

function getSettingValue(state: ExtensionState, id: string): boolean {
  switch (id) {
    case 'boxModel':    return state.showBoxModel;
    case 'guides':      return state.showGuides;
    case 'guideLabels': return state.showGuideLabels;
    case 'rulers':      return state.showRulers;
    case 'snap':        return state.snapToElements;
    default:            return false;
  }
}

function trayVisibleFor(mode: Mode): boolean {
  // Every mode has at least one setting; annotate/guides also show tool pickers.
  return Boolean(MODE_SETTINGS[mode]?.length) || mode === 'annotate' || mode === 'guides';
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

// ─── HTML builders ────────────────────────────────────────────────────────────

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

function settingRowHTML(def: SettingDef, checked: boolean, isLast: boolean): string {
  const border = isLast ? 'none' : `1px solid ${T.borderSubtle}`;
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:${border};">
      <span style="font-size:12px;color:${T.textSecondary};letter-spacing:-0.01em;">${def.label}</span>
      ${toggleHTML(def.id, checked)}
    </div>
  `;
}

function toolBtnStyle(active: boolean): string {
  return `
    position:relative;display:inline-flex;align-items:center;justify-content:center;
    width:26px;height:26px;padding:0;border:none;border-radius:6px;
    background:${active ? T.accentTint : 'transparent'};
    color:${active ? T.accent : T.textSecondary};
    cursor:pointer;font-family:inherit;outline:none;flex-shrink:0;
    transition:background 0.15s ease, color 0.15s ease;
  `;
}

function modeBtnHTML(id: Mode, label: string, shortcut: number, active: boolean): string {
  const icon = MODE_ICONS[id] ?? label;
  return `<button data-mode="${id}" title="${label} (${shortcut})" aria-pressed="${active}" style="${toolBtnStyle(active)}">
    ${icon}
    <span style="
      position:absolute;bottom:1px;right:2px;font-size:7px;font-weight:600;
      line-height:1;color:${active ? T.accent : T.textMuted};pointer-events:none;
      letter-spacing:-0.02em;
    ">${shortcut}</span>
  </button>`;
}

function actionBtnHTML(action: string, title: string, icon: string): string {
  return `<button data-action="${action}" title="${title}" style="${toolBtnStyle(false)}">${icon}</button>`;
}

function dividerHTML(): string {
  return `<div style="width:1px;height:16px;background:${T.border};margin:0 2px;flex-shrink:0;"></div>`;
}

function surfaceCSS(extra = ''): string {
  return `
    background:${T.bg};border:1px solid ${T.border};border-radius:12px;
    box-shadow:${T.shadow};${extra}
  `;
}

function trayContentHTML(state: ExtensionState): string {
  const settings = MODE_SETTINGS[state.mode] ?? [];
  const showAnnotate = state.mode === 'annotate';
  const showGuides = state.mode === 'guides';
  return `
    <div data-annotate-tools style="display:${showAnnotate ? 'block' : 'none'};margin-bottom:${showAnnotate ? '8px' : '0'};">
      ${annotateToolsHTML(
        showAnnotate ? getAnnotateTool() : 'measure',
        showAnnotate ? getAnnotateColor() : ANNOTATE_COLORS[0]!.hex,
      )}
    </div>
    <div data-guide-tools style="display:${showGuides ? 'block' : 'none'};margin-bottom:${showGuides ? '8px' : '0'};">
      ${guideToolsHTML(getGuidePlacement())}
    </div>
    <div data-settings-rows>
      ${settings.map((def, i) => settingRowHTML(def, getSettingValue(state, def.id), i === settings.length - 1)).join('')}
    </div>
  `;
}

function moreMenuHTML(): string {
  const item = `
    display:block;width:100%;text-align:left;padding:8px 12px;border:none;background:transparent;
    font-size:12px;font-weight:500;font-family:inherit;color:${T.textSecondary};
    cursor:pointer;outline:none;letter-spacing:-0.01em;
  `;
  return `
    <div data-more-menu style="
      display:none;position:absolute;top:calc(100% + 6px);right:0;z-index:2;
      min-width:180px;padding:4px 0;${surfaceCSS()}
    ">
      <button data-action="clear-guides" style="${item}">Clear guides</button>
      <button data-action="clear-measurements" style="${item}">Clear measurements</button>
      <button data-action="clear-annotations" style="${item}">Clear annotations</button>
      <div style="height:1px;background:${T.borderSubtle};margin:4px 0;"></div>
      <button data-action="tokens" style="${item}">Tokens</button>
      <div style="height:1px;background:${T.borderSubtle};margin:4px 0;"></div>
      <p style="font-size:10px;color:${T.textMuted};padding:6px 12px 8px;margin:0;letter-spacing:-0.01em;">
        <kbd style="font-size:9px;font-family:inherit;background:#f5f5f5;border:1px solid ${T.border};border-bottom-width:2px;border-radius:3px;padding:0 4px;color:${T.textSecondary};">?</kbd> for shortcuts
      </p>
    </div>
  `;
}

function buildPanelHTML(state: ExtensionState): string {
  const modes: { id: Mode; label: string; key: number }[] = [
    { id: 'inspect',     label: 'Inspect',  key: 1 },
    { id: 'measure',     label: 'Measure',  key: 2 },
    { id: 'guides',      label: 'Guides',   key: 3 },
    { id: 'colorpicker', label: 'Colours',  key: 4 },
    { id: 'spacing',     label: 'Spacing',  key: 5 },
    { id: 'annotate',    label: 'Annotate', key: 6 },
  ];

  const showTray = trayVisibleFor(state.mode);

  return `
    <style>${KEYFRAMES}</style>
    <div data-panel-root style="display:flex;flex-direction:column;align-items:stretch;gap:8px;">

      <!-- Unified popup card -->
      <div data-main-card style="
        position:relative;display:flex;flex-direction:column;
        width:100%;box-sizing:border-box;overflow:visible;${surfaceCSS()}
      ">
        <!-- Drag header (grip + brand) -->
        <div data-drag-handle title="Drag to move" style="
          display:flex;align-items:center;gap:8px;
          padding:10px 10px 8px 12px;cursor:grab;touch-action:none;
          -webkit-user-select:none;user-select:none;
        ">
          <span style="
            display:inline-flex;align-items:center;justify-content:center;
            width:18px;height:20px;color:${T.textMuted};flex-shrink:0;
            pointer-events:none;
          " aria-hidden="true">${GRIP_SVG}</span>
          <span style="
            display:inline-flex;align-items:center;gap:6px;
            color:${T.textPrimary};pointer-events:none;flex:1;min-width:0;
          ">
            <span style="display:inline-flex;opacity:0.85;">${LOGO_SVG}</span>
            <span style="font-size:12px;font-weight:600;letter-spacing:-0.03em;">Calipers</span>
          </span>
          <button data-action="close" title="Close" style="
            display:inline-flex;align-items:center;justify-content:center;
            width:28px;height:28px;padding:0;border:none;border-radius:7px;
            background:transparent;color:${T.textMuted};cursor:pointer;
            font-family:inherit;font-size:18px;line-height:1;outline:none;flex-shrink:0;
          ">×</button>
        </div>

        <div style="height:1px;background:${T.borderSubtle};margin:0 10px;flex-shrink:0;"></div>

        <!-- Mode + capture toolbar — single row, never wraps the ⋯ menu -->
        <div data-toolbar style="
          display:flex;align-items:center;gap:1px;padding:6px 6px;flex-wrap:nowrap;
        ">
          <div style="display:flex;align-items:center;gap:0;flex-shrink:0;">
            ${modes.map(({ id, label, key }) => modeBtnHTML(id, label, key, state.mode === id)).join('')}
          </div>

          ${dividerHTML()}

          <div style="display:flex;align-items:center;gap:0;flex-shrink:0;">
            ${actionBtnHTML('screenshot', 'Screenshot', SCREENSHOT_ICON)}
            ${actionBtnHTML('region', 'Region capture', REGION_ICON)}
          </div>

          ${dividerHTML()}

          <div style="position:relative;display:flex;align-items:center;flex-shrink:0;margin-left:auto;">
            <button data-action="toggle-more" title="More" aria-expanded="false" style="${toolBtnStyle(false)}">
              <span style="font-size:16px;line-height:1;font-weight:600;letter-spacing:0.02em;">⋯</span>
            </button>
            ${moreMenuHTML()}
          </div>
        </div>

        <!-- Contextual options / tools (inside the popup) -->
        <div data-tray style="
          display:${showTray ? 'block' : 'none'};
          padding:4px 14px 12px;border-top:1px solid ${T.borderSubtle};
        ">
          ${trayContentHTML(state)}
        </div>
      </div>

      <!-- Tokens card (lazy-filled) -->
      <div data-tokens-card style="
        display:none;width:${TOKENS_WIDTH}px;height:${TOKENS_VIEW_HEIGHT}px;
        overflow:hidden;${surfaceCSS()}
      "></div>

    </div>
  `;
}

// ─── DOM builder — tokens view (lazy) ────────────────────────────────────────

function buildTokensViewElement(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `width:100%;height:100%;display:flex;flex-direction:column;`;

  const btnBase = `
    background:none;border:1px solid ${T.border};border-radius:5px;
    font-size:10px;font-weight:500;font-family:inherit;letter-spacing:-0.01em;
    color:${T.textSecondary};cursor:pointer;outline:none;transition:background 0.12s;padding:4px 8px;
  `;

  el.innerHTML = `
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
    <div style="height:1px;background:${T.borderSubtle};flex-shrink:0;"></div>
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
    <div style="height:1px;background:${T.borderSubtle};flex-shrink:0;"></div>
    <div data-token-rows style="overflow-y:auto;flex:1;padding:4px 0;"></div>
  `;

  return el;
}

// ─── Partial DOM updates ──────────────────────────────────────────────────────

function setToolBtnActive(btn: HTMLElement, active: boolean): void {
  btn.style.background = active ? T.accentTint : 'transparent';
  btn.style.color = active ? T.accent : T.textSecondary;
  btn.setAttribute('aria-pressed', String(active));
  const badge = btn.querySelector<HTMLElement>('span');
  if (badge) badge.style.color = active ? T.accent : T.textMuted;
}

function updateModeOnly(mode: Mode): void {
  if (!panelEl) return;

  const prevBox = snapshotPanelBox();

  panelEl.querySelectorAll<HTMLElement>('[data-mode]').forEach((btn) => {
    setToolBtnActive(btn, btn.dataset['mode'] === mode);
  });

  const toolsWrap = panelEl.querySelector<HTMLElement>('[data-annotate-tools]');
  if (toolsWrap) {
    const on = mode === 'annotate';
    toolsWrap.style.display = on ? 'block' : 'none';
    toolsWrap.style.marginBottom = on ? '8px' : '0';
    if (on) toolsWrap.innerHTML = annotateToolsHTML(getAnnotateTool(), getAnnotateColor());
  }

  const guideTools = panelEl.querySelector<HTMLElement>('[data-guide-tools]');
  if (guideTools) {
    const on = mode === 'guides';
    guideTools.style.display = on ? 'block' : 'none';
    guideTools.style.marginBottom = on ? '8px' : '0';
    if (on) guideTools.innerHTML = guideToolsHTML(getGuidePlacement());
  }

  updateSettingRows(mode);
  updateTrayVisibility(mode);
  schedulePanelReadjust(prevBox);
}

function updateTrayVisibility(mode: Mode): void {
  if (!panelEl || currentView !== 'main') return;
  const tray = panelEl.querySelector<HTMLElement>('[data-tray]');
  if (!tray) return;
  tray.style.display = trayVisibleFor(mode) ? 'block' : 'none';
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

function updateSettingRows(mode: Mode): void {
  if (!panelEl) return;
  const rowsHost = panelEl.querySelector<HTMLElement>('[data-settings-rows]');
  if (!rowsHost) return;

  const settings = MODE_SETTINGS[mode];
  rowsHost.innerHTML = settings
    .map((def, i) => settingRowHTML(def, getSettingValue(localState, def.id), i === settings.length - 1))
    .join('');
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

// ─── More menu ────────────────────────────────────────────────────────────────

const MORE_MENU_GAP = 6;

function positionMoreMenu(menu: HTMLElement, btn: HTMLElement): void {
  // Reset so we measure the natural size, then pick a side that fits.
  menu.style.top = '';
  menu.style.bottom = '';
  menu.style.left = '';
  menu.style.right = '0';
  menu.style.display = 'block';

  const btnRect = btn.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;

  const spaceBelow = vh - btnRect.bottom - margin;
  const spaceAbove = btnRect.top - margin;
  const openUp =
    spaceBelow < menuRect.height + MORE_MENU_GAP &&
    spaceAbove > spaceBelow;

  if (openUp) {
    menu.style.top = 'auto';
    menu.style.bottom = `calc(100% + ${MORE_MENU_GAP}px)`;
  } else {
    menu.style.bottom = 'auto';
    menu.style.top = `calc(100% + ${MORE_MENU_GAP}px)`;
  }

  // Prefer right-aligned to the button; flip if it would overflow the left edge.
  const rightAlignedLeft = btnRect.right - menuRect.width;
  const leftAlignedLeft = btnRect.left;
  const openLeft =
    rightAlignedLeft < margin &&
    leftAlignedLeft + menuRect.width <= vw - margin;

  if (openLeft) {
    menu.style.right = 'auto';
    menu.style.left = '0';
  } else {
    menu.style.left = 'auto';
    menu.style.right = '0';
  }
}

function setMoreMenuOpen(open: boolean): void {
  if (!panelEl) return;
  moreMenuOpen = open;
  const menu = panelEl.querySelector<HTMLElement>('[data-more-menu]');
  const btn  = panelEl.querySelector<HTMLElement>('[data-action="toggle-more"]');
  if (menu) {
    if (open && btn) positionMoreMenu(menu, btn);
    else menu.style.display = 'none';
  }
  if (btn) {
    btn.setAttribute('aria-expanded', String(open));
    setToolBtnActive(btn, open);
  }
}

// ─── View switching (tokens card below toolbar) ───────────────────────────────

function switchView(view: 'main' | 'tokens'): void {
  if (!panelEl || currentView === view) return;

  const tray = panelEl.querySelector<HTMLElement>('[data-tray]');
  const card = panelEl.querySelector<HTMLElement>('[data-tokens-card]');
  if (!card) return;

  const prevBox = snapshotPanelBox();
  setMoreMenuOpen(false);

  if (view === 'tokens') {
    currentView = 'tokens';

    if (!card.firstElementChild) {
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
      card.appendChild(tokensEl);
    }

    allTokens = extractTokens();
    activeTokenFilter = 'all';
    renderTokenRows();
    updateTokenFilter('all');

    if (tray) tray.style.display = 'none';
    card.style.display = 'block';
  } else {
    currentView = 'main';
    card.style.display = 'none';
    updateTrayVisibility(localState.mode);
  }

  schedulePanelReadjust(prevBox);
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

function wireIconHover(btn: HTMLElement): void {
  btn.addEventListener('mouseenter', () => {
    if (btn.getAttribute('aria-pressed') === 'true' || btn.getAttribute('aria-expanded') === 'true') return;
    btn.style.background = 'rgba(0,0,0,0.05)';
    btn.style.color = T.textPrimary;
  });
  btn.addEventListener('mouseleave', () => {
    if (btn.getAttribute('aria-pressed') === 'true' || btn.getAttribute('aria-expanded') === 'true') {
      btn.style.background = T.accentTint;
      btn.style.color = T.accent;
      return;
    }
    btn.style.background = 'transparent';
    btn.style.color = T.textSecondary;
  });
}

function wireEvents(panel: HTMLElement): void {
  panel.querySelectorAll<HTMLElement>('[data-mode], [data-action="screenshot"], [data-action="region"], [data-action="toggle-more"]').forEach(wireIconHover);

  const closeBtn = panel.querySelector<HTMLElement>('[data-action="close"]');
  if (closeBtn) {
    wireHover(
      closeBtn,
      { background: 'rgba(0,0,0,0.06)', color: T.textPrimary },
      { background: 'transparent', color: T.textMuted },
    );
  }

  panel.querySelectorAll<HTMLElement>('[data-action="clear-guides"],[data-action="clear-measurements"],[data-action="clear-annotations"],[data-action="tokens"]').forEach((btn) => {
    wireHover(btn, { background: 'rgba(0,0,0,0.04)', color: T.textPrimary }, { background: 'transparent', color: T.textSecondary });
  });

  // Close more menu on outside click
  onDocPointerDown = (e: MouseEvent): void => {
    if (!moreMenuOpen || !panelEl) return;
    const el = e.target as HTMLElement;
    if (el.closest('[data-action="toggle-more"]') || el.closest('[data-more-menu]')) return;
    setMoreMenuOpen(false);
  };
  document.addEventListener('mousedown', onDocPointerDown);

  panel.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    if (target.closest('[data-action="close"]'))        { hidePanel(); return; }
    if (target.closest('[data-action="back-to-main"]')) { switchView('main'); return; }

    if (target.closest('[data-action="toggle-more"]')) {
      setMoreMenuOpen(!moreMenuOpen);
      return;
    }

    if (target.closest('[data-action="screenshot"]')) {
      const btn = panel.querySelector<HTMLElement>('[data-action="screenshot"]');
      if (btn) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'default';
        btn.setAttribute('aria-busy', 'true');
      }
      const res = await new Promise<{ ok?: boolean; error?: string }>((resolve) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (r) => {
          const err = chrome.runtime.lastError?.message;
          if (err) resolve({ error: err });
          else resolve((r as { ok?: boolean; error?: string }) ?? { ok: true });
        });
      });
      if (btn) {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.removeAttribute('aria-busy');
      }
      if (res.error) {
        showErrorReport('Screenshot', res.error);
      } else {
        showToast('Screenshot saved');
      }
      return;
    }

    if (target.closest('[data-action="tokens"]')) {
      setMoreMenuOpen(false);
      switchView('tokens');
      return;
    }
    if (target.closest('[data-action="export-tokens"]')) { exportTokensJson(); return; }

    if (target.closest('[data-action="region"]')) {
      startRegionCapture();
      return;
    }

    if (target.closest('[data-action="clear-guides"]')) {
      setMoreMenuOpen(false);
      clearGuides();
      showToast('Guides cleared');
      return;
    }

    if (target.closest('[data-action="clear-measurements"]')) {
      setMoreMenuOpen(false);
      clearMeasurements();
      return;
    }

    if (target.closest('[data-action="clear-annotations"]')) {
      setMoreMenuOpen(false);
      clearAnnotations();
      return;
    }

    const annToolBtn = target.closest('[data-annotate-tool]') as HTMLElement | null;
    if (annToolBtn) {
      const tool = annToolBtn.dataset['annotateTool'] as AnnotateTool;
      setAnnotateTool(tool);
      const wrap = panel.querySelector<HTMLElement>('[data-annotate-tools]');
      if (wrap) wrap.innerHTML = annotateToolsHTML(tool, getAnnotateColor());
      return;
    }

    const annColorBtn = target.closest('[data-annotate-color]') as HTMLElement | null;
    if (annColorBtn) {
      const hex = annColorBtn.dataset['annotateColor'];
      if (hex) {
        setAnnotateColor(hex);
        const wrap = panel.querySelector<HTMLElement>('[data-annotate-tools]');
        if (wrap) wrap.innerHTML = annotateToolsHTML(getAnnotateTool(), hex);
      }
      return;
    }

    const placeBtn = target.closest('[data-guide-placement]') as HTMLElement | null;
    if (placeBtn) {
      const placement = placeBtn.dataset['guidePlacement'] as GuidePlacement;
      if (placement) {
        setGuidePlacement(placement);
        updateGuidePlacementUi(placement);
      }
      return;
    }

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
        case 'guideLabels': {
          const next = !localState.showGuideLabels;
          localState = await sendMsg({ type: 'TOGGLE_GUIDE_LABELS', enabled: next });
          localState.showGuideLabels = next;
          updateToggleOnly('guideLabels', next);
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

// ─── Drag / position ──────────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function defaultPanelPosition(panelW: number, _panelH: number): PanelPosition {
  return {
    left: Math.max(PANEL_INSET, Math.round((window.innerWidth - panelW) / 2)),
    top:  PANEL_INSET,
  };
}

function clampPanelPosition(left: number, top: number, w: number, h: number): PanelPosition {
  const maxL = Math.max(PANEL_MARGIN, window.innerWidth - w - PANEL_MARGIN);
  const maxT = Math.max(PANEL_MARGIN, window.innerHeight - h - PANEL_MARGIN);
  return {
    left: Math.min(Math.max(PANEL_MARGIN, left), maxL),
    top:  Math.min(Math.max(PANEL_MARGIN, top),  maxT),
  };
}

interface PanelBox {
  left: number;
  top: number;
  w: number;
  h: number;
}

function snapshotPanelBox(): PanelBox | null {
  if (!panelEl) return null;
  const left = parseFloat(panelEl.style.left);
  const top = parseFloat(panelEl.style.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return {
    left,
    top,
    w: panelEl.offsetWidth,
    h: panelEl.offsetHeight,
  };
}

/**
 * After the panel grows/shrinks (mode switch, tokens view), keep the
 * PANEL_INSET from the viewport. Mode changes only grow height — re-anchor
 * top/bottom edges so a bottom-docked panel stays inset when it gets taller.
 * Horizontal position is left alone unless width actually changed.
 */
function readjustPanelForSizeChange(prev: PanelBox | null): void {
  if (!panelEl || !prev) return;

  const w = panelEl.offsetWidth;
  const h = panelEl.offsetHeight;
  const maxLPrev = Math.max(PANEL_INSET, window.innerWidth - prev.w - PANEL_INSET);
  const maxTPrev = Math.max(PANEL_INSET, window.innerHeight - prev.h - PANEL_INSET);
  const edgeSlop = 2;

  const stickLeft = prev.left <= PANEL_INSET + edgeSlop;
  const stickRight = prev.left >= maxLPrev - edgeSlop;
  const stickTop = prev.top <= PANEL_INSET + edgeSlop;
  const stickBottom = prev.top >= maxTPrev - edgeSlop;

  let left = prev.left;
  let top = prev.top;

  // Width is fixed for mode switches — only re-anchor horizontally if it changed
  // (e.g. window resize) or we were already edge-docked and must preserve inset.
  if (w !== prev.w || stickRight || stickLeft) {
    if (stickRight) left = window.innerWidth - w - PANEL_INSET;
    else if (stickLeft) left = PANEL_INSET;
  }

  if (stickBottom) top = window.innerHeight - h - PANEL_INSET;
  else if (stickTop) top = PANEL_INSET;

  const target = clampPanelPosition(left, top, w, h);
  const curL = parseFloat(panelEl.style.left);
  const curT = parseFloat(panelEl.style.top);
  if (!Number.isFinite(curL) || !Number.isFinite(curT)) {
    applyPanelPosition(panelEl, target);
    return;
  }

  if (Math.abs(target.left - curL) > 1 || Math.abs(target.top - curT) > 1) {
    animatePanelTo(panelEl, target);
  }
}

/** Wait for layout after DOM/size changes, then edge-aware readjust. */
function schedulePanelReadjust(prev: PanelBox | null): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => readjustPanelForSizeChange(prev));
  });
}

function cornerPositions(w: number, h: number): PanelPosition[] {
  const maxL = Math.max(PANEL_MARGIN, window.innerWidth - w - PANEL_MARGIN);
  const maxT = Math.max(PANEL_MARGIN, window.innerHeight - h - PANEL_MARGIN);
  return [
    { left: PANEL_MARGIN, top: PANEL_MARGIN }, // top-left
    { left: maxL,         top: PANEL_MARGIN }, // top-right
    { left: PANEL_MARGIN, top: maxT },         // bottom-left
    { left: maxL,         top: maxT },         // bottom-right
  ];
}

function nearestCorner(left: number, top: number, w: number, h: number): { corner: PanelPosition; dist: number } {
  let best = cornerPositions(w, h)[0]!;
  let bestDist = Infinity;
  for (const c of cornerPositions(w, h)) {
    const d = Math.hypot(c.left - left, c.top - top);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { corner: best, dist: bestDist };
}

function applyPanelPosition(panel: HTMLElement, pos: PanelPosition): void {
  const clamped = clampPanelPosition(pos.left, pos.top, panel.offsetWidth || PANEL_WIDTH, panel.offsetHeight || 48);
  panel.style.left = `${clamped.left}px`;
  panel.style.top  = `${clamped.top}px`;
  panel.style.right = 'auto';
}

/** iOS-style rubber-band: overflow past an edge resists more the further you go. */
function rubberbandOverflow(overflow: number, dimension = RUBBER_DIM, constant = RUBBER_CONSTANT): number {
  if (overflow <= 0) return 0;
  return (overflow * dimension * constant) / (dimension + constant * overflow);
}

/** Map a raw (unclamped) position into viewport with springy edge resistance. */
function rubberbandAxis(raw: number, min: number, max: number): number {
  if (raw < min) return min - rubberbandOverflow(min - raw);
  if (raw > max) return max + rubberbandOverflow(raw - max);
  return raw;
}

function rubberbandPanelPosition(left: number, top: number, w: number, h: number): PanelPosition {
  const maxL = Math.max(PANEL_MARGIN, window.innerWidth - w - PANEL_MARGIN);
  const maxT = Math.max(PANEL_MARGIN, window.innerHeight - h - PANEL_MARGIN);
  return {
    left: rubberbandAxis(left, PANEL_MARGIN, maxL),
    top:  rubberbandAxis(top, PANEL_MARGIN, maxT),
  };
}

let activePanelSpring: { cancel: () => void } | null = null;

function cancelPanelSpring(): void {
  activePanelSpring?.cancel();
  activePanelSpring = null;
}

/**
 * Physics spring to a target. Pass release velocity (px/ms) so flicks feel continuous.
 * Light underdamping = subtle springiness at edges/corners.
 */
function springPanelTo(
  panel: HTMLElement,
  target: PanelPosition,
  velocity: { vx: number; vy: number } = { vx: 0, vy: 0 },
): void {
  cancelPanelSpring();
  clearSnapTransition(panel);

  const clamped = clampPanelPosition(
    target.left,
    target.top,
    panel.offsetWidth || PANEL_WIDTH,
    panel.offsetHeight || 48,
  );

  if (prefersReducedMotion()) {
    applyPanelPosition(panel, clamped);
    savePanelPosition(clamped);
    return;
  }

  let x = parseFloat(panel.style.left) || 0;
  let y = parseFloat(panel.style.top) || 0;
  // px/ms → px/s for integration in seconds
  let vx = velocity.vx * 1000;
  let vy = velocity.vy * 1000;
  let last = performance.now();
  let raf = 0;
  let cancelled = false;

  const tick = (now: number): void => {
    if (cancelled) return;
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;

    const ax = SPRING_STIFFNESS * (clamped.left - x) - SPRING_DAMPING * vx;
    const ay = SPRING_STIFFNESS * (clamped.top - y) - SPRING_DAMPING * vy;
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;

    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = 'auto';

    const settled =
      Math.hypot(clamped.left - x, clamped.top - y) < 0.6 &&
      Math.hypot(vx, vy) < 12;

    if (settled) {
      applyPanelPosition(panel, clamped);
      savePanelPosition(clamped);
      activePanelSpring = null;
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  activePanelSpring = {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    },
  };
  raf = requestAnimationFrame(tick);
}

function clearSnapTransition(panel: HTMLElement): void {
  panel.style.transition = '';
}

function animatePanelTo(panel: HTMLElement, target: PanelPosition): void {
  springPanelTo(panel, target);
}

/**
 * Decide free-drop vs corner snap from release position + flick velocity.
 * Soft magnet near corners; a strong flick commits to the corner in that direction.
 */
function resolveDropPosition(
  left: number,
  top: number,
  w: number,
  h: number,
  vx: number,
  vy: number,
): PanelPosition {
  const clamped = clampPanelPosition(left, top, w, h);
  const speed = Math.hypot(vx, vy);
  const { corner: nearest, dist } = nearestCorner(clamped.left, clamped.top, w, h);

  // Gentle release near a corner → magnet
  if (dist <= CORNER_MAGNET_PX) return nearest;

  // Strong flick → project ahead and snap to the corner that throw aims at
  if (speed >= CORNER_FLICK_VX) {
    const projected = clampPanelPosition(
      clamped.left + vx * 180,
      clamped.top  + vy * 180,
      w,
      h,
    );
    return nearestCorner(projected.left, projected.top, w, h).corner;
  }

  return clamped;
}

function onPanelViewportResize(): void {
  if (!panelEl) return;
  const prev = snapshotPanelBox();
  if (!prev) return;
  // Instant clamp on window resize — no size-change anchor needed beyond clamp,
  // but preserve edge stickiness when the window shrinks under a corner-docked panel.
  readjustPanelForSizeChange(prev);
}

function midTouch(touches: TouchList): { x: number; y: number } {
  const a = touches[0]!;
  const b = touches[1]!;
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function wireDrag(panel: HTMLElement): void {
  const handle = panel.querySelector<HTMLElement>('[data-drag-handle]');
  if (!handle) return;

  type Sample = { x: number; y: number; t: number };
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let samples: Sample[] = [];

  const velocity = (): { vx: number; vy: number } => {
    if (samples.length < 2) return { vx: 0, vy: 0 };
    const latest = samples[samples.length - 1]!;
    // Look back ~80ms for a stable flick reading
    let earlier = samples[0]!;
    for (let i = samples.length - 2; i >= 0; i--) {
      const s = samples[i]!;
      if (latest.t - s.t >= 80) { earlier = s; break; }
      earlier = s;
    }
    const dt = Math.max(1, latest.t - earlier.t);
    return {
      vx: (latest.x - earlier.x) / dt,
      vy: (latest.y - earlier.y) / dt,
    };
  };

  const beginDrag = (x: number, y: number): void => {
    dragging = true;
    cancelPanelSpring();
    clearSnapTransition(panel);
    const rect = panel.getBoundingClientRect();
    startX = x;
    startY = y;
    originLeft = rect.left;
    originTop  = rect.top;
    samples = [{ x, y, t: performance.now() }];
    panel.style.left = `${originLeft}px`;
    panel.style.top = `${originTop}px`;
    panel.style.right = 'auto';
    handle.style.cursor = 'grabbing';
  };

  const moveDrag = (x: number, y: number): void => {
    if (!dragging) return;
    const rawLeft = originLeft + (x - startX);
    const rawTop = originTop + (y - startY);
    const next = rubberbandPanelPosition(
      rawLeft,
      rawTop,
      panel.offsetWidth,
      panel.offsetHeight,
    );
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    samples.push({ x, y, t: performance.now() });
    if (samples.length > 8) samples.shift();
  };

  const endDrag = (): void => {
    if (!dragging) return;
    dragging = false;
    handle.style.cursor = 'grab';

    const left = parseFloat(panel.style.left);
    const top  = parseFloat(panel.style.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return;

    const { vx, vy } = velocity();
    const target = resolveDropPosition(
      left, top, panel.offsetWidth, panel.offsetHeight, vx, vy,
    );

    const needsSpring =
      Math.abs(target.left - left) > 0.5 ||
      Math.abs(target.top - top) > 0.5 ||
      Math.hypot(vx, vy) >= 0.08;

    if (needsSpring) {
      springPanelTo(panel, target, { vx, vy });
    } else {
      savePanelPosition({ left: target.left, top: target.top });
    }
  };

  // ── Mouse / trackpad: drag by header grip / brand ─────────────────────────
  handle.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;
    // Don't start a drag from interactive controls in the header
    if ((e.target as HTMLElement).closest('button, a, input, [data-action]')) return;
    e.preventDefault();
    beginDrag(e.clientX, e.clientY);

    const onMove = (ev: MouseEvent): void => moveDrag(ev.clientX, ev.clientY);
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      endDrag();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // ── Touch: one-finger on handle, or two-finger anywhere on the panel ──────
  handle.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest('button, a, input, [data-action]')) return;
    const t = e.touches[0]!;
    beginDrag(t.clientX, t.clientY);
  }, { passive: true });

  panel.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const mid = midTouch(e.touches);
    beginDrag(mid.x, mid.y);
  }, { passive: false });

  panel.addEventListener('touchmove', (e: TouchEvent) => {
    if (!dragging) return;
    if (e.touches.length >= 2) {
      e.preventDefault();
      const mid = midTouch(e.touches);
      moveDrag(mid.x, mid.y);
    } else if (e.touches.length === 1) {
      const t = e.touches[0]!;
      moveDrag(t.clientX, t.clientY);
    }
  }, { passive: false });

  panel.addEventListener('touchend', (e: TouchEvent) => {
    if (!dragging) return;
    // End when fewer than the gesture requires remain
    if (e.touches.length === 0) endDrag();
  });

  panel.addEventListener('touchcancel', () => {
    if (dragging) endDrag();
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

  // Position before paint: saved spot, or default top-center
  const saved = await loadPanelPosition();
  const initial = saved ?? defaultPanelPosition(PANEL_WIDTH, 48);
  panel.style.left = `${initial.left}px`;
  panel.style.top  = `${initial.top}px`;

  document.documentElement.appendChild(panel);
  panelEl = panel;

  // Re-clamp / recenter now that real width is known
  if (saved) {
    applyPanelPosition(panel, {
      left: parseFloat(panel.style.left),
      top:  parseFloat(panel.style.top),
    });
  } else {
    applyPanelPosition(panel, defaultPanelPosition(panel.offsetWidth, panel.offsetHeight));
  }

  wireEvents(panel);
  wireDrag(panel);
  window.addEventListener('resize', onPanelViewportResize);

  requestAnimationFrame(() => {
    if (!panelEl) return;
    if (!saved) {
      applyPanelPosition(panelEl, defaultPanelPosition(panelEl.offsetWidth, panelEl.offsetHeight));
    } else {
      applyPanelPosition(panelEl, {
        left: parseFloat(panelEl.style.left),
        top:  parseFloat(panelEl.style.top),
      });
    }
  });
}

export function hidePanel(): void {
  if (!panelEl) return;

  cancelPanelSpring();
  void sendMsg({ type: 'DEACTIVATE' });

  currentView       = 'main';
  moreMenuOpen      = false;
  activeTokenFilter = 'all';

  if (onDocPointerDown) {
    document.removeEventListener('mousedown', onDocPointerDown);
    onDocPointerDown = null;
  }
  window.removeEventListener('resize', onPanelViewportResize);

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
