'use client';
import { useEffect, useRef, useState } from 'react';
import { useDemo } from './demo-provider';

export function CustomCursor() {
  const { anyTool } = useDemo();
  const [pos, setPos]       = useState({ x: -200, y: -200 });
  const [active, setActive] = useState(false);
  const [overUI, setOverUI] = useState(false);
  const raf = useRef<number>(null);
  const raw = useRef({ x: -200, y: -200 });

  useEffect(() => {
    if (!anyTool) return;

    function onMove(e: MouseEvent) {
      raw.current = { x: e.clientX, y: e.clientY };
      const el = e.target as HTMLElement | null;
      const onDemoUI = !!el?.closest?.('[data-demo-ui="true"]');
      setOverUI(onDemoUI);
      document.body.style.cursor = onDemoUI ? '' : 'none';
      const isInteractive = !!(el as HTMLElement | null)?.closest?.('a, button, [role="button"], input, select, textarea');
      setActive(isInteractive);
    }

    function tick() {
      setPos({ x: raw.current.x, y: raw.current.y });
      raf.current = requestAnimationFrame(tick);
    }

    document.addEventListener('mousemove', onMove, { passive: true });
    raf.current = requestAnimationFrame(tick);
    document.body.style.cursor = 'none';

    return () => {
      document.removeEventListener('mousemove', onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
      document.body.style.cursor = '';
      setPos({ x: -200, y: -200 });
    };
  }, [anyTool]);

  if (!anyTool || overUI) return null;

  const px = String(Math.max(0, Math.round(pos.x))).padStart(4, '0');
  const py = String(Math.max(0, Math.round(pos.y))).padStart(4, '0');

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
        willChange: 'transform',
      }}
    >
      {/* Crosshair */}
      <svg
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
          cx="0" cy="0" r="2.5"
          stroke="#FF4500"
          strokeWidth="1.5"
          fill={active ? '#FF4500' : 'none'}
          style={{ transition: 'fill 0.12s' }}
        />
      </svg>

      {/* Coordinates */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
          fontSize: '9px',
          lineHeight: 1.4,
          letterSpacing: '0.06em',
          color: '#FF4500',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        <div>X:{px}</div>
        <div>Y:{py}</div>
      </div>
    </div>
  );
}
