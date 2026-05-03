'use client';
import { useEffect, useRef, useState } from 'react';
import { useDemo } from './demo-provider';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function isOurUI(el: Element | null): boolean {
  let node: Element | null = el;
  while (node) {
    if (node.getAttribute('data-demo-ui') === 'true') return true;
    node = node.parentElement;
  }
  return false;
}

function getTarget(x: number, y: number): Element | null {
  const el = document.elementFromPoint(x, y);
  if (!el || isOurUI(el) || el === document.body || el === document.documentElement) return null;
  return el;
}

// ─── 1. Inspect mode ──────────────────────────────────────────────────────────

function InspectOverlay() {
  const [rect, setRect]   = useState<DOMRect | null>(null);
  const [lpos, setLpos]   = useState({ x: 0, y: 0 });
  const [label, setLabel] = useState('');

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = getTarget(e.clientX, e.clientY);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect(r);
      setLabel(`${Math.round(r.width)} × ${Math.round(r.height)}`);
      setLpos({ x: r.left, y: r.top > 60 ? r.top - 26 : r.bottom + 6 });
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  if (!rect) return null;
  return (
    <>
      {/* Highlight */}
      <div data-demo-ui="true" style={{
        position: 'fixed', left: rect.left, top: rect.top,
        width: rect.width, height: rect.height,
        border: '1.5px solid #FF4500', background: 'rgba(255,69,0,0.07)',
        pointerEvents: 'none', zIndex: 8900, boxSizing: 'border-box',
      }} />
      {/* Edge lines */}
      {[
        { left: rect.left, top: rect.top,          width: rect.width,  height: 1 },
        { left: rect.left, top: rect.bottom - 1,   width: rect.width,  height: 1 },
        { left: rect.left, top: rect.top,          width: 1,           height: rect.height },
        { left: rect.right - 1, top: rect.top,     width: 1,           height: rect.height },
      ].map((s, i) => (
        <div key={i} data-demo-ui="true" style={{ position: 'fixed', background: 'rgba(255,69,0,0.35)', pointerEvents: 'none', zIndex: 8899, ...s }} />
      ))}
      {/* Label */}
      <div data-demo-ui="true" style={{
        position: 'fixed', left: lpos.x, top: lpos.y,
        background: '#FF4500', color: '#fff', fontSize: '10px',
        fontFamily: '"JetBrains Mono", monospace', fontWeight: 500,
        padding: '2px 6px', borderRadius: '3px',
        pointerEvents: 'none', zIndex: 8901, whiteSpace: 'nowrap', letterSpacing: '0.04em',
      }}>
        {label}
      </div>
    </>
  );
}

// ─── 2. Box model mode ────────────────────────────────────────────────────────

interface BoxData {
  margin:  { l: number; t: number; r: number; b: number };
  border:  { l: number; t: number; r: number; b: number };
  padding: { l: number; t: number; r: number; b: number };
  borderRect: DOMRect;
}

