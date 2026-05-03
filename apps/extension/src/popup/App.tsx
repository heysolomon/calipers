import React, { useCallback, useEffect, useState } from 'react';
import type { ExtensionState, Mode } from '@calipers/shared';
import { DEFAULT_STATE } from '@calipers/shared';

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: 'relative',
        width: '30px',
        height: '17px',
        borderRadius: '9px',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--accent)' : 'rgba(0,0,0,0.12)',
        transition: 'background 0.2s var(--spring-settle)',
        outline: 'none',
        flexShrink: 0,
        opacity: disabled ? 0.35 : 1,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '15px' : '2px',
          width: '13px',
          height: '13px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
          transition: 'left 0.22s var(--spring-bounce)',
        }}
      />
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 -16px' }} />;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const MODES: { id: Mode; label: string }[] = [
  { id: 'inspect', label: 'Inspect' },
  { id: 'measure', label: 'Measure' },
  { id: 'guides',  label: 'Guides'  },
];

export default function App() {
  const [extState, setExtState] = useState<ExtensionState>({ ...DEFAULT_STATE });
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res: ExtensionState) => {
      if (res) setExtState(res);
      setLoading(false);
    });
  }, []);

  const sendMsg = useCallback(
    (msg: Record<string, unknown>) =>
      new Promise<ExtensionState>((resolve) => {
        chrome.runtime.sendMessage(msg, (res: ExtensionState) => resolve(res));
      }),
    [],
  );

  const handleToggleActive = useCallback(async () => {
    const next = await sendMsg(
      extState.active ? { type: 'DEACTIVATE' } : { type: 'ACTIVATE', mode: extState.mode },
    );
    setExtState(next);
  }, [extState.active, extState.mode, sendMsg]);

  const handleModeChange = useCallback(
    async (mode: Mode) => {
      const msg = extState.active ? { type: 'SWITCH_MODE', mode } : { type: 'ACTIVATE', mode };
      const next = await sendMsg(msg);
      setExtState({ ...next, active: true, mode });
    },
    [extState.active, sendMsg],
  );

  const handleBoxModel = useCallback(
    async (enabled: boolean) => {
      const next = await sendMsg({ type: 'TOGGLE_BOX_MODEL', enabled });
      setExtState({ ...extState, ...next, showBoxModel: enabled });
    },
    [extState, sendMsg],
  );

  const handleGuides = useCallback(
    async (enabled: boolean) => {
      const next = await sendMsg({ type: 'TOGGLE_GUIDES', enabled });
      setExtState({ ...extState, ...next, showGuides: enabled });
    },
    [extState, sendMsg],
  );

  const handleSnap = useCallback(
    async (enabled: boolean) => {
      const next = await sendMsg({ type: 'TOGGLE_SNAP', enabled });
      setExtState({ ...extState, ...next, snapToElements: enabled });
    },
    [extState, sendMsg],
  );

  const handleScreenshot = useCallback(async () => {
    setBusy(true);
    await sendMsg({ type: 'CAPTURE_SCREENSHOT' });
    setTimeout(() => setBusy(false), 1200);
  }, [sendMsg]);

  if (loading) {
    return (
      <div style={{
        width: '260px', height: '72px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', color: 'var(--text-muted)',
      }}>
        Loading…
      </div>
    );
  }

  const settings: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }[] = [
    { label: 'Box model',         checked: extState.showBoxModel,    onChange: handleBoxModel, disabled: extState.mode !== 'inspect' },
    { label: 'Show guides',       checked: extState.showGuides,      onChange: handleGuides },
    { label: 'Snap to elements',  checked: extState.snapToElements,  onChange: handleSnap },
  ];

  return (
    <div style={{ padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{
            display: 'inline-block',
            width: '6px', height: '6px', borderRadius: '50%',
            background: extState.active ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'background 0.2s',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Calipers
          </span>
        </div>
        <Toggle checked={extState.active} onChange={handleToggleActive} />
      </div>

      <Divider />

      {/* ── Mode selector ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '-1px' }}>
        {MODES.map(({ id, label }) => {
          const active = extState.mode === id;
          return (
            <button
              key={id}
              onClick={() => handleModeChange(id)}
              style={{
                flex: 1,
                padding: '7px 0 9px',
                background: 'none',
                border: 'none',
                borderBottom: active ? '1.5px solid var(--text-primary)' : '1.5px solid transparent',
                marginBottom: '-1px',
                fontSize: '12px',
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'color 0.15s, border-color 0.15s',
                outline: 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Divider />

      {/* ── Settings ── */}
      <div>
        <p style={{
          fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px',
        }}>
          Settings
        </p>
        <div>
          {settings.map(({ label, checked, onChange, disabled }, i) => (
            <div
              key={label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 0',
                borderBottom: i < settings.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <span style={{
                fontSize: '12px',
                color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
                letterSpacing: '-0.01em',
              }}>
                {label}
              </span>
              <Toggle checked={checked} onChange={onChange} disabled={disabled} />
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── Screenshot ── */}
      <button
        onClick={handleScreenshot}
        disabled={busy}
        style={{
          width: '100%',
          padding: '8px 0',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 500,
          color: busy ? 'var(--text-muted)' : 'var(--text-secondary)',
          cursor: busy ? 'default' : 'pointer',
          letterSpacing: '-0.01em',
          transition: 'background 0.15s, color 0.15s',
          outline: 'none',
        }}
        onMouseEnter={e => { if (!busy) (e.currentTarget.style.background = 'rgba(0,0,0,0.04)'); }}
        onMouseLeave={e => { (e.currentTarget.style.background = 'none'); }}
      >
        {busy ? 'Capturing…' : 'Capture screenshot →'}
      </button>

      {/* ── Footer ── */}
      <p style={{
        fontSize: '10px', color: 'var(--text-muted)',
        textAlign: 'center', letterSpacing: '-0.01em',
      }}>
        Press <kbd style={{
          fontSize: '9px', fontFamily: 'inherit',
          background: '#fff', border: '1px solid var(--border)',
          borderBottomWidth: '2px', borderRadius: '3px',
          padding: '0 4px', color: 'var(--text-secondary)',
        }}>?</kbd> for all shortcuts
      </p>

    </div>
  );
}
