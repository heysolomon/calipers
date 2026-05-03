/**
 * Keyboard shortcuts reference panel — a centred glassmorphic overlay
 * toggled with the `?` key while Calipers is active.
 */

const PANEL_ID = 'calipers-shortcuts-panel';

// ─── Styles ───────────────────────────────────────────────────────────────────

const BACKDROP_CSS = `
  position: fixed;
  inset: 0;
  z-index: 2147483645;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PANEL_CSS = `
  background: rgba(12, 14, 20, 0.95);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 14px;
  padding: 20px 22px 18px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03);
  font-family: 'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: rgba(255,255,255,0.85);
  width: 380px;
  max-width: calc(100vw - 32px);
  pointer-events: all;
  user-select: none;
  animation: calipers-shortcuts-in 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both;
`;

const KEYFRAME_CSS = `
  @keyframes calipers-shortcuts-in {
    from { opacity: 0; transform: scale(0.92) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);   }
  }
`;

// ─── HTML builder ─────────────────────────────────────────────────────────────

function kbd(keys: string[]): string {
  return keys
    .map(
      (k) => `<span style="
        display:inline-flex;align-items:center;justify-content:center;
        background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);
        border-bottom-width:2px;border-radius:5px;
        padding:2px 7px;min-width:22px;height:22px;
        font-size:11px;font-weight:500;letter-spacing:0.01em;
        color:rgba(255,255,255,0.8);font-family:inherit;line-height:1;
        white-space:nowrap;
      ">${k}</span>`,
    )
    .join('<span style="color:rgba(255,255,255,0.2);font-size:10px;margin:0 3px;">+</span>');
}

function row(keys: string[], label: string): string {
  return `
    <div style="
      display:flex;align-items:center;justify-content:space-between;
      padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);
    ">
      <span style="font-size:12px;color:rgba(255,255,255,0.5);">${label}</span>
      <div style="display:flex;align-items:center;gap:3px;">${kbd(keys)}</div>
    </div>
  `;
}

function section(title: string, rows: string): string {
  return `
    <div style="margin-top:14px;">
      <div style="
        font-size:9px;font-weight:600;letter-spacing:0.1em;
        color:rgba(255,255,255,0.22);text-transform:uppercase;
        margin-bottom:4px;
      ">${title}</div>
      ${rows}
    </div>
  `;
}

function buildHTML(): string {
  return `
    <style>${KEYFRAME_CSS}</style>

    <div style="
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:4px;
    ">
      <span style="
        font-size:11px;font-weight:600;letter-spacing:0.08em;
        color:rgba(255,255,255,0.3);text-transform:uppercase;
      ">Keyboard Shortcuts</span>
      <span style="
        font-size:10px;color:rgba(255,255,255,0.2);
        border:1px solid rgba(255,255,255,0.1);border-radius:4px;
        padding:2px 6px;letter-spacing:0.04em;
      ">Press ? to close</span>
    </div>

    ${section('Modes', `
      ${row(['1'], 'Inspect — hover to measure elements')}
      ${row(['2'], 'Measure — click two elements to compare')}
      ${row(['3'], 'Guides — crosshair + pin guide lines')}
    `)}

    ${section('Inspect Mode', `
      ${row(['B'], 'Toggle box model overlay')}
      ${row(['Click'], 'Show box model detail panel')}
    `)}

    ${section('Guides Mode', `
      ${row(['Click'], 'Pin crosshair as guide lines')}
      ${row(['Del'], 'Clear all pinned guides')}
      ${row(['Right-click'], 'Remove a single guide')}
    `)}

    ${section('General', `
      ${row(['S'], 'Capture screenshot')}
      ${row(['?'], 'Show / hide shortcuts')}
      ${row(['Esc'], 'Close Calipers')}
    `)}
  `;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function showShortcutsPanel(): void {
  if (document.getElementById(PANEL_ID)) return;

  const backdrop = document.createElement('div');
  backdrop.id = PANEL_ID;
  backdrop.setAttribute('style', BACKDROP_CSS);

  const panel = document.createElement('div');
  panel.setAttribute('style', PANEL_CSS);
  panel.innerHTML = buildHTML();

  backdrop.appendChild(panel);
  document.documentElement.appendChild(backdrop);

  // Click on backdrop (outside panel) to dismiss
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) hideShortcutsPanel();
  });
}

export function hideShortcutsPanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}

export function toggleShortcutsPanel(): void {
  if (document.getElementById(PANEL_ID)) {
    hideShortcutsPanel();
  } else {
    showShortcutsPanel();
  }
}

export function isShortcutsPanelOpen(): boolean {
  return document.getElementById(PANEL_ID) !== null;
}
