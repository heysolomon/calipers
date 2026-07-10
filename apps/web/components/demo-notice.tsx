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
        padding: '8px 14px',
        background: 'rgba(12, 12, 14, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.75)',
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
