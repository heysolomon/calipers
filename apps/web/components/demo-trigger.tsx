'use client';
import { useDemo } from './demo-provider';

/**
 * Settings-style icon that toggles the demo toolbar.
 * When open → shows an X to close. When closed → shows a sliders icon.
 */
export function DemoTrigger() {
  const demo = useDemo();

  return (
    <button
      onClick={demo.isOpen ? demo.close : demo.open}
      data-demo-ui="true"
      title={demo.isOpen ? 'Close demo tools' : 'Open demo tools'}
      aria-label={demo.isOpen ? 'Close demo tools' : 'Open demo tools'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        background: 'transparent',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background 0.15s',
        padding: 0,
        outline: 'none',
        color: demo.isOpen ? 'rgba(255,255,255,0.5)' : '#737373',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = demo.isOpen
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(0,0,0,0.06)';
        e.currentTarget.style.color = demo.isOpen
          ? 'rgba(255,255,255,0.9)'
          : '#000';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = demo.isOpen
          ? 'rgba(255,255,255,0.5)'
          : '#737373';
      }}
    >
      {demo.isOpen ? (
        /* X icon */
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      ) : (
        /* Sliders / settings icon */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="9" cy="6" r="2.5" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="2.5" fill="currentColor" stroke="none" />
          <circle cx="9" cy="18" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      )}
    </button>
  );
}
