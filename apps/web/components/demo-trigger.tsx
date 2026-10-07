'use client';
import { useDemo } from './demo-provider';

/** Two sliders that cross into a close mark while the demo is open (see `.lp-sliders` in globals.css). */
const SLIDERS = (
  <svg className="lp-sliders" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="17" x2="20" y2="17" />
    <circle cx="9" cy="7" r="2.5" fill="#F7F7F7" />
    <circle cx="15" cy="17" r="2.5" fill="#F7F7F7" />
  </svg>
);

/**
 * Opens the on-page demo. `button` is the bordered button used on inner pages,
 * `icon` is the control in the homepage header, and `link` sits inside a sentence.
 */
export function DemoTrigger({ variant = 'button' }: { variant?: 'button' | 'icon' | 'link' }) {
  const demo = useDemo();
  const label = demo.isOpen ? 'Close demo tools' : 'Open demo tools';
  const toggle = demo.isOpen ? demo.close : demo.open;

  if (variant === 'icon') {
    return (
      <button
        type="button" onClick={toggle} data-demo-ui="true" aria-label={label} aria-pressed={demo.isOpen}
        className="lp-icon-button lp-tip" data-open={demo.isOpen} data-tip={demo.isOpen ? 'Close the demo' : 'Try the demo'}
      >
        {SLIDERS}
      </button>
    );
  }

  if (variant === 'link') {
    return (
      <button type="button" onClick={toggle} data-demo-ui="true" aria-pressed={demo.isOpen} className="lp-link lp-link-button">
        {demo.isOpen ? 'close the demo' : 'try the demo'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-demo-ui="true"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: 500,
        background: 'transparent',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
        padding: '6px 14px',
        color: '#737373',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
        e.currentTarget.style.color = '#000';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#737373';
      }}
    >
      {demo.isOpen ? (
        <>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
          Close
        </>
      ) : (
        <>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="9" cy="6" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="9" cy="18" r="2.5" fill="currentColor" stroke="none" />
          </svg>
          Try demo
        </>
      )}
    </button>
  );
}
