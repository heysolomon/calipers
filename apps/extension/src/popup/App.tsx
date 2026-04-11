import React, { useCallback, useEffect, useState } from 'react';
import type { ExtensionState, Mode } from '@calipers/shared';
import { DEFAULT_STATE } from '@calipers/shared';

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

const IconInspect = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconMeasure = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M3 6v4M13 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconGuides = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconCamera = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M2 5.5A1.5 1.5 0 013.5 4h.382l.724-1.447A1 1 0 015.5 2h5a1 1 0 01.894.553L12.118 4H12.5A1.5 1.5 0 0114 5.5v7A1.5 1.5 0 0112.5 14h-9A1.5 1.5 0 012 12.5v-7z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="8" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// ─── Toggle switch component ──────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: 'relative',
        width: '32px',
        height: '18px',
        borderRadius: '9px',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        boxShadow: checked ? '0 0 12px var(--accent-glow)' : 'none',
        transition: 'background 0.3s var(--spring-settle), box-shadow 0.3s var(--spring-settle)',
        outline: 'none',
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '16px' : '2px',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'left 0.35s var(--spring-bounce)',
        }}
      />
    </button>
  );
}

// ─── Mode selector ────────────────────────────────────────────────────────────

const MODES: { id: Mode; label: string; Icon: React.FC }[] = [
  { id: 'inspect', label: 'Inspect', Icon: IconInspect },
  { id: 'measure', label: 'Measure', Icon: IconMeasure },
  { id: 'guides', label: 'Guides', Icon: IconGuides },
];

interface ModeTabProps {
  modes: typeof MODES;
  active: Mode;
  onSelect: (m: Mode) => void;
}

function ModeSelector({ modes, active, onSelect }: ModeTabProps) {
  const activeIndex = modes.findIndex((m) => m.id === active);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '3px',
        gap: '2px',
      }}
    >
      {/* Sliding pill */}
      <div
        style={{
          position: 'absolute',
          top: '3px',
          height: 'calc(100% - 6px)',
          width: `calc(${100 / modes.length}% - 4px)`,
          left: `calc(${(activeIndex * 100) / modes.length}% + 3px)`,
          background: 'rgba(74, 158, 255, 0.15)',
          border: '1px solid rgba(74, 158, 255, 0.25)',
          borderRadius: '5px',
          transition: 'left 0.35s var(--spring-bounce)',
          pointerEvents: 'none',
        }}
      />
      {modes.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '7px 4px',
            background: 'none',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            color: active === id ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: active === id ? 500 : 400,
            letterSpacing: '0.01em',
            transition: 'color 0.2s var(--spring-settle)',
            position: 'relative',
          }}
          aria-pressed={active === id}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────

interface SettingRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ label, checked, onChange, disabled }: SettingRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span
        style={{
          fontSize: '13px',
          color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        }}
      >
        {label}
      </span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [extState, setExtState] = useState<ExtensionState>({ ...DEFAULT_STATE });
  const [loading, setLoading] = useState(true);
  const [screenshotBusy, setScreenshotBusy] = useState(false);

  // Load current state from background
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res: ExtensionState) => {
      if (res) setExtState(res);
      setLoading(false);
    });
  }, []);

  const sendMsg = useCallback(
    async (msg: Record<string, unknown>) => {
      return new Promise<ExtensionState>((resolve) => {
        chrome.runtime.sendMessage(msg, (res: ExtensionState) => resolve(res));
      });
    },
    [],
  );

  const handleToggleActive = useCallback(async () => {
    const next = await sendMsg(
      extState.active
        ? { type: 'DEACTIVATE' }
        : { type: 'ACTIVATE', mode: extState.mode },
    );
    setExtState(next);
  }, [extState.active, extState.mode, sendMsg]);

  const handleModeChange = useCallback(
    async (mode: Mode) => {
      const msg = extState.active
        ? { type: 'SWITCH_MODE', mode }
        : { type: 'ACTIVATE', mode };
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
    setScreenshotBusy(true);
    await sendMsg({ type: 'CAPTURE_SCREENSHOT' });
    setTimeout(() => setScreenshotBusy(false), 1200);
  }, [sendMsg]);

  if (loading) {
    return (
      <div
        style={{
          width: '280px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '12px',
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      style={{
        width: '280px',
        padding: '12px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: extState.active ? '0 0 8px var(--accent-glow)' : 'none',
              transition: 'box-shadow 0.3s var(--spring-settle)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
            }}
          >
            Calipers
          </span>
        </div>
        <Toggle checked={extState.active} onChange={handleToggleActive} />
      </div>

      {/* Mode selector */}
      <ModeSelector modes={MODES} active={extState.mode} onSelect={handleModeChange} />

      {/* Settings */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '0 10px',
        }}
      >
        <SettingRow
          label="Show box model"
          checked={extState.showBoxModel}
          onChange={handleBoxModel}
          disabled={extState.mode !== 'inspect'}
        />
        <SettingRow
          label="Show guides"
          checked={extState.showGuides}
          onChange={handleGuides}
        />
        <div style={{ borderBottom: 'none' }}>
          <SettingRow
            label="Snap to elements"
            checked={extState.snapToElements}
            onChange={handleSnap}
          />
        </div>
      </div>

      {/* Screenshot button */}
      <button
        onClick={handleScreenshot}
        disabled={screenshotBusy}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          width: '100%',
          padding: '9px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          color: screenshotBusy ? 'var(--text-muted)' : 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: 450,
          cursor: screenshotBusy ? 'default' : 'pointer',
          transition:
            'transform 0.2s var(--spring-press), background 0.2s var(--spring-settle), border-color 0.2s, color 0.2s',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!screenshotBusy) {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = '';
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
        }}
      >
        <IconCamera />
        {screenshotBusy ? 'Capturing…' : 'Capture Screenshot'}
      </button>

      {/* Shortcuts reference */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
        }}
      >
        {(
          [
            ['1 / 2 / 3', 'Switch mode'],
            ['B', 'Toggle box model'],
            ['Click', 'Pin guide / inspect detail'],
            ['Del', 'Clear guides'],
            ['S', 'Screenshot'],
            ['?', 'Show all shortcuts'],
            ['Esc', 'Close Calipers'],
          ] as [string, string][]
        ).map(([key, label]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '3px 0',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.45)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderBottomWidth: '2px',
                borderRadius: '4px',
                padding: '1px 6px',
                letterSpacing: '0.02em',
                fontFamily: 'inherit',
              }}
            >
              {key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
