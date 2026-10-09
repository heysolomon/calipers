'use client';
import { useDemo, type DemoKey } from './demo-provider';
import { useReducedMotion } from 'framer-motion';

// The same modes as the extension. Colours and box values are part of Inspect.
const TOOLS: { key: DemoKey; label: string }[] = [
  { key: 'inspect', label: 'Inspect' },
  { key: 'measure', label: 'Measure' },
  { key: 'guides',  label: 'Guides'  },
  { key: 'annotate', label: 'Annotate' },
];

function ToggleSwitch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label} demo tool`}
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
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '2px',
          left: '2px',
          transform: `translateX(${on ? 12 : 0}px)`,
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
          transition: 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </button>
  );
}

export function DemoToolbar() {
  const demo = useDemo();
  const reduceMotion = useReducedMotion();

  return (
    <div
      data-demo-ui="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: '44px',
        background: 'var(--frame)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        userSelect: 'none',
        transform: demo.isOpen ? 'translateY(0)' : 'translateY(-100%)',
        // Truly hidden while closed (after it has slid away): it cannot peek in when a phone
        // overscrolls, and its switches are out of the tab order and unseen by screen readers.
        visibility: demo.isOpen ? 'visible' : 'hidden',
        transition: reduceMotion ? 'none' : `transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s linear ${demo.isOpen ? '0s' : '0.35s'}`,
        // The four switches are wider than a small phone; let the bar scroll sideways there.
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      <img
        src="/raval-logo.svg"
        alt=""
        width={16}
        height={16}
        aria-hidden="true"
        style={{ filter: 'brightness(0) invert(1)' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {TOOLS.map(({ key, label }) => {
          const on = demo[key];
          return (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <ToggleSwitch on={on} onToggle={() => demo.toggle(key)} label={label} />
              <span
                style={{
                  fontSize: '11.5px',
                  color: on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.38)',
                  letterSpacing: '0.01em',
                  transition: 'color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
