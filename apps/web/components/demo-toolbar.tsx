'use client';
import { useDemo, type DemoKey } from './demo-provider';

const TOOLS: { key: DemoKey; label: string }[] = [
  { key: 'inspect',  label: 'Inspect'   },
  { key: 'boxmodel', label: 'Box Model' },
  { key: 'measure',  label: 'Measure'   },
  { key: 'guides',   label: 'Guides'    },
];

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        position: 'relative',
        width: '28px',
        height: '16px',
        borderRadius: '8px',
        border: 'none',
        background: on ? '#FF4500' : 'rgba(255,255,255,0.12)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s ease',
        padding: 0,
        outline: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: on ? '14px' : '2px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
          transition: 'left 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
    </button>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

export function DemoToolbar() {
  const demo = useDemo();

  return (
    <div
      data-demo-ui="true"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 9999,
        height: '44px',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        userSelect: 'none',
        // Slide in from above
        transform: demo.isOpen ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.42s cubic-bezier(0.34, 1.4, 0.64, 1)',
        willChange: 'transform',
      }}
    >
      {/* Left — brand */}
      <span style={{
        fontSize: '11px', fontWeight: 500, letterSpacing: '0.07em',
        color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
      }}>
        Calipers
      </span>

      {/* Centre — tool toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {TOOLS.map(({ key, label }) => {
          const on = demo[key];
          return (
            <label
              key={key}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer',
              }}
            >
              <ToggleSwitch on={on} onToggle={() => demo.toggle(key)} />
              <span style={{
                fontSize: '11.5px',
                color: on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.38)',
                letterSpacing: '0.01em',
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </label>
          );
        })}
      </div>

      {/* Right — close */}
      <button
        onClick={demo.close}
        title="Close demo tools"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '22px', height: '22px',
          background: 'transparent',
          border: 'none',
          borderRadius: '5px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '13px', lineHeight: 1,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
          padding: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
        }}
      >
        ×
      </button>
    </div>
  );
}
