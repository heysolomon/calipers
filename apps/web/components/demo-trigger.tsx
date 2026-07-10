'use client';
import { useDemo } from './demo-provider';

export function DemoTrigger() {
  const demo = useDemo();

  return (
    <button
      type="button"
      onClick={demo.isOpen ? demo.close : demo.open}
      data-demo-ui="true"
      aria-label={demo.isOpen ? 'Close demo tools' : 'Open demo tools'}
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
