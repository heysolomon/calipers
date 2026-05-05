/**
 * Design token panel — reads CSS custom properties (--var: value) from the
 * inspected page and presents them in a floating panel with copy & export.
 * Toggled with the 'D' key.
 */
import { copyToClipboard } from './utils';
import { showToast } from './labels';

interface Token {
  name:  string;
  value: string;
  type:  'color' | 'spacing' | 'font' | 'other';
}

interface PanelState {
  el:      HTMLDivElement | null;
  visible: boolean;
  tokens:  Token[];
}

const state: PanelState = { el: null, visible: false, tokens: [] };

// ─── Token extraction ─────────────────────────────────────────────────────────

function classifyToken(name: string, value: string): Token['type'] {
  const n = name.toLowerCase();
  const v = value.trim();
  if (/color|colour|bg|background|fill|stroke|shadow/.test(n)) return 'color';
  if (/^#[0-9a-f]{3,8}$/i.test(v) || /^rgb|hsl/.test(v)) return 'color';
  if (/spacing|gap|margin|padding|size|width|height|radius/.test(n)) return 'spacing';
  if (/^-?[\d.]+px$/.test(v) || /^-?[\d.]+rem$/.test(v)) return 'spacing';
  if (/font|text|type|weight|line/.test(n)) return 'font';
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

// ─── Panel DOM ────────────────────────────────────────────────────────────────

const PANEL_STYLE = `
  position: fixed;
  top: 24px;
  right: 16px;
  z-index: 2147483647;
  pointer-events: all;
  user-select: none;
  font-family: 'Neue Plak Text', Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 12px;
  background: rgba(15,15,18,0.97);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.55);
  width: 280px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
`;

const TYPE_COLORS: Record<Token['type'], string> = {
  color:   '#FF6B6B',
  spacing: '#4ECDC4',
  font:    '#A8E063',
  other:   'rgba(255,255,255,0.35)',
};

function buildPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.id = 'calipers-token-panel';
  panel.setAttribute('style', PANEL_STYLE);

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px 8px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  `;

  const title = document.createElement('span');
  title.style.cssText = 'color:rgba(255,255,255,0.8);font-weight:600;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;';
  title.textContent = 'Design Tokens';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:6px;align-items:center;';

  const countBadge = document.createElement('span');
  countBadge.id = 'calipers-token-count';
  countBadge.style.cssText = 'color:rgba(255,255,255,0.3);font-size:10px;';

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export JSON';
  exportBtn.style.cssText = `
    padding: 2px 8px; border-radius: 4px; border: none; cursor: pointer;
    font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
    background: rgba(255,69,0,0.15); color: #FF4500;
  `;
  exportBtn.addEventListener('click', exportTokensJson);

  actions.appendChild(countBadge);
  actions.appendChild(exportBtn);
  header.appendChild(title);
  header.appendChild(actions);
  panel.appendChild(header);

  // Filter tabs
  const tabs = document.createElement('div');
  tabs.id = 'calipers-token-tabs';
  tabs.style.cssText = 'display:flex;gap:4px;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;';
  (['all', 'color', 'spacing', 'font', 'other'] as const).forEach((t) => {
    const btn = document.createElement('button');
    btn.textContent = t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1);
    btn.dataset['filter'] = t;
    btn.style.cssText = `
      flex:1; padding:3px 0; border-radius:4px; border:none; cursor:pointer;
      font-size:10px; font-weight:600; letter-spacing:0.03em;
      background: ${t === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent'};
      color: ${t === 'all' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'};
    `;
    btn.addEventListener('click', () => {
      tabs.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
        const active = b.dataset['filter'] === t;
        b.style.background = active ? 'rgba(255,255,255,0.1)' : 'transparent';
        b.style.color      = active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)';
      });
      renderRows(t);
    });
    tabs.appendChild(btn);
  });
  panel.appendChild(tabs);

  // Scroll area
  const scroll = document.createElement('div');
  scroll.id = 'calipers-token-rows';
  scroll.style.cssText = 'overflow-y:auto;flex:1;padding:4px 0;';
  panel.appendChild(scroll);

  return panel;
}

function renderRows(filter: 'all' | Token['type'] = 'all'): void {
  const scroll = state.el?.querySelector('#calipers-token-rows') as HTMLDivElement | null;
  const countEl = state.el?.querySelector('#calipers-token-count') as HTMLSpanElement | null;
  if (!scroll) return;

  const filtered = filter === 'all' ? state.tokens : state.tokens.filter((t) => t.type === filter);
  if (countEl) countEl.textContent = `${filtered.length}`;

  scroll.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:rgba(255,255,255,0.25);font-size:11px;text-align:center;padding:16px 0;';
    empty.textContent = 'No tokens found';
    scroll.appendChild(empty);
    return;
  }

  for (const token of filtered) {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;
    `;
    row.title = 'Click to copy value';

    // Color swatch or type indicator
    const swatch = document.createElement('span');
    swatch.style.cssText = `width:14px;height:14px;border-radius:3px;flex-shrink:0;border:1px solid rgba(255,255,255,0.12);`;
    if (token.type === 'color') {
      swatch.style.background = token.value;
    } else {
      swatch.style.background = TYPE_COLORS[token.type];
      swatch.style.opacity = '0.35';
    }

    const info = document.createElement('span');
    info.style.cssText = 'flex:1;overflow:hidden;min-width:0;';

    const name = document.createElement('div');
    name.style.cssText = `color:${TYPE_COLORS[token.type]};font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:0.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
    name.textContent = token.name;

    const value = document.createElement('div');
    value.style.cssText = 'color:rgba(255,255,255,0.55);font-family:"JetBrains Mono",monospace;font-size:10px;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    value.textContent = token.value;

    info.appendChild(name);
    info.appendChild(value);
    row.appendChild(swatch);
    row.appendChild(info);

    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.04)'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });
    row.addEventListener('click', async () => {
      await copyToClipboard(token.value);
      showToast(`Copied ${token.name}`);
    });

    scroll.appendChild(row);
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportTokensJson(): void {
  const obj: Record<string, string> = {};
  for (const t of state.tokens) obj[t.name] = t.value;
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `design-tokens-${Date.now()}.json`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported tokens.json');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function toggleTokenPanel(): void {
  if (state.visible) {
    hideTokenPanel();
  } else {
    showTokenPanel();
  }
}

export function showTokenPanel(): void {
  if (state.el) { state.el.remove(); state.el = null; }
  state.tokens  = extractTokens();
  const panel   = buildPanel();
  document.documentElement.appendChild(panel);
  state.el      = panel;
  state.visible = true;
  renderRows('all');
}

export function hideTokenPanel(): void {
  state.el?.remove();
  state.el      = null;
  state.visible = false;
}

export function isTokenPanel(el: Element | null): boolean {
  return !!el?.closest?.('#calipers-token-panel');
}