function BoxModelOverlay() {
  const [rect, setRect]  = useState<DOMRect | null>(null);
  const [box, setBox]    = useState<BoxData | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = getTarget(e.clientX, e.clientY);
      if (!el) { setRect(null); setBox(null); return; }

      const r   = el.getBoundingClientRect();
      const css = window.getComputedStyle(el);
      const n   = (v: string) => parseFloat(v) || 0;

      setRect(r);
      setBox({
        margin:  { l: n(css.marginLeft),        t: n(css.marginTop),        r: n(css.marginRight),        b: n(css.marginBottom) },
        border:  { l: n(css.borderLeftWidth),   t: n(css.borderTopWidth),   r: n(css.borderRightWidth),   b: n(css.borderBottomWidth) },
        padding: { l: n(css.paddingLeft),       t: n(css.paddingTop),       r: n(css.paddingRight),       b: n(css.paddingBottom) },
        borderRect: r,
      });
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  if (!rect || !box) return null;

  const br = box.borderRect;
  const { margin: m, border: b, padding: p } = box;

  // Each layer rect (viewport-relative)
  const marginR  = { l: br.left - m.l,           t: br.top - m.t,           w: br.width  + m.l + m.r,       h: br.height + m.t + m.b };
  const borderR  = { l: br.left,                  t: br.top,                  w: br.width,                     h: br.height };
  const paddingR = { l: br.left + b.l,             t: br.top + b.t,            w: br.width  - b.l - b.r,        h: br.height - b.t - b.b };
  const contentR = { l: br.left + b.l + p.l,       t: br.top + b.t + p.t,     w: br.width  - b.l - b.r - p.l - p.r, h: br.height - b.t - b.b - p.t - p.b };

  const layers: { r: typeof marginR; bg: string; stroke: string; label: string }[] = [
    { r: marginR,  bg: 'rgba(255,130,80,0.12)',  stroke: 'rgba(255,130,80,0.5)',  label: 'margin'  },
    { r: borderR,  bg: 'rgba(255,200,80,0.12)',  stroke: 'rgba(255,200,80,0.5)',  label: 'border'  },
    { r: paddingR, bg: 'rgba(80,200,140,0.12)',  stroke: 'rgba(80,200,140,0.5)', label: 'padding' },
    { r: contentR, bg: 'rgba(255,69,0,0.15)',  stroke: 'rgba(255,69,0,0.5)', label: 'content' },
  ];

  // Labels for each value (top / right / bottom / left)
  const labelRows = [
    { name: 'margin',  vals: m, color: 'rgba(255,130,80,1)' },
    { name: 'border',  vals: b, color: 'rgba(255,200,80,1)' },
    { name: 'padding', vals: p, color: 'rgba(80,200,140,1)' },
  ];

  const panelX = br.right + 8 > window.innerWidth - 160 ? br.left - 160 : br.right + 8;
  const panelY = Math.max(40, Math.min(br.top, window.innerHeight - 130));

  return (
    <>
      {layers.map(({ r, bg, stroke, label }) => (
        <div key={label} data-demo-ui="true" style={{
          position: 'fixed', left: r.l, top: r.t, width: Math.max(0, r.w), height: Math.max(0, r.h),
          background: bg, border: `1px solid ${stroke}`,
          pointerEvents: 'none', zIndex: 8850, boxSizing: 'border-box',
        }} />
      ))}

      {/* Mini info panel */}
      <div data-demo-ui="true" style={{
        position: 'fixed', left: panelX, top: panelY,
        background: 'rgba(17,17,17,0.95)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
        padding: '8px 10px', pointerEvents: 'none', zIndex: 8901,
        fontSize: '10px', fontFamily: '"JetBrains Mono", monospace',
        color: 'rgba(255,255,255,0.5)', minWidth: '148px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>
        {/* Content size */}
        <div style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '6px', fontSize: '11px' }}>
          {Math.round(contentR.w)} × {Math.round(contentR.h)}
        </div>
        {labelRows.map(({ name, vals, color }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '2px', background: color, flexShrink: 0 }} />
            <span style={{ minWidth: '48px', color: 'rgba(255,255,255,0.35)' }}>{name}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.02em' }}>
              {vals.t} {vals.r} {vals.b} {vals.l}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── 3. Measure mode ──────────────────────────────────────────────────────────

type MeasurePhase =
  | { step: 'idle' }
  | { step: 'first'; rect: DOMRect }
  | { step: 'done'; from: DOMRect; to: DOMRect; gap: number; axis: 'h' | 'v'; line: { x1: number; y1: number; x2: number; y2: number } };

function calcGap(a: DOMRect, b: DOMRect) {
  let hGap = 0, vGap = 0;
  if (b.left >= a.right)  hGap = b.left - a.right;
  else if (a.left >= b.right) hGap = a.left - b.right;
  if (b.top >= a.bottom)  vGap = b.top - a.bottom;
  else if (a.top >= b.bottom) vGap = a.top - b.bottom;

  if (hGap > 0 && (vGap === 0 || hGap <= vGap)) {
    const x1 = b.left >= a.right ? a.right : b.right;
    const x2 = b.left >= a.right ? b.left  : a.left;
    const oy = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2;
    const y  = isFinite(oy) ? oy : (a.top + a.bottom) / 2;
    return { gap: hGap, axis: 'h' as const, line: { x1, y1: y, x2, y2: y } };
  }
  const y1 = b.top >= a.bottom ? a.bottom : b.bottom;
  const y2 = b.top >= a.bottom ? b.top    : a.top;
  const ox = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2;
  const x  = isFinite(ox) ? ox : (a.left + a.right) / 2;
  return { gap: vGap, axis: 'v' as const, line: { x1: x, y1, x2: x, y2 } };
}

function MeasureOverlay() {
  const [phase, setPhase] = useState<MeasurePhase>({ step: 'idle' });
  const [hover, setHover] = useState<DOMRect | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = getTarget(e.clientX, e.clientY);
      setHover(el ? el.getBoundingClientRect() : null);
    }
    function onClick(e: MouseEvent) {
      if (isOurUI(e.target as Element)) return;
      const el = getTarget(e.clientX, e.clientY);
      if (!el) return;
      e.preventDefault(); e.stopPropagation();
      const rect = el.getBoundingClientRect();

      setPhase(prev => {
        if (prev.step === 'idle' || prev.step === 'done') {
          return { step: 'first', rect };
        }
        const { gap, axis, line } = calcGap(prev.rect, rect);
        return { step: 'done', from: prev.rect, to: rect, gap, axis, line };
      });
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick, true);
    };
  }, []);

  const highlightStyle = (r: DOMRect, strong = false): React.CSSProperties => ({
    position: 'fixed', left: r.left, top: r.top, width: r.width, height: r.height,
    border: `${strong ? 2 : 1.5}px solid #FF4500`,
    background: `rgba(255,69,0,${strong ? 0.12 : 0.05})`,
    pointerEvents: 'none', zIndex: 8900, boxSizing: 'border-box',
  });

  return (
    <>
      {/* Hover highlight (idle / first step) */}
      {hover && phase.step !== 'done' && (
        <div data-demo-ui="true" style={highlightStyle(hover, false)} />
      )}

      {/* First element pinned */}
      {phase.step === 'first' && (
        <>
          <div data-demo-ui="true" style={highlightStyle(phase.rect, true)} />
          <div data-demo-ui="true" style={{
            position: 'fixed', left: phase.rect.left, top: Math.max(40, phase.rect.top - 26),
            background: '#FF4500', color: '#fff', fontSize: '10px',
            fontFamily: '"JetBrains Mono", monospace', padding: '2px 8px',
            borderRadius: '3px', pointerEvents: 'none', zIndex: 8902,
            whiteSpace: 'nowrap', letterSpacing: '0.03em',
          }}>
            Now click a second element →
          </div>
        </>
      )}

      {/* Measurement result */}
      {phase.step === 'done' && (() => {
        const { from, to, gap, line } = phase;
        const mx = (line.x1 + line.x2) / 2;
        const my = (line.y1 + line.y2) / 2;
        return (
          <>
            <div data-demo-ui="true" style={highlightStyle(from, true)} />
            <div data-demo-ui="true" style={highlightStyle(to, true)} />
            {/* SVG measurement line */}
            <svg
              data-demo-ui="true"
              style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 8950, overflow: 'visible' }}
            >
              <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#FF4500" strokeWidth="1.5" strokeDasharray="4 3" />
              {/* end caps */}
              {phase.axis === 'h' ? (
                <>
                  <line x1={line.x1} y1={line.y1 - 6} x2={line.x1} y2={line.y1 + 6} stroke="#FF4500" strokeWidth="1.5" />
                  <line x1={line.x2} y1={line.y2 - 6} x2={line.x2} y2={line.y2 + 6} stroke="#FF4500" strokeWidth="1.5" />
                </>
              ) : (
                <>
                  <line x1={line.x1 - 6} y1={line.y1} x2={line.x1 + 6} y2={line.y1} stroke="#FF4500" strokeWidth="1.5" />
                  <line x1={line.x2 - 6} y1={line.y2} x2={line.x2 + 6} y2={line.y2} stroke="#FF4500" strokeWidth="1.5" />
                </>
              )}
            </svg>
            {/* Distance label */}
            <div data-demo-ui="true" style={{
              position: 'fixed', left: mx, top: my,
              transform: 'translate(-50%, -50%)',
              background: '#FF4500', color: '#fff',
              fontSize: '10px', fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600, padding: '2px 7px', borderRadius: '3px',
              pointerEvents: 'none', zIndex: 8951, whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
            }}>
              {Math.round(gap)}px
            </div>
            <div data-demo-ui="true" style={{
              position: 'fixed', left: Math.min(from.left, to.left),
              top: Math.min(from.top, to.top) - 26,
              fontSize: '10px', color: '#737373', fontFamily: '"JetBrains Mono", monospace',
              pointerEvents: 'none', zIndex: 8951,
            }}>
              Click any element to measure again
            </div>
          </>
        );
      })()}
    </>
  );
}

