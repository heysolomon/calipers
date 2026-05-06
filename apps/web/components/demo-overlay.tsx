'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
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

// ─── Shared styles ────────────────────────────────────────────────────────────

// Dark glassmorphic pill — matches extension label system
const PILL: CSSProperties = {
  background: 'rgba(20,20,28,0.88)',
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.9)',
  fontSize: '11px',
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontWeight: 500,
  letterSpacing: '0.025em',
  padding: '3px 10px',
  borderRadius: '100px',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
  pointerEvents: 'none',
  zIndex: 8901,
  position: 'fixed',
};

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
      setLabel(`${Math.round(r.width)} × ${Math.round(r.height)} px`);
      setLpos({ x: r.left, y: r.top > 60 ? r.top - 30 : r.bottom + 8 });
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  if (!rect) return null;
  return (
    <>
      {/* Outline highlight — very light fill */}
      <div data-demo-ui="true" style={{
        position: 'fixed', left: rect.left, top: rect.top,
        width: rect.width, height: rect.height,
        border: '1px solid rgba(255,69,0,0.75)',
        background: 'rgba(255,69,0,0.04)',
        pointerEvents: 'none', zIndex: 8900, boxSizing: 'border-box',
      }} />
      {/* Dimension pill — accent color */}
      <div data-demo-ui="true" style={{
        ...PILL,
        left: lpos.x, top: lpos.y,
        background: '#FF4500',
        border: 'none',
        color: '#fff',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        boxShadow: '0 2px 10px rgba(255,69,0,0.35)',
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
        margin:  { l: n(css.marginLeft),      t: n(css.marginTop),      r: n(css.marginRight),      b: n(css.marginBottom) },
        border:  { l: n(css.borderLeftWidth), t: n(css.borderTopWidth), r: n(css.borderRightWidth), b: n(css.borderBottomWidth) },
        padding: { l: n(css.paddingLeft),     t: n(css.paddingTop),     r: n(css.paddingRight),     b: n(css.paddingBottom) },
        borderRect: r,
      });
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  if (!rect || !box) return null;

  const br = box.borderRect;
  const { margin: m, border: b, padding: p } = box;

  const marginR  = { l: br.left - m.l,         t: br.top - m.t,         w: br.width + m.l + m.r,                  h: br.height + m.t + m.b };
  const borderR  = { l: br.left,                t: br.top,               w: br.width,                               h: br.height };
  const paddingR = { l: br.left + b.l,          t: br.top + b.t,         w: br.width - b.l - b.r,                  h: br.height - b.t - b.b };
  const contentR = { l: br.left + b.l + p.l,    t: br.top + b.t + p.t,  w: br.width - b.l - b.r - p.l - p.r,     h: br.height - b.t - b.b - p.t - p.b };

  const layers = [
    { r: marginR,  bg: 'rgba(255,130,80,0.1)',  stroke: 'rgba(255,130,80,0.45)',  label: 'margin'  },
    { r: borderR,  bg: 'rgba(255,200,80,0.1)',  stroke: 'rgba(255,200,80,0.45)',  label: 'border'  },
    { r: paddingR, bg: 'rgba(80,200,140,0.1)',  stroke: 'rgba(80,200,140,0.45)', label: 'padding' },
    { r: contentR, bg: 'rgba(100,160,255,0.1)', stroke: 'rgba(100,160,255,0.45)', label: 'content' },
  ];

  const labelRows = [
    { name: 'margin',  vals: m, color: 'rgba(255,130,80,0.9)' },
    { name: 'border',  vals: b, color: 'rgba(255,200,80,0.9)' },
    { name: 'padding', vals: p, color: 'rgba(80,200,140,0.9)' },
  ];

  const panelX = br.right + 8 > window.innerWidth - 170 ? br.left - 165 : br.right + 8;
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
      {/* Info panel */}
      <div data-demo-ui="true" style={{
        position: 'fixed', left: panelX, top: panelY,
        background: 'rgba(12,12,14,0.95)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px',
        padding: '10px 12px', pointerEvents: 'none', zIndex: 8901,
        fontSize: '10px', fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        minWidth: '155px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '8px', fontSize: '11px', fontWeight: 500 }}>
          {Math.round(contentR.w)} × {Math.round(contentR.h)} px
        </div>
        {labelRows.map(({ name, vals, color }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '2px', background: color, flexShrink: 0 }} />
            <span style={{ minWidth: '46px', color: 'rgba(255,255,255,0.3)' }}>{name}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>
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
  if (b.left >= a.right)       hGap = b.left - a.right;
  else if (a.left >= b.right)  hGap = a.left - b.right;
  if (b.top >= a.bottom)       vGap = b.top - a.bottom;
  else if (a.top >= b.bottom)  vGap = a.top - b.bottom;

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

function ElementOutline({ rect, locked = false }: { rect: DOMRect; locked?: boolean }) {
  return (
    <div data-demo-ui="true" style={{
      position: 'fixed',
      left: rect.left, top: rect.top,
      width: rect.width, height: rect.height,
      border: `${locked ? 1.5 : 1}px solid rgba(255,69,0,${locked ? 0.9 : 0.5})`,
      background: `rgba(255,69,0,${locked ? 0.05 : 0.02})`,
      pointerEvents: 'none', zIndex: 8900, boxSizing: 'border-box',
    }} />
  );
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
        if (prev.step === 'idle' || prev.step === 'done') return { step: 'first', rect };
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

  return (
    <>
      {/* Hover highlight */}
      {hover && phase.step !== 'done' && <ElementOutline rect={hover} />}

      {/* First element pinned */}
      {phase.step === 'first' && (
        <>
          <ElementOutline rect={phase.rect} locked />
          <div data-demo-ui="true" style={{
            ...PILL,
            left: phase.rect.left,
            top: Math.max(40, phase.rect.top - 30),
            background: '#FF4500',
            border: 'none',
            color: '#fff',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            boxShadow: '0 2px 10px rgba(255,69,0,0.35)',
          }}>
            Click a second element →
          </div>
        </>
      )}

      {/* Measurement result */}
      {phase.step === 'done' && (() => {
        const { from, to, gap, line } = phase;
        const mx = (line.x1 + line.x2) / 2;
        const my = (line.y1 + line.y2) / 2;
        const CAP = 6;
        return (
          <>
            <ElementOutline rect={from} locked />
            <ElementOutline rect={to}   locked />

            {/* Measurement line + end caps */}
            <svg data-demo-ui="true" style={{
              position: 'fixed', inset: 0, width: '100vw', height: '100vh',
              pointerEvents: 'none', zIndex: 8950, overflow: 'visible',
            }}>
              <line
                x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                stroke="rgba(255,69,0,0.85)" strokeWidth="1.5"
              />
              {phase.axis === 'h' ? (
                <>
                  <line x1={line.x1} y1={line.y1 - CAP} x2={line.x1} y2={line.y1 + CAP} stroke="rgba(255,69,0,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1={line.x2} y1={line.y2 - CAP} x2={line.x2} y2={line.y2 + CAP} stroke="rgba(255,69,0,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <line x1={line.x1 - CAP} y1={line.y1} x2={line.x1 + CAP} y2={line.y1} stroke="rgba(255,69,0,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1={line.x2 - CAP} y1={line.y2} x2={line.x2 + CAP} y2={line.y2} stroke="rgba(255,69,0,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>

            {/* Distance pill on the line */}
            <div data-demo-ui="true" style={{
              ...PILL,
              left: mx, top: my,
              transform: 'translate(-50%, -50%)',
            }}>
              {Math.round(gap)} px
            </div>

            {/* Hint */}
            <div data-demo-ui="true" style={{
              position: 'fixed',
              left: Math.min(from.left, to.left),
              top: Math.min(from.top, to.top) - 30,
              fontSize: '10px', color: 'rgba(0,0,0,0.3)',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              pointerEvents: 'none', zIndex: 8951,
              letterSpacing: '0.02em',
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

  const lineBase: CSSProperties = { position: 'fixed', pointerEvents: 'none', zIndex: 8800 };

  return (
    <>
      {/* Live crosshair */}
      <div data-demo-ui="true" style={{ ...lineBase, left: mouse.x, top: 44, width: 1, bottom: 0, background: 'rgba(255,69,0,0.4)', transform: 'translateX(-0.5px)' }} />
      <div data-demo-ui="true" style={{ ...lineBase, left: 0, top: mouse.y, right: 0, height: 1, background: 'rgba(255,69,0,0.4)', transform: 'translateY(-0.5px)' }} />

      {/* Pinned guides */}
      {guides.map(g => (
        <div key={g.id} data-demo-ui="true">
          <div style={{ ...lineBase, left: g.x, top: 44, width: 1, bottom: 0, background: '#FF4500', opacity: 0.5, transform: 'translateX(-0.5px)' }} />
          <div style={{ ...lineBase, left: 0, top: g.y, right: 0, height: 1, background: '#FF4500', opacity: 0.5, transform: 'translateY(-0.5px)' }} />
          {/* Coordinate pill */}
          <div style={{
            ...PILL,
            left: g.x + 8, top: g.y - 22,
            fontSize: '10px',
            padding: '2px 8px',
          }}>
            {Math.round(g.x)}, {Math.round(g.y)}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── 5. Colour picker mode ────────────────────────────────────────────────────

interface ColorSample { label: string; hex: string; raw: string }

function parseRgba(css: string): [number, number, number, number] | null {
  const m = css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,/\s]+([\d.]+))?\s*\)/);
  if (!m) return null;
  const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  return [r, g, b, a > 1 ? a / 100 : a];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
}

function extractColors(el: Element): ColorSample[] {
  const css = window.getComputedStyle(el);
  const candidates: [string, string][] = [
    ['Background', css.backgroundColor],
    ['Text',       css.color],
    ['Border',     css.borderTopColor],
  ];
  const out: ColorSample[] = [];
  const seen = new Set<string>();
  for (const [label, raw] of candidates) {
    if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') continue;
    const p = parseRgba(raw);
    if (!p) continue;
    const [r, g, b, a] = p;
    if (a < 0.05) continue;
    const hex = toHex(r, g, b);
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push({ label, hex, raw });
  }
  return out;
}

function ColorPickerOverlay() {
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const [colors, setColors]     = useState<ColorSample[]>([]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (isOurUI(e.target as Element)) return;
      const el         = getTarget(e.clientX, e.clientY);
      const newColors  = el ? extractColors(el) : [];
      setColors(newColors);
      const panelW = 200;
      const panelH = 44 + newColors.length * 34;
      // Place below cursor, clearing the crosshair + coordinate text (~48px)
      let y = e.clientY + 52;
      if (y + panelH > window.innerHeight) y = e.clientY - panelH - 14;
      let x = e.clientX + 12;
      if (x + panelW > window.innerWidth)  x = e.clientX - panelW - 12;
      setPanelPos({ x, y });
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div data-demo-ui="true" style={{
      position: 'fixed', left: panelPos.x, top: panelPos.y,
      background: 'rgba(12,12,14,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px', padding: '10px',
      minWidth: '190px', pointerEvents: 'none', zIndex: 9001,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    }}>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
        Colours
      </div>
      {colors.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', textAlign: 'center', padding: '4px 0' }}>
          No colours
        </div>
      ) : colors.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
          <span style={{
            width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
            background: c.raw, border: '1px solid rgba(255,255,255,0.12)', display: 'block',
          }} />
          <div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{c.label}</div>
            <div style={{ color: 'rgba(255,255,255,0.87)', fontSize: '11px' }}>{c.hex}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 6. Spacing mode ──────────────────────────────────────────────────────────

interface SpacingGap { x1: number; y1: number; x2: number; y2: number; gap: number; lx: number; ly: number }

function computeGaps(children: Element[]): SpacingGap[] {
  if (children.length < 2) return [];
  const rects  = children.map(c => c.getBoundingClientRect());
  const isRow  = Math.abs(rects[1]!.left - rects[0]!.right) < Math.abs(rects[1]!.top - rects[0]!.bottom);
  const result: SpacingGap[] = [];
  for (let i = 0; i < rects.length - 1; i++) {
    const a = rects[i]!; const b = rects[i + 1]!;
    if (isRow) {
      const gap = b.left - a.right; if (gap <= 0) continue;
      const my  = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2 || (a.top + a.bottom) / 2;
      result.push({ x1: a.right, y1: my, x2: b.left, y2: my, gap: Math.round(gap), lx: (a.right + b.left) / 2, ly: my - 16 });
    } else {
      const gap = b.top - a.bottom; if (gap <= 0) continue;
      const mx  = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2 || (a.left + a.right) / 2;
      result.push({ x1: mx, y1: a.bottom, x2: mx, y2: b.top, gap: Math.round(gap), lx: mx + 8, ly: (a.bottom + b.top) / 2 - 8 });
    }
  }
  return result;
}

function SpacingOverlay() {
  const [data, setData] = useState<{
    childRects:  DOMRect[];
    gaps:        SpacingGap[];
    parentRect:  DOMRect | null;
    hoveredRect: DOMRect | null;
  }>({ childRects: [], gaps: [], parentRect: null, hoveredRect: null });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = getTarget(e.clientX, e.clientY);
      if (!el) { setData({ childRects: [], gaps: [], parentRect: null, hoveredRect: null }); return; }

      const parent = el.parentElement;
      if (!parent || parent === document.body || parent === document.documentElement) {
        setData({ childRects: [], gaps: [], parentRect: null, hoveredRect: el.getBoundingClientRect() });
        return;
      }

      const children    = Array.from(parent.children).filter(c => {
        if (isOurUI(c)) return false;
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const childRects  = children.map(c => c.getBoundingClientRect());
      const gaps        = computeGaps(children);
      setData({ childRects, gaps, parentRect: parent.getBoundingClientRect(), hoveredRect: el.getBoundingClientRect() });
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const { childRects, gaps, parentRect, hoveredRect } = data;
  const CAP = 4;

  return (
    <>
      {parentRect && (
        <div data-demo-ui="true" style={{
          position: 'fixed', left: parentRect.left, top: parentRect.top,
          width: parentRect.width, height: parentRect.height,
          border: '1px dashed rgba(255,69,0,0.3)',
          pointerEvents: 'none', zIndex: 8800, boxSizing: 'border-box',
        }} />
      )}
      {childRects.map((r, i) => (
        <div key={i} data-demo-ui="true" style={{
          position: 'fixed', left: r.left, top: r.top, width: r.width, height: r.height,
          border: '1px solid rgba(255,69,0,0.3)', background: 'rgba(255,69,0,0.04)',
          pointerEvents: 'none', zIndex: 8801, boxSizing: 'border-box',
        }} />
      ))}
      {hoveredRect && (
        <div data-demo-ui="true" style={{
          position: 'fixed', left: hoveredRect.left, top: hoveredRect.top,
          width: hoveredRect.width, height: hoveredRect.height,
          border: '1.5px solid rgba(255,69,0,0.8)', background: 'rgba(255,69,0,0.08)',
          pointerEvents: 'none', zIndex: 8802, boxSizing: 'border-box',
        }} />
      )}
      {gaps.length > 0 && (
        <svg data-demo-ui="true" style={{
          position: 'fixed', inset: 0, width: '100vw', height: '100vh',
          pointerEvents: 'none', zIndex: 8900, overflow: 'visible',
        }}>
          {gaps.map((g, i) => {
            const isH = g.y1 === g.y2;
            return (
              <g key={i}>
                <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="rgba(255,69,0,0.85)" strokeWidth="1.5" />
                {isH ? (
                  <>
                    <line x1={g.x1} y1={g.y1 - CAP} x2={g.x1} y2={g.y1 + CAP} stroke="rgba(255,69,0,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1={g.x2} y1={g.y2 - CAP} x2={g.x2} y2={g.y2 + CAP} stroke="rgba(255,69,0,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <line x1={g.x1 - CAP} y1={g.y1} x2={g.x1 + CAP} y2={g.y1} stroke="rgba(255,69,0,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1={g.x2 - CAP} y1={g.y2} x2={g.x2 + CAP} y2={g.y2} stroke="rgba(255,69,0,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {gaps.map((g, i) => (
        <div key={i} data-demo-ui="true" style={{
          ...PILL, left: g.lx, top: g.ly,
          transform: 'translate(-50%, -50%)',
          fontSize: '10px', padding: '2px 6px',
        }}>
          {g.gap} px
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
      {demo.inspect     && <InspectOverlay />}
      {demo.boxmodel    && <BoxModelOverlay />}
      {demo.measure     && <MeasureOverlay />}
      {demo.guides      && <GuidesOverlay />}
      {demo.colorpicker && <ColorPickerOverlay />}
      {demo.spacing     && <SpacingOverlay />}
    </>
  );
}
