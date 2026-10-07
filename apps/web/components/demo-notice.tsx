'use client';
import { useDemo } from './demo-provider';

/** Visible notice when demo tools capture page interaction. */
export function DemoNotice() {
  const { anyTool } = useDemo();
  if (!anyTool) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-demo-ui="true"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        padding: '7px 11px',
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.04)',
        fontSize: '12px',
        fontWeight: 500,
        color: '#000',
        letterSpacing: '-0.01em',
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 32px)',
        textAlign: 'center',
      }}
    >
      Demo mode active — page clicks may be captured by the selected tool. Press Close in the toolbar to exit.
    </div>
  );
}