// ─── 4. Guides mode ───────────────────────────────────────────────────────────

interface Guide { id: number; x: number; y: number }

function GuidesOverlay() {
  const [mouse, setMouse]   = useState({ x: 0, y: 0 });
  const [guides, setGuides] = useState<Guide[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isOurUI(e.target as Element)) setMouse({ x: e.clientX, y: e.clientY });
    };
    const onClick = (e: MouseEvent) => {
      if (isOurUI(e.target as Element)) return;
      const id = nextId.current++;
      setGuides(p => [...p, { id, x: e.clientX, y: e.clientY }]);
    };
    const onContext = (e: MouseEvent) => {
      if (isOurUI(e.target as Element)) return;
      e.preventDefault();
      setGuides(prev => {
        if (!prev.length) return prev;
        let closestId = prev[0]!.id;
        let minD = Infinity;
        for (const g of prev) {
          const d = Math.min(Math.abs(g.x - e.clientX), Math.abs(g.y - e.clientY));
          if (d < minD) { minD = d; closestId = g.id; }
        }
        return prev.filter(g => g.id !== closestId);
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('click', onClick, true);
    window.addEventListener('contextmenu', onContext, true);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('contextmenu', onContext, true);
    };
  }, []);

  const lineBase: React.CSSProperties = { position: 'fixed', pointerEvents: 'none', zIndex: 8800 };

  return (
    <>
      {/* Live crosshair */}
      <div data-demo-ui="true" style={{ ...lineBase, left: mouse.x, top: 36, width: 1, bottom: 0, background: 'rgba(255,69,0,0.45)', transform: 'translateX(-0.5px)' }} />
      <div data-demo-ui="true" style={{ ...lineBase, left: 0, top: mouse.y, right: 0, height: 1, background: 'rgba(255,69,0,0.45)', transform: 'translateY(-0.5px)' }} />

      {/* Pinned guides */}
      {guides.map(g => (
        <div key={g.id} data-demo-ui="true">
          <div style={{ ...lineBase, left: g.x, top: 36, width: 1, bottom: 0, background: '#FF4500', opacity: 0.55, transform: 'translateX(-0.5px)' }} />
          <div style={{ ...lineBase, left: 0, top: g.y, right: 0, height: 1, background: '#FF4500', opacity: 0.55, transform: 'translateY(-0.5px)' }} />
          <div style={{
            ...lineBase, left: g.x + 6, top: g.y - 20,
            background: '#FF4500', color: '#fff', fontSize: '9px',
            fontFamily: 'monospace', padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>
            {Math.round(g.x)}, {Math.round(g.y)}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function DemoOverlay() {
  const demo = useDemo();
  return (
    <>
      {demo.inspect  && <InspectOverlay />}
      {demo.boxmodel && <BoxModelOverlay />}
      {demo.measure  && <MeasureOverlay />}
      {demo.guides   && <GuidesOverlay />}
    </>
  );
}
