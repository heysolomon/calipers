'use client';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useDemo } from './demo-provider';

export function CustomCursor() {
  const { anyTool } = useDemo();
  const reduceMotion = useReducedMotion();
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [active, setActive] = useState(false);
  const [overUI, setOverUI] = useState(false);

  const enabled = anyTool && !reduceMotion;

  useEffect(() => {
    if (!enabled) {
      document.body.style.cursor = '';
      return;
    }

    function onMove(e: MouseEvent) {
      setPos({ x: e.clientX, y: e.clientY });
      const el = e.target as HTMLElement | null;
      const onDemoUI = !!el?.closest?.('[data-demo-ui="true"]');
      setOverUI(onDemoUI);
      document.body.style.cursor = onDemoUI ? '' : 'none';
      const isInteractive = !!el?.closest?.('a, button, [role="button"], input, select, textarea');
      setActive(isInteractive);
    }

    document.addEventListener('mousemove', onMove, { passive: true });
    document.body.style.cursor = 'none';

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.body.style.cursor = '';
      setPos({ x: -200, y: -200 });
    };
  }, [enabled]);

  if (!enabled || overUI) return null;

  return (
    <div
      data-demo-ui="true"
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="-9 -9 18 18"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <line x1="-9" y1="0" x2="-4" y2="0" stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4"  y1="0" x2="9"  y2="0" stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="0" y1="-9" x2="0" y2="-4" stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="0" y1="4"  x2="0" y2="9"  stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round" />
        <circle
          cx="0"
          cy="0"
          r="2.5"
          stroke="#FF4500"
          strokeWidth="1.5"
          fill={active ? '#FF4500' : 'none'}
          style={{ transition: 'fill 0.12s' }}
        />
      </svg>
    </div>
  );
}
